import {
  Client,
  RootServerException,
  UserGuid,
} from "@rootsdk/server-app";
import {
  GetCanvasRequest,
  GetCanvasResponse,
  GetAmIAdminRequest,
  GetAmIAdminResponse,
  PlacePixelRequest,
  PlacePixelResponse,
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
//   - GetCanvas, GetAmIAdmin, PlacePixel, ReportClientError: any
//     authenticated client.
//   - UpdateSettings, ClearCanvas: admin-only.
//
// Broadcasts:
//   - PixelPlaced: "all" with except: client (placer). The placer
//     already has authoritative state from PlacePixel's response and
//     applied locally; echoing back to them is dead weight on the wire.
//     Per-user cooldown caps the global rate; no coalescing — every
//     other client sees every placement immediately.
//   - CanvasCleared: "all". Paired with size changes (which always
//     clear), or standalone via the admin Clear action.
//   - SettingsChanged: "all". Cooldown / size payload, public.
//   - AdminsChanged: "all". Empty signal — clients respond with a
//     lightweight GetAmIAdmin RPC instead of a full GetCanvas reload.
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
// Index stability: clients address pixels by index into this array on
// the wire (PixelData.palette_index, PlacePixelRequest.palette_index,
// PixelPlacedEvent.palette_index). Storage in KV is canonical hex
// (insulated from index drift), but live wire fields ARE indexed.
// Reordering this array post-deploy changes the meaning of in-flight
// indexes mid-session; appending is safe.
const PALETTE: readonly string[] = [
  "#FFFFFF", "#E4E4E4", "#888888", "#222222",
  "#FFA7D1", "#E50000", "#E59500", "#A06A42",
  "#E5D900", "#94E044", "#02BE01", "#00D3DD",
  "#0083C7", "#0000EA", "#CF6EE4", "#820080",
];

// Reverse index for hex → palette_index lookup at the wire boundary.
// Built once at module init; keys are uppercase hex (the storage form).
// Read-only after init.
const PALETTE_INDEX_BY_HEX: ReadonlyMap<string, number> = new Map(
  PALETTE.map((hex, i) => [hex, i] as const),
);

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
    // loadSettings() (KV read on cold cache) and isAdmin() (admins-group
    // .isMember check) are independent — Promise.all halves the wall
    // clock on the cold-cache path. Once cache is warm both resolve
    // synchronously so the parallelism is free.
    const [settings, amIAdmin] = await Promise.all([
      loadSettings(),
      isAdmin(client.userId),
    ]);

    // Encode stored hex colors as palette indexes for the wire. Pixels
    // whose stored hex isn't in the current palette (orphaned by a
    // post-deploy palette reorder, or a hand-edited KV blob) are
    // dropped from the response — symmetric with the client's
    // skip-on-undefined policy in entriesToMap. A drifted cell renders
    // empty instead of as a misleading fake-white pixel with the
    // original placer's name; the orphan is logged so operators see
    // the drift, and users can re-paint the now-empty cell.
    //
    // Logged at the response level (count) rather than per-cell to
    // avoid a 4096-line burst on a paletteshift that orphans the
    // whole canvas. The log fires once per GetCanvas response; an
    // operator seeing "orphaned: 12" knows there's drift to
    // investigate without drowning in per-cell entries.
    const pixels: PixelEntry[] = [];
    let orphanedCount = 0;
    for (const [k, data] of Object.entries(canvas.pixels)) {
      const paletteIndex = PALETTE_INDEX_BY_HEX.get(data.color);
      if (paletteIndex === undefined) {
        orphanedCount++;
        continue;
      }
      const [xs, ys] = k.split(",");
      pixels.push({
        x: Number(xs),
        y: Number(ys),
        data: {
          paletteIndex,
          userId: data.userId,
          placedAt: BigInt(data.placedAt),
        },
      });
    }
    if (orphanedCount > 0) {
      log("warn", "GetCanvas dropped pixels with palette-orphaned colors", {
        orphanedCount,
        totalPixels: Object.keys(canvas.pixels).length,
      });
    }

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

  // Lightweight per-caller admin check. The client subscribes to
  // AdminsChanged broadcasts and calls this on each event instead of
  // refetching the whole GetCanvas snapshot — a ~200KB pixels blob
  // would otherwise cross the wire for every connected client every
  // time globalSettings.general.admins flapped. Response is one bool.
  //
  // We still ship amIAdmin in GetCanvasResponse for the mount path
  // (one round trip populates everything); GetAmIAdmin is the
  // delta-refresh shape for the broadcast-driven path. The two are
  // intentionally redundant — neither call is wasted because they
  // serve different lifecycle moments.
  async getAmIAdmin(
    _request: GetAmIAdminRequest,
    client: Client,
  ): Promise<GetAmIAdminResponse> {
    return { amIAdmin: await isAdmin(client.userId) };
  }

  async placePixel(
    request: PlacePixelRequest,
    client: Client,
  ): Promise<PlacePixelResponse> {
    const canvas = readCanvas();
    const settings = await loadSettings();

    // Validate coordinates against the CURRENT canvas (caller may be
    // stale — admin shrunk the canvas after the client cached its size).
    // Number.isInteger guards belt-and-suspenders against fractional /
    // NaN inputs (proto3 int32 strips them on the wire today, but a
    // future transport change shouldn't silently accept e.g. 5.5 as a
    // grid coordinate). Same shape as the cooldown/canvasSize integer
    // guards on UpdateSettings.
    //
    // This check is a fast-fail BEFORE we claim the cooldown slot in
    // canvasStore — placePixelIfCooldownElapsed re-validates inside the
    // serialization queue (the canvas may have been resized between
    // here and the queued work running). Both checks are intentional:
    // the outer one avoids burning the cooldown slot for a doomed
    // placement; the inner one defends against the resize-during-queue
    // window. A future cleanup that "removes the redundant outer check"
    // would regress the UX (legitimate users would lose a cooldown
    // window to admin-driven resize timing).
    if (
      !Number.isInteger(request.x) ||
      !Number.isInteger(request.y) ||
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

    // Validate the palette index. Wire is indexed (see proto comments)
    // so this is a simple integer bounds check — no hex-string
    // canonicalization, no "did the client lowercase it" hazard.
    // Number.isInteger guards belt-and-suspenders against fractional /
    // NaN inputs the same way the coordinate validation above does.
    if (
      !Number.isInteger(request.paletteIndex) ||
      request.paletteIndex < 0 ||
      request.paletteIndex >= PALETTE.length
    ) {
      throw new RootServerException(
        PixelCanvasError.INVALID_COLOR,
        `Palette index ${request.paletteIndex} is out of range (0..${PALETTE.length - 1})`,
      );
    }
    // Resolve to the canonical hex for storage. The KV blob format
    // stays as hex strings (insulated from palette reordering); only
    // the wire is indexed.
    const canonicalColor = PALETTE[request.paletteIndex];

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

    // Broadcast the placement to everyone EXCEPT the placer. They
    // already have authoritative state from the direct PlacePixel
    // response (placedAt below) and applied locally via
    // applyOwnPlacement on the client; an echo back to them is dead
    // weight on the wire. The trade-off: if the direct response is
    // lost mid-flight, the placer no longer has the broadcast as a
    // recovery path — they'd manually retry, hit COOLDOWN_NOT_ELAPSED,
    // and wait out the (already-counting-down) cooldown. Tail case
    // for a real network blip; documented in DESIGN.md "Broadcasts".
    //
    // palette_index is forwarded directly from the request — we
    // already bounds-checked it above, so no re-lookup needed.
    await safeBroadcast("PixelPlaced", () =>
      this.broadcastPixelPlaced(
        {
          x: request.x,
          y: request.y,
          paletteIndex: request.paletteIndex,
          userId: client.userId,
          placedAt: BigInt(outcome.placedAt),
        },
        "all",
        client,
      ),
    );

    return { placedAt: BigInt(outcome.placedAt) };
  }

  // --- Admin RPCs ----------------------------------------------------------

  // No GetSettings RPC: the client (Settings.tsx) reads cooldownSeconds
  // / canvasSize / limits directly from CanvasContext, which is fed by
  // GetCanvas + the SettingsChanged broadcast. A separate GetSettings
  // would be a redundant fetch over data the context already has.

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

    // Only broadcast when the saved settings actually changed something.
    // A duplicate save (e.g. an idempotent retry that re-sent the same
    // values) would otherwise emit a no-op SettingsChanged to every
    // connected client.
    const cooldownChanged =
      request.cooldownSeconds !== previous.cooldownSeconds;
    if (cooldownChanged || sizeChanged) {
      await safeBroadcast("SettingsChanged", () =>
        this.broadcastSettingsChanged(
          {
            cooldownSeconds: request.cooldownSeconds,
            canvasSize: request.canvasSize,
          },
          "all",
        ),
      );
    }

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
    // Defensive size cap on each field BEFORE we touch it. truncate()
    // narrows the logged value but the proto-deserialized request
    // strings are already in memory at full wire size — a hostile or
    // buggy client could send multi-MB stacks. Reject anything 10× past
    // the truncate limit so the per-request memory footprint is
    // bounded; the rate limit caps frequency, this caps individual
    // size. Drop silently (return {}) so a noisy client doesn't get a
    // useful "you're rejected" signal it could exploit.
    if (
      request.label.length > LIMIT_ERROR_LABEL_CHARS * 10 ||
      request.message.length > LIMIT_ERROR_MESSAGE_CHARS * 10 ||
      request.stack.length > LIMIT_ERROR_STACK_CHARS * 10 ||
      request.userAgent.length > LIMIT_ERROR_USER_AGENT_CHARS * 10
    ) {
      log("warn", "client error report dropped: oversized field", {
        userId: client.userId,
        labelLen: request.label.length,
        messageLen: request.message.length,
        stackLen: request.stack.length,
        userAgentLen: request.userAgent.length,
      });
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
