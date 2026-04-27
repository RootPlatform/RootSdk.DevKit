import {
  Client,
  RootServerException,
  UserGuid,
} from "@rootsdk/server-app";
import {
  GetCanvasRequest,
  GetCanvasResponse,
  PlacePixelRequest,
  PlacePixelResponse,
  GetSettingsRequest,
  GetSettingsResponse,
  UpdateSettingsRequest,
  UpdateSettingsResponse,
  ClearCanvasRequest,
  ClearCanvasResponse,
  ReportClientErrorRequest,
  ReportClientErrorResponse,
  PixelEntry,
  PixelCanvasError,
} from "@pixelcanvas/gen-shared";
import { PixelCanvasServiceBase } from "@pixelcanvas/gen-server";
import { isAdmin } from "./adminCheck";
import {
  readCanvas,
  placePixelIfCooldownElapsed,
  clearCanvas as clearCanvasStore,
  getLastPlacedAt,
  sweepStaleCooldowns,
} from "./canvasStore";
// Renamed to avoid shadowing the same-named class methods below.
import {
  getSettings as loadSettings,
  updateSettings as saveSettings,
} from "./appSettingsStore";
import { safeBroadcast } from "./lib/safeBroadcast";
import { log } from "./lib/log";

// ============================================================================
// PixelCanvasService — the RPC surface.
//
// Auth gates:
//   - GetCanvas, PlacePixel, ReportClientError: any authenticated client.
//   - GetSettings, UpdateSettings, ClearCanvas: admin-only.
//
// Broadcasts (all "all" audience):
//   - PixelPlaced: per-placement, no coalescing. The fundamental "shared
//     canvas" feel depends on every client seeing every other client's
//     placement immediately. Per-user cooldown caps the global rate.
//   - CanvasCleared: paired with size changes (which always clear), or
//     standalone via the admin Clear action.
//   - SettingsChanged: cooldown / size payload, public to all.
//   - AdminsChanged: empty signal mirroring the convention in
//     leveling-leaderboard / self-roles.
// ============================================================================

// Limits — server is single source of truth. Shipped to the client via
// CanvasLimits so admin Settings inputs respect the same range.
const COOLDOWN_SECONDS_MIN = 5;
const COOLDOWN_SECONDS_MAX = 300;
const ALLOWED_CANVAS_SIZES = [32, 48, 64];

// 16-color palette tuned to read on both light and dark backgrounds.
//
// Mix of saturated and muted, plus white/black/two grays so text-on-color
// chrome (the action panel showing "placed by ...") stays legible
// regardless of the cell's color. Forks that want a different palette can
// edit this array; the client receives it via GetCanvas.palette and has
// no hardcoded list of its own.
//
// Color comparison is CASE-INSENSITIVE (see canonicalizeColor below).
// CSS-roundtripped values (e.g. via getComputedStyle) come out lowercase,
// so a fork that derives picker entries from rendered styles wouldn't
// otherwise match against this uppercase list — that mismatch would
// surface as INVALID_COLOR errors with no obvious cause. Canonicalizing
// to uppercase on both ingest and storage keeps wire and KV uniform.
const PALETTE: readonly string[] = [
  "#FFFFFF", "#E4E4E4", "#888888", "#222222",
  "#FFA7D1", "#E50000", "#E59500", "#A06A42",
  "#E5D900", "#94E044", "#02BE01", "#00D3DD",
  "#0083C7", "#0000EA", "#CF6EE4", "#820080",
];
const PALETTE_SET = new Set(PALETTE);

// Returns the canonical (uppercase) form of `color` if it's in the palette,
// or undefined if the input doesn't match any palette entry. The canonical
// form should be used for storage + broadcasts so all stored pixels share
// one casing — readers (clients) just paint the string straight into a
// CSS background-color, where casing is irrelevant, but a uniform case
// keeps debug output readable and makes any future color-equality check
// trivial.
function canonicalizeColor(color: string): string | undefined {
  const upper = color.toUpperCase();
  return PALETTE_SET.has(upper) ? upper : undefined;
}

// Caps on client error report payloads (see truncate() and the rate-limit
// bucket below). Same shape as leveling-leaderboard / self-roles.
const LIMIT_ERROR_LABEL_CHARS = 100;
const LIMIT_ERROR_MESSAGE_CHARS = 2000;
const LIMIT_ERROR_STACK_CHARS = 8000;
const LIMIT_ERROR_USER_AGENT_CHARS = 500;

