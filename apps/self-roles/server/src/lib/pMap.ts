// ============================================================================
// pMap — process an array of items with a worker pool, capped at `concurrency`
// in-flight calls. Returns results in input order.
//
// Why we have this: SDK queries are rate-limited (~20/s for query-class calls).
// `Promise.all(items.map(...))` happily fires N concurrent SDK calls, which
// overruns the limit any time N is higher than the per-second budget. Each
// overrun lands in the SDK's retry/backoff path — correctness is preserved
// but startup latency balloons. Capping concurrency keeps the steady-state
// burst well under the rate ceiling.
//
// Two variants: `pMap` fails fast on first error (fits admin-config flows
// where partial success is worse than a clear error), and `pMapSettled`
// returns per-item results à la Promise.allSettled (fits startup paths
// where one degraded item shouldn't block the whole app from running).
// ============================================================================

const DEFAULT_CONCURRENCY = 5;

export async function pMap<T, R>(
  items: readonly T[],
  fn: (item: T, index: number) => Promise<R>,
  concurrency: number = DEFAULT_CONCURRENCY,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let nextIndex = 0;
  const workers = Array.from(
    { length: Math.min(concurrency, items.length) },
    async () => {
      while (true) {
        const i = nextIndex++;
        if (i >= items.length) return;
        results[i] = await fn(items[i], i);
      }
    },
  );
  await Promise.all(workers);
  return results;
}

export type SettledResult<R> =
  | { status: "fulfilled"; value: R }
  | { status: "rejected"; reason: unknown };

export async function pMapSettled<T, R>(
  items: readonly T[],
  fn: (item: T, index: number) => Promise<R>,
  concurrency: number = DEFAULT_CONCURRENCY,
): Promise<SettledResult<R>[]> {
  const results: SettledResult<R>[] = new Array(items.length);
  let nextIndex = 0;
  const workers = Array.from(
    { length: Math.min(concurrency, items.length) },
    async () => {
      while (true) {
        const i = nextIndex++;
        if (i >= items.length) return;
        try {
          results[i] = { status: "fulfilled", value: await fn(items[i], i) };
        } catch (reason) {
          results[i] = { status: "rejected", reason };
        }
      }
    },
  );
  await Promise.all(workers);
  return results;
}
