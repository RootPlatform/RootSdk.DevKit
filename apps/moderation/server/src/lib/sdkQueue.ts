import { log } from "./log";

// sdkQueue — token-bucket throttler for outbound SDK calls.
//
// The Root SDK enforces a per-app command quota (~5/s for state-mutating
// calls — delete, create, ban, kick). A spam burst from one user can
// drive 20+ deletions in seconds; without backpressure those calls land
// faster than the SDK accepts them and some will fail with throttling
// errors. The queue smooths the burst: callers `enqueue()` an SDK call
// and the queue fires them at CAPACITY-per-second.
//
// Pattern shape (transferable to any high-volume app):
//   const queue = createSdkQueue({ capacity: 5, refillPerSec: 5 });
//   await queue.enqueue(() => rootServer.community.channelMessages.delete({...}));
//
// Implementation:
//   - Token bucket: bucket fills lazily on each enqueue (now − lastRefill
//     × rate, clamped to capacity). No background refill timer needed.
//   - If a token is available, the call runs immediately + token consumed.
//   - Otherwise the call goes on the queue with a Promise resolver; a
//     short timer fires when the next token would be available, drains
//     up to that-many queued calls, and reschedules if more remain.
//   - Bounded queue: drops the oldest waiting call (rejecting its
//     Promise) when the queue exceeds MAX_QUEUE_SIZE. Should never hit
//     in normal use — at sample scale the burst is at most tens, well
//     under the 100-entry cap.
//
// Why not a generic external library: this teaches the pattern in ≤90
// lines of explicit code. Forks copy what they see; an opaque dep adds
// less value than the readable inline implementation.

interface QueueOptions {
  capacity: number;
  refillPerSec: number;
  maxQueueSize?: number;
}

interface PendingCall<T> {
  fn: () => Promise<T>;
  resolve: (value: T) => void;
  reject: (err: unknown) => void;
}

const DEFAULT_MAX_QUEUE_SIZE = 100;

export interface SdkQueue {
  enqueue<T>(fn: () => Promise<T>): Promise<T>;
}

export function createSdkQueue(options: QueueOptions): SdkQueue {
  const capacity = options.capacity;
  const refillPerSec = options.refillPerSec;
  const maxQueueSize = options.maxQueueSize ?? DEFAULT_MAX_QUEUE_SIZE;

  let tokens = capacity;
  let lastRefill = Date.now();
  // unknown call type = the queue is heterogeneous; we just need to
  // resolve/reject the original Promise the caller awaits.
  const pending: PendingCall<unknown>[] = [];
  let drainTimer: ReturnType<typeof setTimeout> | undefined;

  function refill(): void {
    const now = Date.now();
    const elapsedSec = (now - lastRefill) / 1000;
    const toAdd = elapsedSec * refillPerSec;
    if (toAdd > 0) {
      tokens = Math.min(capacity, tokens + toAdd);
      lastRefill = now;
    }
  }

  function scheduleDrain(): void {
    if (drainTimer || pending.length === 0) return;
    // Time until the next token is available, in ms.
    const tokensNeeded = 1 - tokens;
    const waitMs = Math.max(1, Math.ceil((tokensNeeded / refillPerSec) * 1000));
    drainTimer = setTimeout(() => {
      drainTimer = undefined;
      drain();
    }, waitMs);
    drainTimer.unref?.();
  }

  function drain(): void {
    refill();
    while (tokens >= 1 && pending.length > 0) {
      const next = pending.shift()!;
      tokens -= 1;
      // Run async; resolve/reject the caller's Promise.
      next.fn().then(next.resolve, next.reject);
    }
    if (pending.length > 0) scheduleDrain();
  }

  return {
    async enqueue<T>(fn: () => Promise<T>): Promise<T> {
      refill();
      // Fast path: a token is available, run immediately.
      if (tokens >= 1 && pending.length === 0) {
        tokens -= 1;
        return fn();
      }
      // Slow path: queue and wait. Bounded so a runaway producer can't
      // unboundedly grow memory. On overflow we reject the NEWEST call
      // (the one we'd otherwise be enqueuing) rather than dropping an
      // already-queued one. Two reasons:
      //   1. Older queued calls correspond to violations that have been
      //      visible in the channel longest — those most need to land.
      //   2. The caller learns synchronously (rejected Promise on the
      //      enqueue itself) instead of a queued call resolving with a
      //      "dropped" error after the fact, where the original delete
      //      attempt has long since lost its calling context.
      if (pending.length >= maxQueueSize) {
        log("warn", "sdkQueue overflow; rejecting newest call", {
          queueSize: pending.length,
          maxQueueSize,
        });
        return Promise.reject(new Error("sdkQueue overflow"));
      }
      return new Promise<T>((resolve, reject) => {
        pending.push({
          fn: fn as () => Promise<unknown>,
          resolve: resolve as (v: unknown) => void,
          reject,
        });
        scheduleDrain();
      });
    },
  };
}

// Shared queue for moderation SDK calls. Tuned to the platform's command
// quota (~5/s; see Mark's rate-limit memory). One queue across all
// outbound calls in this app — sharing the bucket means a spam burst
// throttles fairly across delete + warning-post + ban-create traffic
// instead of each having its own quota.
export const moderationSdkQueue = createSdkQueue({
  capacity: 5,
  refillPerSec: 5,
});