export class PixelCanvasService extends PixelCanvasServiceBase {
  // --- Public RPCs ---------------------------------------------------------

  async getCanvas(
    _request: GetCanvasRequest,
    client: Client,
  ): Promise<GetCanvasResponse> {
    const canvas = readCanvas();
    const settings = await loadSettings();
    const amIAdmin = await isAdmin(client.userId);

    const pixels: PixelEntry[] = Object.entries(canvas.pixels).map(
      ([k, data]) => {
        const [xs, ys] = k.split(",");
        return {
          x: Number(xs),
          y: Number(ys),
          data: {
            color: data.color,
            userId: data.userId,
            placedAt: BigInt(data.placedAt),
          },
        };
      },
    );

    return {
      width: canvas.width,
      height: canvas.height,
      pixels,
      myLastPlacedAt: BigInt(getLastPlacedAt(client.userId)),
      cooldownSeconds: settings.cooldownSeconds,
      palette: [...PALETTE],
      amIAdmin,
      limits: {
        cooldownSecondsMin: COOLDOWN_SECONDS_MIN,
        cooldownSecondsMax: COOLDOWN_SECONDS_MAX,
        allowedCanvasSizes: [...ALLOWED_CANVAS_SIZES],
      },
    };
  }

  async placePixel(
    request: PlacePixelRequest,
    client: Client,
  ): Promise<PlacePixelResponse> {
    const canvas = readCanvas();
    const settings = await loadSettings();

    // Validate coordinates against the CURRENT canvas (caller may be
    // stale — admin shrunk the canvas after the client cached its size).
    if (
      request.x < 0 ||
      request.x >= canvas.width ||
      request.y < 0 ||
      request.y >= canvas.height
    ) {
      throw new RootServerException(
        PixelCanvasError.INVALID_COORDINATES,
        `(${request.x}, ${request.y}) is outside the ${canvas.width}×${canvas.height} canvas`,
      );
    }

    // Validate color against the palette (case-insensitive — see
    // canonicalizeColor's comment for why). The canonical (uppercase)
    // form is what we actually persist + broadcast, so wire-format and
    // KV stay uniform regardless of how the client cased the input.
    const canonicalColor = canonicalizeColor(request.color);
    if (canonicalColor === undefined) {
      throw new RootServerException(
        PixelCanvasError.INVALID_COLOR,
        `Color ${request.color} is not in the palette`,
      );
    }

    const cooldownMs = settings.cooldownSeconds * 1000;
    // `now` is captured BEFORE the placePixelIfCooldownElapsed call (which
    // serializes through canvasWriteLock). Under heavy contention, the
    // pixel's `placedAt` will trail wall-clock by however long the queue
    // makes the caller wait — by design, since we want the cooldown
    // anchor and the stored timestamp to be the same value (otherwise a
    // user could see "Cooldown active — 5s remaining" while the wall
    // clock said the cooldown should have elapsed). Callers that read
    // `placedAt` for "X seconds ago" provenance accept that this can
    // read slightly older than reality under contention.
    const now = Date.now();
    const outcome = await placePixelIfCooldownElapsed(
      client.userId,
      request.x,
      request.y,
      canonicalColor,
      cooldownMs,
      now,
    );

    if (outcome.kind === "cooldown") {
      // Floor to at least 1s so the message never shows "0s remaining" for a
      // sub-second remainder. The remaining-ms calculation happens inside
      // the store using the same `now` we passed in, so the message can't
      // drift relative to the elapsed-check that produced this branch.
      const remainingSeconds = Math.max(
        1,
        Math.ceil(outcome.remainingMs / 1000),
      );
      throw new RootServerException(
        PixelCanvasError.COOLDOWN_NOT_ELAPSED,
        `Cooldown active — ${remainingSeconds}s remaining`,
      );
    }

    // Broadcast the placement to everyone. Per-pixel events at "all" —
    // see DESIGN.md "Broadcasts" for the rate analysis.
    await safeBroadcast("PixelPlaced", () =>
      this.broadcastPixelPlaced(
        {
          x: request.x,
          y: request.y,
          color: canonicalColor,
          userId: client.userId,
          placedAt: BigInt(outcome.placedAt),
        },
        "all",
      ),
    );

    return { placedAt: BigInt(outcome.placedAt) };
  }

