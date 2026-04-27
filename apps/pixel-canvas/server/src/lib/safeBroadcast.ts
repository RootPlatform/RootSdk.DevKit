import { log, errFields } from "./log";

// ============================================================================
// safeBroadcast — wrap a broadcast call so failures are logged but never
// propagate to the caller.
//
// Why: a broadcast that fails AFTER a successful DB write must NOT bubble up.
// If it did, the caller's RPC would surface an error and the client would
// likely retry — re-applying a write that already committed. Connected
// clients may miss this particular broadcast, but they'll see the change on
// their next fetch. Correctness is preserved at the cost of one missed
// real-time update.
//
// Accepts both `void` and `Promise<void>` callables. Today the SDK's
// `sendBroadcast` is typed void (synchronous fire-and-forget), but typing
// the parameter as `() => void | Promise<void>` future-proofs us against
// any SDK change that makes broadcasts async — and gives us a single place
// to keep that contract honest. Every broadcast call site in this app
// routes through this helper for consistency; forks that grow additional
// reactive paths (message handlers, scheduled jobs, etc.) should do the
// same so error handling stays uniform.
// ============================================================================

export async function safeBroadcast(
  label: string,
  op: () => void | Promise<void>,
): Promise<void> {
  try {
    await op();
  } catch (err) {
    log("error", `broadcast failed: ${label}`, errFields(err));
  }
}
