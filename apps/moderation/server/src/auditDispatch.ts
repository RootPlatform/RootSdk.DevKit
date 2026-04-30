import { Database } from "./db";
import { append as appendAudit, AppendInput } from "./auditLogStore";
import { safeBroadcast } from "./lib/safeBroadcast";

// auditDispatch — single funnel for "new audit entry" dispatch.
//
// Every path that writes an audit entry — automated (messageHandler's three
// rule paths) and manual (admin RPCs: delete-message, kick, ban) — flows
// through `onAuditEntry`: SQLite insert → AuditLogAppended broadcast.
// Concentrating side effects in one place means:
//
//   - Tests can stub the funnel.
//   - Future instrumentation (counters, traces) lands in one spot.
//   - The persist-then-broadcast contract stays in lockstep across every
//     audit-writing call site — a new "introduce an audit entry" trigger
//     inherits both behaviors by calling here.
//
// Decoupling: this module deliberately does NOT import the moderation
// service. The service registers itself as the broadcast target via
// `setAuditBroadcaster` at startup, and `onAuditEntry` reads the registered
// function at call time. Direct service imports here would create a
// circular dependency (service → dispatch → service); the registration
// callback is also the same shape tests can use to stub the broadcast.

type AuditBroadcastFn = () => void | Promise<void>;

let broadcastFn: AuditBroadcastFn | undefined;

// Registered by the service at startup. After this is set, every
// onAuditEntry call broadcasts via the registered function. If left unset
// (e.g., a unit test environment), the broadcast is a no-op — the SQLite
// insert still runs.
export function setAuditBroadcaster(fn: AuditBroadcastFn): void {
  broadcastFn = fn;
}

// Persist an audit entry, then fire AuditLogAppended (best-effort). Returns
// the row id so callers that need it (e.g., a future per-row update path)
// can hold onto it.
export async function onAuditEntry(
  db: Database,
  fields: AppendInput,
): Promise<number> {
  const id = await appendAudit(db, fields);
  // Capture before the async boundary — TS narrowing of the module-scope
  // `broadcastFn` doesn't survive into the safeBroadcast lambda, and a
  // non-null assertion (`broadcastFn!()`) is the kind of smell agents copy.
  const fn = broadcastFn;
  if (fn) {
    await safeBroadcast("AuditLogAppended", () => fn());
  }
  return id;
}
