// Client-side retry for RPC calls that may transiently fail. Mirrors the
// server-side withRetry in shape; the client SDK doesn't surface
// errorCode classifications as cleanly so we treat all errors as
// retryable up to the cap, which is fine for read-mostly RPCs.

export async function withClientRetry<T>(
  op: () => Promise<T>,
  opts?: { maxRetries?: number; baseMs?: number; maxMs?: number },
): Promise<T> {
  const maxRetries = opts?.maxRetries ?? 2;
  const baseMs = opts?.baseMs ?? 250;
  const maxMs = opts?.maxMs ?? 4000;
  for (let attempt = 0; ; attempt++) {
    try {
      return await op();
    } catch (err) {
      if (attempt >= maxRetries) throw err;
      const delay = Math.min(baseMs * 2 ** attempt, maxMs) * Math.random();
      await new Promise((r) => setTimeout(r, delay));
    }
  }
}