  // --- Admin RPCs ----------------------------------------------------------

  async getSettings(
    _request: GetSettingsRequest,
    client: Client,
  ): Promise<GetSettingsResponse> {
    await this.requireAdmin(client);
    const settings = await loadSettings();
    return {
      cooldownSeconds: settings.cooldownSeconds,
      canvasSize: settings.canvasSize,
      limits: {
        cooldownSecondsMin: COOLDOWN_SECONDS_MIN,
        cooldownSecondsMax: COOLDOWN_SECONDS_MAX,
        allowedCanvasSizes: [...ALLOWED_CANVAS_SIZES],
      },
    };
  }

  async updateSettings(
    request: UpdateSettingsRequest,
    client: Client,
  ): Promise<UpdateSettingsResponse> {
    await this.requireAdmin(client);

    // Integer + range validation. proto3's int32 wire encoding strips
    // fractional/NaN values today, so the Number.isInteger check is
    // belt-and-suspenders against a future wire change or a hand-crafted
    // request hitting a different transport — but the real reason it's
    // here is that "production-grade sample" means a fork copy-pasting
    // this validation block expects to see explicit shape checks
    // alongside the range checks.
    if (
      !Number.isInteger(request.cooldownSeconds) ||
      request.cooldownSeconds < COOLDOWN_SECONDS_MIN ||
      request.cooldownSeconds > COOLDOWN_SECONDS_MAX
    ) {
      throw new RootServerException(
        PixelCanvasError.INVALID_SETTINGS,
        `Cooldown must be an integer between ${COOLDOWN_SECONDS_MIN} and ${COOLDOWN_SECONDS_MAX} seconds`,
      );
    }
    if (
      !Number.isInteger(request.canvasSize) ||
      !ALLOWED_CANVAS_SIZES.includes(request.canvasSize)
    ) {
      throw new RootServerException(
        PixelCanvasError.INVALID_SETTINGS,
        `Canvas size must be one of ${ALLOWED_CANVAS_SIZES.join(", ")}`,
      );
    }

    const previous = await loadSettings();
    const sizeChanged = request.canvasSize !== previous.canvasSize;

    // Order matters for crash recovery. Two KV writes (canvas state +
    // settings) can't be a single transaction, so we have to pick which
    // one runs first:
    //
    //   - canvas-then-settings (current order): if canvas write succeeds
    //     and settings write fails, the next attempt sees the previous
    //     settings still in place, recomputes sizeChanged=true, re-runs
    //     the (idempotent) clear/resize, then writes settings again. Self-
    //     healing on retry.
    //
    //   - settings-then-canvas (the previous order): if settings succeeds
    //     and canvas fails, the next attempt sees previous.canvasSize ===
    //     request.canvasSize → sizeChanged=false → the canvas resize is
    //     silently skipped forever, and settings advertise a size the
    //     canvas store doesn't have. Permanent inconsistency.
    //
    // Size changes always clear — preserving pixels through a resize
    // would mean either truncating (silent loss) or padding (visual
    // jump). Both are confusing; clearing is honest.
    if (sizeChanged) {
      await clearCanvasStore(request.canvasSize);
      await safeBroadcast("CanvasCleared", () =>
        this.broadcastCanvasCleared(
          { width: request.canvasSize, height: request.canvasSize },
          "all",
        ),
      );
    }

    await saveSettings({
      cooldownSeconds: request.cooldownSeconds,
      canvasSize: request.canvasSize,
    });

    await safeBroadcast("SettingsChanged", () =>
      this.broadcastSettingsChanged(
        {
          cooldownSeconds: request.cooldownSeconds,
          canvasSize: request.canvasSize,
        },
        "all",
      ),
    );

    log("info", "settings updated", {
      by: client.userId,
      cooldownSeconds: request.cooldownSeconds,
      canvasSize: request.canvasSize,
      sizeChanged,
    });

    return {};
  }

  async clearCanvas(
    _request: ClearCanvasRequest,
    client: Client,
  ): Promise<ClearCanvasResponse> {
    await this.requireAdmin(client);
    const cleared = await clearCanvasStore();
    await safeBroadcast("CanvasCleared", () =>
      this.broadcastCanvasCleared(
        { width: cleared.width, height: cleared.height },
        "all",
      ),
    );
    log("warn", "canvas cleared", { by: client.userId });
    return {};
  }

