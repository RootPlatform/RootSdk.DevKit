import { log, errFields } from "./log";

// Wrap a broadcast call so failures are logged but never propagate. A
// broadcast that fails after a successful DB write must NOT bubble — the
// caller's RPC would surface an error and the client would likely retry,
// re-applying a write that already committed. Connected clients may miss
// this particular broadcast but will see the change on their next fetch.

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
