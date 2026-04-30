import { MessageUri } from "@rootsdk/server-app";

// urlFilter — extracts URLs from a message + checks them against the
// admin-managed domain list (or the Root-invite shape). Pure functions;
// the message handler wires settings + enabled-domain list in.
//
// Two extraction sources:
//   1. messageUris[]: the platform's parsed URIs. Includes proper
//      links AND attachments (images/files). We filter to http(s) URIs
//      so attachment URIs don't get matched against domain rules they
//      were never meant to cover.
//   2. messageContent: regex pass over the raw text. Catches plain-text
//      URLs ("check out evil.com") that the platform may not have
//      auto-detected as proper links — a real evasion vector.
//
// Hostname matching uses suffix comparison: a domain entry "evil.com"
// matches both "evil.com" and "*.evil.com" (any subdomain). This is
// what admins expect — listing "evil.com" should cover the whole
// domain tree, not just the root. Implementation: we check
// `hostname === entry || hostname.endsWith("." + entry)`.
//
// Root invite links: hostname `rootapp.gg` with a single non-empty
// path segment (the invite code). We don't have SDK-level access to
// "is this OUR community's invite code?" so the toggle is binary —
// "block all Root invite links, including ours if reposted." Admins
// should understand that's the trade-off.

const ROOT_INVITE_HOST = "rootapp.gg";

// Normalize an admin-supplied domain entry into a canonical hostname.
// Tolerates a few common paste shapes — admins might enter the bare
// domain ("evil.com"), a full URL ("https://www.evil.com/path"), or
// just the host with a leading dot (".evil.com" — a common blocklist
// convention). All collapse to "evil.com".
//
// Returns undefined when the input doesn't look like a domain (empty,
// no dot, or contains characters that aren't valid in a hostname).
// Callers (wordListStore.addWord / importWords for URL_DOMAIN) treat
// undefined as "invalid entry" and skip.
export function normalizeDomain(raw: string): string | undefined {
  let s = raw.trim().toLowerCase();
  if (!s) return undefined;
  // Strip protocol if a full URL was pasted.
  s = s.replace(/^[a-z]+:\/\//, "");
  // Strip path / query / fragment.
  const slashIdx = s.indexOf("/");
  if (slashIdx >= 0) s = s.slice(0, slashIdx);
  // Strip leading "www." and any leading dot (common in blocklist
  // conventions like ".evil.com").
  s = s.replace(/^\.+/, "").replace(/^www\./, "");
  if (!s) return undefined;
  // Must contain at least one dot — bare hostnames (localhost,
  // single-label) aren't useful as moderation entries.
  if (!s.includes(".")) return undefined;
  // Reject anything with characters outside the standard hostname
  // alphabet (letters, digits, dot, hyphen). Catches whitespace inside,
  // Unicode without IDNA conversion, etc.
  if (!/^[a-z0-9.-]+$/.test(s)) return undefined;
  return s;
}

// Standard URL extractor — protocol + everything-up-to-whitespace. Not
// a strict RFC parser; we hand the result to `new URL()` for canonical
// validation and silently drop malformed candidates. Captures both
// http and https; ignores ftp/mailto/data/etc as out-of-scope for
// moderation.
const URL_TEXT_REGEX = /https?:\/\/[^\s<>"']+/gi;

export interface UrlMatch {
  // The URL that triggered the match. Used in the audit row for context.
  url: string;
  // What kind of match — distinguishes blocklist hit vs allowlist
  // miss vs Root-invite for clearer audit excerpt copy.
  reason: "blocklist" | "allowlist" | "root-invite";
  // The matched domain entry (for blocklist) or the offending hostname
  // (for allowlist / root-invite). Goes into the audit row's matched_term.
  matchedTerm: string;
}

// Extract every URL candidate from a message — both platform-parsed
// URIs and plain-text URLs in the body. Deduplicates by URL string so
// a message that includes the same link twice only checks it once.
export function extractUrls(
  messageContent: string,
  messageUris: readonly MessageUri[] | undefined,
): string[] {
  const seen = new Set<string>();
  // Platform-parsed URIs first. Filter to http(s) — attachment URIs
  // (asset:// or similar) shouldn't count.
  if (messageUris) {
    for (const m of messageUris) {
      if (/^https?:\/\//i.test(m.uri)) seen.add(m.uri);
    }
  }
  // Then text-embedded URLs.
  if (messageContent) {
    const matches = messageContent.match(URL_TEXT_REGEX);
    if (matches) {
      for (const m of matches) seen.add(m);
    }
  }
  return [...seen];
}

// Suffix-match: hostname "sub.evil.com" matches entry "evil.com" but
// hostname "evilbutfine.com" does NOT (without the leading dot).
function hostnameMatches(hostname: string, entry: string): boolean {
  const h = hostname.toLowerCase();
  const e = entry.toLowerCase();
  return h === e || h.endsWith("." + e);
}

// Recognize a Root community invite URL by shape. Single path segment
// after the host, non-empty. The actual code is opaque base64-url-ish
// but we don't validate the code itself — any URL pointing at
// rootapp.gg with a path counts as "an invite link" for filtering
// purposes.
function isRootInvite(url: URL): boolean {
  if (url.hostname.toLowerCase() !== ROOT_INVITE_HOST) return false;
  // Strip leading slash; require a non-empty path.
  const path = url.pathname.replace(/^\/+/, "").replace(/\/+$/, "");
  return path.length > 0 && !path.includes("/");
}

// Run the filter over every URL in a message; return the FIRST match.
// Mode + domain list come from the caller (mode from settings,
// domainList from wordListStore). blockRootInvites is independent of
// mode — even if mode is BLOCKLIST with an empty list, this gate can
// still trigger.
export function evaluateUrls(
  urls: readonly string[],
  mode: "blocklist" | "allowlist",
  domainList: readonly string[],
  blockRootInvites: boolean,
): UrlMatch | undefined {
  for (const raw of urls) {
    let parsed: URL;
    try {
      parsed = new URL(raw);
    } catch {
      // Malformed URL — skip. The text-regex extractor occasionally
      // pulls in trailing punctuation that breaks URL parsing.
      continue;
    }
    const hostname = parsed.hostname.toLowerCase();

    if (blockRootInvites && isRootInvite(parsed)) {
      return { url: raw, reason: "root-invite", matchedTerm: hostname };
    }

    if (mode === "blocklist") {
      for (const entry of domainList) {
        if (hostnameMatches(hostname, entry)) {
          return { url: raw, reason: "blocklist", matchedTerm: entry };
        }
      }
    } else {
      // ALLOWLIST mode: any URL whose hostname is NOT on the list is
      // a violation. Empty list in allowlist mode = block ALL URLs.
      // That's the documented trade-off for the highest-trust
      // configuration.
      const ok = domainList.some((entry) => hostnameMatches(hostname, entry));
      if (!ok) {
        return { url: raw, reason: "allowlist", matchedTerm: hostname };
      }
    }
  }
  return undefined;
}
