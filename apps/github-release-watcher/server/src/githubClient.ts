import { log, errFields } from "./lib/log";

// ============================================================================
// githubClient — outbound HTTP to GitHub's public REST API.
//
// Three call sites:
//   - validateRepo:  AddRepo's "does this repo exist publicly?" check.
//   - listReleases:  the polling cycle's per-repo fetch.
//   - getLatestRelease: the Test preview's per-row fetch.
//
// Authentication: none. Forks that need higher rate limits or private repos
// should add a credential setting and pass an `Authorization: token <pat>`
// header here — see the Variations note in DESIGN.md.
//
// SECURITY NOTE for forks adding auth: this client logs `errFields(err)` on
// transport failures. Node's fetch errors can carry header dictionaries
// (e.g., on certain TypeError shapes), and `errFields()` does NOT strip
// authorization headers. If you add an `Authorization: token <pat>` header,
// also add a redaction pass at the log site, or wrap fetch errors in a
// custom error class that omits headers from its serialization. Otherwise
// a transient network failure could log the PAT.
//
// Retry policy is HTTP-shaped, not SDK-shaped — we can't reuse the SDK
// `withRetry` helper because the error vocabulary is different (status
// codes vs ErrorCodeType). Retryable conditions:
//   - 429 (rate-limited)
//   - 5xx
//   - Network failure (fetch threw)
// Non-retryable:
//   - 200 (success — return)
//   - 404 (repo gone or never existed)
//   - 401/403 (auth — though we don't use auth, GitHub returns 403 for
//             rate-limited unauthenticated callers; we treat that as
//             retryable below)
//   - Other 4xx (caller error)
// ============================================================================

const GITHUB_API_BASE = "https://api.github.com";

// User-Agent is required by GitHub's API — requests without one are rejected
// with 403 even on public endpoints. Setting it here once means every call
// is correctly identified.
const USER_AGENT = "rootsdk-github-release-watcher (+https://github.com/Root-Communications)";

// Status codes that indicate a real "repo gone" or "never existed" outcome.
// Do not retry. Do not mistakenly classify as transient.
const STATUS_NOT_FOUND = 404;

// GitHub returns 403 (with a custom rate-limit body) for unauthenticated
// callers that exceed 60 req/hr. We treat 403 the same as 429 here — both
// mean "back off and try later." If a fork adds authentication and gets a
// real "forbidden" 403 (e.g., for accessing a private repo without scope),
// the message body would distinguish; this minimal client doesn't try.
const STATUS_RATE_LIMITED = new Set([403, 429]);

// Subset of GitHub's release JSON we care about. Defensive: any field we
// don't read is omitted, so a future GitHub schema change that adds fields
// is silently fine. Fields we DO read are validated to expected types in
// the parser below.
export interface GitHubRelease {
  id: number;
  tag_name: string;
  name: string | null;
  body: string | null;
  html_url: string;
  published_at: string | null;
  prerelease: boolean;
  draft: boolean;
}

export type GitHubClientErrorKind =
  | "invalid-url"
  | "repo-not-found"
  | "rate-limited"
  | "unreachable";

export class GitHubClientError extends Error {
  constructor(
    public readonly kind: GitHubClientErrorKind,
    message: string,
    public readonly status?: number,
  ) {
    super(message);
    this.name = "GitHubClientError";
  }
}

// --- URL parsing ------------------------------------------------------------

const URL_PATTERN = /^https?:\/\/github\.com\/([^/\s]+)\/([^/\s]+?)(?:\.git)?\/?$/i;

// Sanity bound on the input string. GitHub's own caps are owner ≤ 39 chars
// and name ≤ 100 chars, so a full `https://github.com/{owner}/{name}.git/`
// is well under 200 characters. 2048 is the standard browser URL ceiling
// and gives generous headroom while preventing pathological inputs (a 1MB
// string would otherwise still get encodeURIComponent'd inside validateRepo
// before fetch eventually rejects). Same defense-in-depth pattern as
// assertReasonableOwnerName in releaseWatcherService.ts but at the input
// boundary.
const MAX_URL_INPUT_LENGTH = 2048;

