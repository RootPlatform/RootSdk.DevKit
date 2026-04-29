import { Database } from "./db";
import { insertRelease, NewReleaseFields, ReleaseRow } from "./archiveStore";
import { safeBroadcast } from "./lib/safeBroadcast";

// ============================================================================
// releaseBroadcaster — the single funnel for new-release dispatch.
//
// Every path that surfaces a release into the system flows through
// `onNewRelease`: archive insert → ReleaseAdded broadcast. This concentrates
// the side effects in one place so:
//
//   - Tests can stub the funnel.
//   - Future instrumentation (counters, traces) lands in one spot.
//   - Archive and broadcast stay in lockstep — a future code path that adds
//     a new "introduce a release" trigger inherits both behaviors for free
//     by calling here.
//
// The Preview disclosure does NOT call this. The TestRepo RPC fetches and
// returns to the calling client only — never archives, never broadcasts.
// See DESIGN.md → Test preview.
//
// Decoupling: this module deliberately does NOT import the service. The
// service registers itself as the broadcast target via `setReleaseBroadcaster`
// at startup, and `onNewRelease` reads the registered function at call time.
// Earlier versions imported `releaseWatcherService` here, which created a
// circular import (service → broadcaster → service); the cycle worked only
// because the reference was lazy, but agents copying this file would inherit
// the footgun. Registration callback is the same shape that any tests can
// use to stub the broadcast.
// ============================================================================

// Wire-shape proto Release. Declared structurally to avoid importing the
// generated proto module here (the service is the single owner of the proto
// surface; this module stays infrastructure-only).
type ProtoRelease = {
  id: bigint;
  owner: string;
  name: string;
  tagName: string;
  releaseName: string;
  body: string;
  htmlUrl: string;
  publishedAt: bigint;
  prerelease: boolean;
  addedAt: bigint;
};

// Return type accepts either void (the generated broadcastReleaseAdded
// signature) or Promise<void> (in case a fork wraps it in an async
// shim). `await` of a non-promise value is a no-op, so safeBroadcast
// handles both shapes correctly.
type ReleaseBroadcastFn = (release: ProtoRelease) => void | Promise<void>;

let broadcastFn: ReleaseBroadcastFn | undefined;

// Registered by the service at startup. After this is set, every onNewRelease
// call broadcasts via the registered function. If left unset (e.g., a unit
// test environment), the broadcast is a no-op — the archive write still runs.
export function setReleaseBroadcaster(fn: ReleaseBroadcastFn): void {
  broadcastFn = fn;
}

export async function onNewRelease(
  db: Database,
  fields: NewReleaseFields,
): Promise<ReleaseRow> {
  const inserted = await insertRelease(db, fields);
  // Capture into a local before crossing the async boundary. TypeScript's
  // narrowing of the module-scope `broadcastFn` doesn't survive into the
  // safeBroadcast lambda; without the local, we'd need a non-null assertion
  // (`broadcastFn!(...)`) which is the kind of smell agents copy.
  const fn = broadcastFn;
  if (fn) {
    const release = rowToProto(inserted);
    await safeBroadcast("ReleaseAdded", () => fn(release));
  }
  return inserted;
}

// Convert an internal ReleaseRow (snake_case columns) to the proto Release
// shape (camelCase, expected types). Used both here and in the service when
// returning archive rows over GetFeed.
export function rowToProto(row: ReleaseRow): ProtoRelease {
  return {
    // Proto int64 fields → bigint in TS. Our DB columns are INTEGER which
    // sqlite3 returns as JS number; widen here. GitHub release IDs are
    // increasing integers (around 200M today) — well within Number.MAX_SAFE
    // _INTEGER, but bigint is the wire shape so we convert.
    id: BigInt(row.id),
    owner: row.owner,
    name: row.name,
    tagName: row.tag_name,
    releaseName: row.release_name,
    body: row.body,
    htmlUrl: row.html_url,
    publishedAt: BigInt(row.published_at),
    prerelease: row.prerelease === 1,
    addedAt: BigInt(row.added_at),
  };
}