  // --- Client telemetry ----------------------------------------------------

  async reportClientError(
    request: ReportClientErrorRequest,
    client: Client,
  ): Promise<ReportClientErrorResponse> {
    if (!checkErrorReportRate(client.userId)) {
      return {};
    }
    log("error", "client error reported", {
      userId: client.userId,
      label: truncate(request.label, LIMIT_ERROR_LABEL_CHARS),
      clientMessage: truncate(request.message, LIMIT_ERROR_MESSAGE_CHARS),
      stack: truncate(request.stack, LIMIT_ERROR_STACK_CHARS),
      userAgent: truncate(request.userAgent, LIMIT_ERROR_USER_AGENT_CHARS),
    });
    return {};
  }

  // --- Internal broadcasts -------------------------------------------------

  // Called from main.ts onAdminsChanged hook. Empty signal — clients
  // re-fetch GetCanvas to refresh amIAdmin.
  async notifyAdminsChanged(): Promise<void> {
    await safeBroadcast("AdminsChanged", () =>
      this.broadcastAdminsChanged({}, "all"),
    );
  }

  // --- Helpers -------------------------------------------------------------

  private async requireAdmin(client: Client): Promise<void> {
    const ok = await isAdmin(client.userId);
    if (!ok) {
      throw new RootServerException(
        PixelCanvasError.NOT_ADMIN,
        "Admin only",
      );
    }
  }
}

// --- Module-scope helpers ---------------------------------------------------

// Per-caller rate limit for ReportClientError. Same recipe as self-roles.
const ERROR_REPORT_LIMIT_PER_WINDOW = 30;
const ERROR_REPORT_WINDOW_MS = 60_000;
const ERROR_REPORT_SWEEP_INTERVAL_MS = 5 * 60_000;
interface ErrorReportBucket {
  count: number;
  windowStart: number;
  loggedDrop: boolean;
}
const errorReportBuckets = new Map<UserGuid, ErrorReportBucket>();

function checkErrorReportRate(userId: UserGuid): boolean {
  const now = Date.now();
  const bucket = errorReportBuckets.get(userId);
  if (!bucket || now - bucket.windowStart >= ERROR_REPORT_WINDOW_MS) {
    errorReportBuckets.set(userId, { count: 1, windowStart: now, loggedDrop: false });
    return true;
  }
  if (bucket.count >= ERROR_REPORT_LIMIT_PER_WINDOW) {
    if (!bucket.loggedDrop) {
      log("warn", "client error report rate limit hit; dropping further reports this window", {
        userId,
        limit: ERROR_REPORT_LIMIT_PER_WINDOW,
        windowMs: ERROR_REPORT_WINDOW_MS,
      });
      bucket.loggedDrop = true;
    }
    return false;
  }
  bucket.count++;
  return true;
}

setInterval(() => {
  const now = Date.now();
  for (const [userId, bucket] of errorReportBuckets) {
    if (now - bucket.windowStart >= ERROR_REPORT_WINDOW_MS) {
      errorReportBuckets.delete(userId);
    }
  }
}, ERROR_REPORT_SWEEP_INTERVAL_MS).unref();

// Periodically evict stale entries from the canvasStore cooldown map.
// Retention = 2× the maximum allowed cooldown so an active user whose
// cooldown is still ticking is never evicted, but a long-tail community's
// "I placed once a year ago" tail doesn't grow the Map without bound.
// Sweep interval is generous (5min) — the cleanup is a perf concern, not
// a correctness one (eviction-and-recreate is observably equivalent for
// a user past their cooldown).
const COOLDOWN_RETENTION_MS = COOLDOWN_SECONDS_MAX * 2 * 1000;
const COOLDOWN_SWEEP_INTERVAL_MS = 5 * 60_000;
setInterval(() => {
  sweepStaleCooldowns(COOLDOWN_RETENTION_MS);
}, COOLDOWN_SWEEP_INTERVAL_MS).unref();

// Surrogate-pair-safe truncate. See leveling-leaderboard for the rationale.
function truncate(s: string, max: number): string {
  if (s.length <= max) return s;
  const codePoints = Array.from(s);
  if (codePoints.length <= max) return s;
  return codePoints.slice(0, max).join("") + "…[truncated]";
}

export const pixelCanvasService = new PixelCanvasService();