// Parses `https://github.com/owner/name` (with or without trailing slash, with
// optional `.git` suffix) into the API-facing pair. Throws GitHubClientError
// with kind="invalid-url" on anything else; the AddRepo handler maps that to
// ReleaseWatcherError.INVALID_URL. Reserved words (api, settings, etc.) are
// left alone — GitHub's own routes will 404 if the admin pasted a non-repo
// URL like `github.com/settings`, surfacing as REPO_NOT_FOUND from the
// validate call rather than this parser. That's the right shape: the parser
// only gates on "did this look like a repo URL"; "is this an actual repo" is
// for GitHub to answer.
//
// Owner and name are lowercased before return. GitHub itself treats repo
// references case-insensitively (Microsoft/VSCode and microsoft/vscode point
// at the same repo via redirect), but our (owner, name) PRIMARY KEY is byte-
// exact — without normalizing here, an admin who pastes the same repo twice
// in different cases gets two rows, two pollers, and double broadcasts.
// Lowercasing at parse time means every downstream consumer (DB, GitHub API
// path, dedupe checks) sees the same canonical form.
export function parseGithubUrl(input: string): { owner: string; name: string } {
  if (input.length > MAX_URL_INPUT_LENGTH) {
    // Reject before trim/regex/encodeURIComponent — those copy/scan the
    // string and would burn memory + CPU on a hostile multi-MB payload.
    throw new GitHubClientError(
      "invalid-url",
      `URL input too long (${input.length} > ${MAX_URL_INPUT_LENGTH}).`,
    );
  }
  const trimmed = input.trim();
  const match = URL_PATTERN.exec(trimmed);
  if (!match) {
    throw new GitHubClientError(
      "invalid-url",
      `Not a github.com repository URL: ${trimmed}`,
    );
  }
  return { owner: match[1].toLowerCase(), name: match[2].toLowerCase() };
}

// --- Public calls -----------------------------------------------------------

// Validate that a repo exists and is publicly accessible. Returns nothing on
// success; throws GitHubClientError on any failure. Uses the lightweight
// /repos/{owner}/{name} endpoint, which returns repo metadata (~5KB) — we
// discard the body since AddRepo only cares about the status. The first
// scheduled poll fetches the actual releases.
export async function validateRepo(owner: string, name: string): Promise<void> {
  const url = `${GITHUB_API_BASE}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(name)}`;
  await fetchWithRetry("validateRepo", url);
}

// Fetch up to `perPage` releases for the repo, newest first.
//
// `perPage` defaults to 3 — see DESIGN.md → Backfill on add for the rationale
// (3 is enough for first-add seeding and good enough for missed-cycle
// catch-up; high-volume forks may want to bump it). Drafts are filtered out
// here because GitHub's unauthenticated /releases endpoint already excludes
// drafts; the `draft` field on the GitHubRelease shape is a defensive check
// in case a future API change starts including them.
export async function listReleases(
  owner: string,
  name: string,
  perPage = 3,
): Promise<GitHubRelease[]> {
  const url =
    `${GITHUB_API_BASE}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(name)}` +
    `/releases?per_page=${perPage}`;
  const json = await fetchWithRetry("listReleases", url);
  const arr = parseReleasesArray(json);
  return arr.filter((r) => !r.draft);
}

// Fetch the single latest release for the Test preview. Branches on
// includePrereleases:
//   - false: GET /releases/latest, GitHub's "latest stable" endpoint that
//     excludes prereleases by design. Returns 404 if the repo has only
//     prereleases or no releases at all — caller should treat 404 here as
//     "no latest release," not "repo gone."
//   - true: GET /releases?per_page=1, the most recently published release of
//     any kind. Returns [] if the repo has no releases.
//
// Returns null when the repo has no eligible release. Throws on transport
// errors.
export async function getLatestRelease(
  owner: string,
  name: string,
  includePrereleases: boolean,
): Promise<GitHubRelease | null> {
  if (includePrereleases) {
    const url =
      `${GITHUB_API_BASE}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(name)}` +
      `/releases?per_page=1`;
    const json = await fetchWithRetry("getLatestRelease(any)", url);
    const arr = parseReleasesArray(json);
    return arr[0] ?? null;
  }
  const url =
    `${GITHUB_API_BASE}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(name)}` +
    `/releases/latest`;
  try {
    const json = await fetchWithRetry("getLatestRelease(stable)", url);
    return parseRelease(json);
  } catch (err) {
    if (err instanceof GitHubClientError && err.kind === "repo-not-found") {
      // /releases/latest returns 404 when the repo has only prereleases or
      // no releases at all — that's "no preview available," not a real
      // repo-gone signal. Distinguish from validateRepo's 404, which IS
      // repo-gone (different endpoint, different meaning).
      return null;
    }
    throw err;
  }
}

// --- Internal: HTTP with retry ---------------------------------------------

const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1000;
const MAX_DELAY_MS = 15000;

async function fetchWithRetry(label: string, url: string): Promise<unknown> {
  for (let attempt = 0; ; attempt++) {
    let response: Response;
    try {
      response = await fetch(url, {
        headers: {
          "User-Agent": USER_AGENT,
          "Accept": "application/vnd.github+json",
          // Pin to a known API version so a server-side default change can't
          // surprise us. GitHub guarantees backward compatibility within a
          // version per its REST API docs.
          "X-GitHub-Api-Version": "2022-11-28",
        },
      });
    } catch (err) {
      // Network/DNS failure — retryable up to MAX_RETRIES.
      if (attempt >= MAX_RETRIES) {
        log("error", `[${label}] network failed after ${attempt + 1} attempt(s)`, {
          url,
          ...errFields(err),
        });
        throw new GitHubClientError(
          "unreachable",
          `Could not reach GitHub: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
      await sleepBackoff(label, attempt, "network");
      continue;
    }

    if (response.status === STATUS_NOT_FOUND) {
      throw new GitHubClientError(
        "repo-not-found",
        `GitHub returned 404 for ${url}`,
        404,
      );
    }

    if (STATUS_RATE_LIMITED.has(response.status)) {
      // Rate-limited — retryable. We honor Retry-After only if it's a small
      // integer (seconds); anything larger means the budget is exhausted
      // for the hour and there's no point waiting on this attempt cycle.
      const retryAfter = parseRetryAfter(response.headers.get("retry-after"));
      if (attempt >= MAX_RETRIES) {
        log("warn", `[${label}] rate-limited, no retries left`, {
          url,
          status: response.status,
          retryAfter,
        });
        throw new GitHubClientError(
          "rate-limited",
          `GitHub rate-limited (status ${response.status})`,
          response.status,
        );
      }
      await sleepBackoff(label, attempt, "rate-limited", retryAfter);
      continue;
    }

    if (response.status >= 500 && response.status < 600) {
      if (attempt >= MAX_RETRIES) {
        log("error", `[${label}] 5xx after ${attempt + 1} attempt(s)`, {
          url,
          status: response.status,
        });
        throw new GitHubClientError(
          "unreachable",
          `GitHub returned ${response.status}`,
          response.status,
        );
      }
      await sleepBackoff(label, attempt, "5xx");
      continue;
    }

    if (!response.ok) {
      // Other 4xx (400, 401, 422, etc.) — not retryable.
      throw new GitHubClientError(
        "unreachable",
        `GitHub returned ${response.status}`,
        response.status,
      );
    }

    // Success path. Parse JSON; a malformed body is treated as unreachable
    // (the endpoint is misbehaving) rather than not-found.
    try {
      return await response.json();
    } catch (err) {
      throw new GitHubClientError(
        "unreachable",
        `GitHub response was not JSON: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }
}

function parseRetryAfter(header: string | null): number | undefined {
  if (!header) return undefined;
  const seconds = Number(header);
  if (!Number.isFinite(seconds) || seconds <= 0 || seconds > 60) return undefined;
  return seconds * 1000;
}

async function sleepBackoff(
  label: string,
  attempt: number,
  reason: string,
  retryAfterMs?: number,
): Promise<void> {
  // Bounded jitter: floor at BASE_DELAY_MS, ceiling at the exponential
  // cap. `Math.random() * capped` — full jitter — can produce a near-
  // zero delay on the first retry, hammering the dependency we just
  // got rate-limited by. Bounding the floor guarantees a real minimum
  // wait while still spreading retries across [base, capped). Same
  // shape as lib/retry.ts withRetry — keep the policy consistent.
  const exponential = BASE_DELAY_MS * 2 ** attempt;
  const capped = Math.min(exponential, MAX_DELAY_MS);
  const jittered = BASE_DELAY_MS + Math.random() * (capped - BASE_DELAY_MS);
  const delay = retryAfterMs ?? jittered;
  log("warn", `[${label}] retry ${attempt + 1}/${MAX_RETRIES}`, {
    reason,
    delayMs: Math.round(delay),
  });
  await new Promise((r) => setTimeout(r, delay));
}

// --- Internal: parsers ------------------------------------------------------

function parseRelease(json: unknown): GitHubRelease {
  if (!json || typeof json !== "object") {
    throw new GitHubClientError("unreachable", "Release response was not an object");
  }
  const o = json as Record<string, unknown>;
  // Defensive type checks on the fields we actually use. A future GitHub
  // change that swaps a string for null on `name` or `body` would otherwise
  // surface as a hard crash in archiveStore.insert; coercing to "" here keeps
  // the archive write safe.
  return {
    id: Number(o.id),
    tag_name: typeof o.tag_name === "string" ? o.tag_name : "",
    name: typeof o.name === "string" ? o.name : null,
    body: typeof o.body === "string" ? o.body : null,
    html_url: typeof o.html_url === "string" ? o.html_url : "",
    published_at: typeof o.published_at === "string" ? o.published_at : null,
    prerelease: o.prerelease === true,
    draft: o.draft === true,
  };
}

function parseReleasesArray(json: unknown): GitHubRelease[] {
  if (!Array.isArray(json)) {
    throw new GitHubClientError(
      "unreachable",
      "Releases response was not an array",
    );
  }
  return json.map(parseRelease);
}
