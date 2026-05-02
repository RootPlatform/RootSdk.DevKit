---
kind: sample-app
description: r/place-style shared pixel grid every member paints on, one cell at a time
complexity: complex
key_patterns:
  - real-time per-action broadcasts (no coalescing)
  - shared mutable KV blob
  - atomic check-then-place per-user cooldown
  - mobile-first canvas with two-step tap flow
  - adaptive-ceremony destructive action (type-to-confirm only when populated)
---

# pixel-canvas

A shared pixel grid every member of the community paints on, one cell at a time. Members place colored pixels from a fixed palette, then wait a per-user cooldown before placing again. Other members see the placement appear in real time. Anyone can overwrite anyone (r/place model). Admins curate canvas size, cooldown, and can clear the canvas.

This sample teaches a different SDK shape than [`leveling-leaderboard`](../leveling-leaderboard/) and [`self-roles`](../self-roles/) — real-time collaborative state where every member mutates a shared canvas in view of every other member. Where a pattern appears in multiple samples, this doc names it briefly and links to the canonical source instead of restating; that keeps the focus on what's unique here.

> **Standard Root app fork procedure and shared lib helpers** are in [../AGENTS.md](../AGENTS.md). What follows is specific to forking *this* sample.

## Demonstrates

- **Real-time collaborative state via per-action broadcasts.** Each placement fires a `PixelPlaced` event to the `"all"` audience. No coalescing — the per-pixel "I see your contribution land instantly" feel is the whole point. Per-user cooldown caps the global broadcast rate.
- **Shared mutable canvas as a single state blob (KV).** The data model is one shared object every member mutates, not per-record CRUD. Compare `leveling-leaderboard` (SQLite for indexed top-N queries) and `self-roles` (KV for a small admin-curated config). pixel-canvas is the third tool-choice example: KV for a community-wide blob that's read on mount and mutated frequently.
- **Atomic check-then-place per-user cooldown.** Synchronous claim of the cooldown slot before any `await`, with rollback on KV failure. Defends against same-user TOCTOU under N parallel `PlacePixel` RPCs from one client. See [Cooldown: in-memory map + atomic check-then-place](#cooldown-in-memory-map--atomic-check-then-place).
- **Module-scoped serialization lock for multi-writer races.** A Promise-chain lock (`canvasWriteLock`) serializes all canvas KV writes so different-user placements compose against the latest state instead of last-write-wins dropping pixels.
- **Cooldown as a member-facing UX element.** The cooldown countdown is visible in the action panel, the Place button shows "Wait Ns" while it's active, and the palette dims during cooldown. Server-side enforcement is the source of truth (atomic check-then-place); the client UI mirrors it for tactile feedback. Compare `leveling-leaderboard`'s cooldown which was an invisible-to-members rate limit.
- **Two-step placement flow (tap-to-preview → tap-to-confirm).** Mobile-first design pattern that replaces hover-only interactions. The action panel surfaces preview state, provenance, cooldown, and the Place button in a persistent UI element. Same UX desktop and mobile.
- **Mobile-first layout.** Canvas cells size to fit viewport (down to ~10px on a 320px-wide phone). Touch-target swatches at 32×32px. Horizontally-scrolling palette strip when 16 swatches don't fit. `touch-action: manipulation` and `-webkit-tap-highlight-color: transparent` for clean tap behavior.
- **Adaptive-ceremony destructive action.** The admin Settings "Reset canvas" section combines size selection and clear into a single destructive operation, scaling friction to consequence: an empty canvas commits size changes immediately (nothing to lose), a populated canvas requires the type-name-to-confirm pattern (`reset canvas`) to enable the action button. The button label flips between "Reset to N×N" (size changed) and "Clear canvas" (size unchanged) so the click target tells the admin exactly what's about to happen.
- **Wire-format efficiency for high-frequency broadcasts.** `uint32 palette_index` instead of hex string saves ~1/N of every fanout byte; the `except: client` audience filter on `PixelPlaced` removes the redundant placer-echo.
- **Commit-but-reported-failure recovery.** Three-layer defense (`refreshCacheFromKv`, placement-side commit detection on the unique `(color, userId, placedAt)` triple, and a 30-second background refresh timer) so a quietly-committed write that the SDK reported as failed doesn't corrupt KV on the next composing write.
- **Reused patterns** — admin gating via `globalSettings.general.admins`, debounced auto-save in admin Settings, push-view shell with gear-icon header, ErrorBoundary + ReportClientError telemetry funnel, theme tokens, the section-label / sub-section conventions from the design system.

## Does NOT demonstrate

- Pixel-protection modes (own-only, time-protected). r/place free-for-all is the model. A fork can add protection rules using the existing `placedAt` and `userId` per-pixel metadata.
- Custom palette. 16 colors hardcoded server-side. Sent to the client via `GetCanvas.palette`. The palette is not refreshable post-mount. A fork that lets admins edit the palette would need a `PaletteChanged` broadcast and a corresponding subscriber in `CanvasContext` that updates `palette` and re-runs the selectedColor-still-in-palette guard in `HomeView`.
- Live cursors / presence ("see other members' cursors hovering"). Doable but adds a per-user cursor-broadcast at higher frequency; out of scope.
- Canvas history / replay. Storing per-pixel timeseries is meaningfully more storage; not in this sample.
- Per-channel canvases. The canvas is shared across the whole community. A fork could shard by `channelId` and serve one blob per channel.
- Non-square canvases. Width and height are equal (`canvasSize` is one number). A fork could split into separate dimensions.
- HTML5 `<canvas>` rendering. Uses CSS grid for accessibility + simplicity. A fork moving to `<canvas>` would scale better at 256×256+; see [Why CSS grid (not HTML5 `<canvas>`)](#why-css-grid-not-html5-canvas) for the upgrade path.

## Adapt — sample-specific shapes

These files are shaped for pixel-canvas's specific data, but the **shape** is the lesson. Each row teaches a generalized pattern that transfers to apps with similar shape:

| File | What to change |
|---|---|
| `server/src/canvasStore.ts` | The canvas + cooldown shape is specific. Keep the (in-memory cache + KV blob + per-user-cooldown Map) pattern, the module-scoped Promise-chain serialization lock, the synchronous-claim-then-rollback cooldown defense, and the `refreshCacheFromKv` + commit-detection recovery pattern. |
| `server/src/appSettingsStore.ts` | Replace `AppSettings` shape with your config. Keep the cache-invalidate-on-write pattern. |
| `server/src/pixelCanvasService.ts` | Your RPCs. Keep `requireAdmin`, the broadcast helpers, the validation pass on writes, the rate-limited `reportClientError`, and the background sweep `setInterval`s with `unref()`. |
| `client/src/contexts/CanvasContext.tsx` | Your client-side state container. Keep the load-on-mount + broadcast-subscription shape. |
| `client/src/views/{HomeView,Settings}.tsx` | Your views. Keep the auto-save wiring, the AdminOnly defence, the cell-size-on-resize recompute pattern, and the empty/loading/error states. |

Pixel-canvas uses `lucide-react` directly per-import (`import { Settings } from "lucide-react"`) instead of a central `Icon` wrapper, and adds a `NumberInput` primitive and a `relativeTime.ts` helper alongside the universal client primitives. See [Icons](#icons) for the rationale and fork-swap pattern.

## Replace — pure pixel-canvas concerns

These are domain-specific to pixel-canvas — your fork replaces them entirely:

- `networking/src/pixel_canvas_service.proto` (your proto)
- `client/src/components/{PixelGrid,ColorPalette,ActionPanel}.tsx` (your interactive surface)

## Sample-specific fork notes

Beyond the [standard fork procedure](../AGENTS.md#standard-root-app-fork-procedure):

- **Step 3 (manifest):** the sample omits the `permissions` block entirely (equivalent to `"permissions": { "community": {} }`). The app reads/writes its own KV store, broadcasts to its own iframe audience, and uses `globalSettings` for admin gating — none of which require community-level grants. Smaller permission footprint than `leveling-leaderboard` (which needs `fullControl` for the channel tree) or `self-roles` (which needs `fullControl` to assign arbitrary community roles). Keep this footprint unless your fork needs to touch community-side resources.
- **Step 4 (proto):** keep the per-action-broadcast pattern with `except: client` for the placer-echo savings. If your wire format has high-frequency repeated values (palette indices, enum tags), keep the varint-friendly `uint32` encoding pattern — see [Wire format: palette-index encoding](#wire-format-palette-index-encoding). Use a lightweight `GetAmIAdmin` RPC (1-byte response) so the `AdminsChanged` re-fetch doesn't drag the full canvas snapshot down with it.
- **Step 5 (server-side):** keep the in-memory cache + KV blob + write-through pattern in stores, the module-scoped Promise-chain serialization lock for multi-writer races, the synchronous-claim-then-rollback cooldown defense (no `await` between the cooldown check and the cooldown set), and the `refreshCacheFromKv` + commit-detection recovery for post-commit RPC failures. Background sweep timers (`errorReportBuckets`, `cooldown`) should `unref()` so they don't keep the Node process alive on shutdown.
- **Step 6 (client):** keep the action-panel-replaces-hover pattern, the two-step preview→confirm flow, and the cell-size-on-resize recompute. Components that take icons should expose them as `icon: ReactNode` props (like `EmptyState` and `QueryError` do) so a fork swapping icon library only changes call-site imports.
- **Step 7 (docs):** Update this AGENTS.md — replace the implementation-patterns body wholesale; align Demonstrates / Does NOT demonstrate / Adapt / Replace tables to what your fork keeps and changes.
- **Step 8 (verify invariants):** verify the cooldown and serialization invariants hold in your domain — fan out N parallel mutations from one user (cooldown blocks all but one) and from N distinct users (no state drops under contention). Run the server through one full cycle (mutate → broadcast → admin reset → cache-refresh recovery) before considering the fork complete.

## Implementation patterns

### Storage: KV with sparse pixel map

```ts
type CanvasState = {
  width: number;
  height: number;
  pixels: Record<string, PixelData>;  // key: "x,y", absent = empty cell
};
```

Pixels are stored as a sparse map keyed by `"${x},${y}"`. Cleared or never-touched cells are absent and render client-side as a neutral background. A maxed-out 64×64 fully painted canvas is ~320 KB serialized — comfortably within KV's small-blob zone, but at the larger end. Forks pushing to 128×128+ should consider chunking the canvas into multiple KV entries (e.g., one per 32×32 quadrant).

In-memory cache + write-through: `readCanvas()` returns the live cache reference for hot-path reads. Every write goes through `placePixelIfCooldownElapsed` which mutates the cache and writes the new blob to KV in the same call.

No SQLite. The canvas is community-wide singleton state, not a relational/list shape — KV is the right tool for "one shared blob, read on mount, frequent mutations" exactly the way SQLite is the right tool for `leveling-leaderboard`'s indexed top-N queries.

The other storage piece: per-user cooldown (`Map<UserGuid, number>`) is in-memory only, lost on restart by design. The trade-off (one free placement per user post-restart) is documented as acceptable for a sample. A fork that wants persistence can write timestamps to KV at the cost of one extra write per placement.

### Cooldown: in-memory map + atomic check-then-place

```ts
const cooldown = new Map<UserGuid, number>();  // userId → lastPlacedAtMs

async function placePixelIfCooldownElapsed(userId, x, y, color, cooldownMs, now) {
  const last = cooldown.get(userId) ?? 0;
  if (now - last < cooldownMs) return undefined;  // signal cooldown
  cooldown.set(userId, now);                       // CLAIM the slot synchronously
  try {
    return await serializeCanvasWrite(async () => {
      // ... build next cache, write KV, commit cache
    });
  } catch (err) {
    cooldown.set(userId, /* previous */);          // rollback on KV failure
    throw err;
  }
}
```

Two distinct races, two specific defenses:

1. **Same-user TOCTOU on cooldown.** A naive `read → check → await write → set cooldown` lets a second concurrent request from the same user pass the check during the first one's `await`, because the `cooldown.set` hasn't fired yet. Fan out N parallel `PlacePixel` RPCs from one client and you'd bypass cooldown entirely. Defense: claim the cooldown slot **synchronously** (before any `await`), with a rollback if the subsequent KV write fails. JS's single-threaded event loop makes the synchronous claim work — no other handler can run between the `cooldown.get` check and the `cooldown.set` claim because no `await` separates them.

2. **Different-user blob race.** Two placements from distinct users each read `cache = C0`, build `next` values that both derive from `C0` (each missing the other's pixel), and write them sequentially. Last-write-wins drops one pixel from KV — even though both placers (and all connected clients) saw the broadcast. The missing pixel resurfaces as "vanished" on the next refresh / server restart. Defense: a module-scoped Promise chain (`canvasWriteLock` in `canvasStore`) serializes all canvas KV writes. The work running under the lock re-reads `cache` after any prior write has committed, so each placement / clear composes against the latest state.

Different from `leveling-leaderboard`'s atomic SQL pattern — that one was protecting against multi-statement races inside a SQL transaction, where the database does the serialization. Here we don't have a transactional KV, so the serialization is in-process. The single-process assumption is documented in [Known production limits](#known-production-limits); a multi-process deployment would need a real distributed lock (or KV-level CAS).

Per-user cooldown is in-memory only. Lost on restart. Acceptable trade-off: at restart, every user gets one "free" placement before their cooldown re-establishes. Persisting to KV would add a write per placement; not worth the cost.

#### Commit-but-reported-failure recovery

`writeValue` can complete the storage commit and have the SDK report failure on the response (timeout post-commit). KV holds the new state; the in-memory `cache` still holds the pre-write state. Without intervention, the next serialized write would compose against stale `cache` and overwrite KV with the older snapshot.

Defense, in three layers:

1. **`refreshCacheFromKv`** runs inside the failure path of every serialized write. The next queued work picks up authoritative state instead of composing against stale local cache.
2. **Placement-side commit detection.** `placePixelIfCooldownElapsed` doesn't just refresh — it then checks whether the refreshed cache contains a pixel matching the exact `(color, userId, placedAt)` triple it tried to write. If yes, the storage layer accepted the write; treat as success. The synchronous cooldown claim earlier in the same function makes the triple unique enough that no concurrent request could match it. Without this detection, a quietly-committed write would still throw to the RPC, suppressing the broadcast and leaving every connected client showing stale pixels until their next GetCanvas.
3. **`clearCanvas`** symmetrizes the same trick: refresh, check that pixels is empty AND dimensions match what we tried to write, return success if so.

If `refreshCacheFromKv` itself exhausts retries, `cacheNeedsRefresh` is set; the next queued write retries the refresh once more and aborts the operation if it still can't recover. Better to fail one placement loudly than to silently corrupt KV by writing back stale state. A 30-second background timer also retries the refresh while the flag is set, so an idle server (no placements, no clears) eventually catches up without needing a write to fire first.

### Broadcasts: per-pixel, no coalescing

The `PixelPlaced` event fires to the `"all"` audience for every successful placement, with `except: client` (the placer). The placer already has authoritative state from the direct `PlacePixel` response and applies it locally via `applyOwnPlacement` — echoing the broadcast back to them is dead weight on the wire (1/N of every placement's fanout). The trade-off: a lost direct response leaves the placer with no recovery path; they'd manually retry, hit `COOLDOWN_NOT_ELAPSED` (the original placement DID commit and started the cooldown), and wait it out. Tail case for a real network blip; the per-placement wire savings are worth it for a sample teaching efficient broadcast audiences.

Compare `leveling-leaderboard`'s `LeaderboardUpdated` which is coalesced 500ms because chat-driven XP can spike to dozens of changes per second. Pixel placements are naturally rate-limited per-user by the cooldown; the coalescing pressure isn't there. The "I see your contribution land instantly" UX depends on each pixel being its own event.

Rate ceiling: with cooldown C seconds and N active painters, max global rate is N/C events/sec. Default C=30s, N=100 → 3.3 events/sec. Comfortable. At N=1000, 33 events/sec. Higher but still fine at "all" audience. For N≥10K, see [Known production limits](#known-production-limits).

#### Wire format: palette-index encoding

Color crosses the wire as a `uint32 palette_index` (varint, 1 byte for our 16-color palette) rather than a hex string (~9 bytes including proto framing). At max community traffic (1k painters at 30s cooldown ≈ 33 events/sec), that's ~250 KB/sec of redundant color-string bytes removed from the global fanout. The same indexing applies to `PixelData` in `GetCanvas` — a fully-painted 64×64 snapshot saves ~28 KB on the wire.

Server-internal storage stays as canonical hex (KV blob format). Decoupling storage from the wire format means a future palette mutation can't invalidate stored history; encoding/decoding happens at the wire boundary in `pixelCanvasService.ts`. Forks that allow runtime palette mutation need a `PaletteChanged` broadcast and a re-render pass on existing pixels.

Orphan handling — a stored hex no longer in `PALETTE` (e.g., post-deploy palette reorder) — is **log + skip on the encode path** (server) and **log + skip on the decode path** (client). Symmetric: a drifted entry disappears from the canvas rather than rendering as a misleading fake-white pixel with the original placer's name. Users can re-paint the cell. The fail-loud-by-skipping policy makes the drift visible in operator logs instead of silently absorbing it.

#### Other broadcasts

| Event | Audience | Payload |
|---|---|---|
| `PixelPlaced` | `"all"`, `except: client` | Single pixel placement (`x`, `y`, palette index, placer, timestamp). Fires per successful placement. |
| `CanvasCleared` | `"all"` | New dimensions. Fires on admin Clear, and as a side effect of admin canvas-size change. |
| `SettingsChanged` | `"all"` | Cooldown / size payload, public. |
| `AdminsChanged` | `"all"` | Empty signal — clients respond by firing the lightweight `GetAmIAdmin` RPC (1-byte response) instead of refetching the full `GetCanvas` snapshot. Refetching a ~200 KB pixels blob to update a single boolean every time `globalSettings.general.admins` flapped was the dominant wire-efficiency miss before that RPC existed. |

All four broadcasts use the `"all"` audience because nothing in the payload is admin-only. Compare `leveling-leaderboard`'s `SettingsUpdated` which is admin-only (it carries XP-eligible user/role IDs). `PixelPlaced` narrows further to `except: client` for the placer-echo savings noted above.

### Client error telemetry: `ReportClientError`

Same shape as `leveling-leaderboard` and `self-roles`: a top-level `ErrorBoundary` in `App.tsx` catches React render errors and POSTs them through the `ReportClientError` RPC, which logs structured fields (label, message, stack, userAgent) on the server. Per-caller rate limit (30 reports per 60s window) prevents a render-error storm from flooding the log; once a user hits the cap, further drops are noted with a single `loggedDrop` warning until their window resets.

The point of shipping this in a sample is to set the expectation that production Root apps log client crashes somewhere centralized — `console.error` alone is invisible to the operator. A fork would replace the structured-log sink with whatever observability backend the team uses (Sentry, Datadog, etc.) but should keep the rate-limited boundary.

### Icons

Icons come from `lucide-react` — one library, ~1500 glyphs, tree-shaken per-import. Components render lucide icons directly: `import { Settings } from "lucide-react"; <Settings size={20} />`. No central `Icon` wrapper, no `icons.json` snapshot.

`apps/themes` remains the canonical "look like native Root chrome" reference for anyone who wants strict identity with Root's own UI surfaces. Sample apps standardize on `lucide-react` for breadth (lucide covers app-shell vocabulary like `LayoutDashboard`, `BarChart3`, `Shield` that the curated DevKit set was never designed for) and a single icon API across the family.

When forking, swap `import { X } from "lucide-react"` per call site and pass the JSX element to any consuming component (`EmptyState`, `QueryError`) — those keep an `icon: ReactNode` prop so a fork that prefers a different library only changes the imports.

### Background sweep timers

Two `setInterval` sweeps in `pixelCanvasService.ts`:

- `errorReportBuckets` — evicts rate-limit windows older than 60s every 5min so the per-user bucket map doesn't grow unbounded with one-shot members.
- `cooldown` (via `sweepStaleCooldowns`) — evicts cooldown entries older than 2× the maximum allowed cooldown (10min) every 5min. Once a user's last placement is past `COOLDOWN_SECONDS_MAX × 2`, their cooldown is definitely elapsed under any setting and removing the entry is observably equivalent to leaving it.

Both sweeps `unref()` so they don't keep the Node process alive on shutdown. Forks that add similar in-memory caches keyed by a long-tail population (e.g., per-user state) should follow the same pattern.

### Why CSS grid (not HTML5 `<canvas>`)

`PixelGrid` renders one `<button>` per cell in a CSS grid. At 32×32 (1,024 cells) and 64×64 (4,096), DOM performance is fine. Per-cell click handlers, hover states, and ARIA attributes work for free without hit-testing math.

The trade-off: `<canvas>` would handle 256×256+ canvases better. For this sample's max of 64×64, CSS grid wins on simplicity. A fork moving to larger sizes would:

1. Replace the button-per-cell with a single `<canvas>` element
2. Implement hit-testing in `onClick` via `e.clientX/Y` → grid coords
3. Use `requestAnimationFrame` to batch pixel-paint operations rather than re-render React on every broadcast
4. Lose per-cell ARIA — accessibility falls to a separate "list of placed pixels" table

Worth flagging because the upgrade path is non-trivial.

### Two-step placement (tap-to-preview, tap-to-confirm)

The placement model:

```
1. User clicks/taps a cell.
   → Selection state updates. Cell renders with brand-primary inset ring.
   → ActionPanel shows: cell coords, swatch preview of selected color,
     provenance ("placed by @alice, 3 min ago" or "empty"), Place button.

2. User clicks/taps Place.
   → PlacePixel RPC fires.
   → On success: server broadcasts to "all" (including us); CanvasContext
     applies the pixel. Selection clears.
   → On error: error banner above the action panel. Selection persists.
```

Why two-step: the canvas is dense (32×32 on a phone = ~10px cells). Single-tap placement would mean any mis-tap is a wasted cooldown — the cooldown isn't a safety net then, it's a punishment. Two-step lets the user adjust before committing, plus surfaces all the per-cell info that hover-tooltips can't on touch devices.

Same UX desktop and mobile. The desktop user gives up one click for consistency; the mobile user gets accurate placement + accessible info. r/place ships with the same model.

### Action-panel-replaces-hover

The action panel below the canvas is the primary "what info would be in a hover tooltip" surface. On desktop in many UIs you'd hover a cell to see "placed by @alice, 3 min ago"; that pattern doesn't work on touch. The panel surfaces the same info in a persistent UI element that's visible on every input device.

State machine driven by three inputs (selection, cooldown remaining, existing pixel):

| Selection | Cooldown | Existing pixel | Panel content |
|---|---|---|---|
| none | inactive | — | "Tap a cell to choose where to place a pixel" |
| none | active | — | "Next placement in 23s" countdown |
| present | inactive | empty | "(3, 7) — empty • Place" (button enabled) |
| present | inactive | placed | "(3, 7) — placed 3 min ago • Place" (button enabled, will overwrite) |
| present | active | any | "(3, 7) — ... • Wait 12s" (button disabled with countdown) |

This is a generally useful pattern for any Root sample that has cell-/item-level interactions; replaces hover-tooltips with a persistent info surface.

### Cooldown clock: local 250ms tick, stops at zero

The action panel's countdown is updated by a 250ms `setInterval` in `HomeView`. The interval is created when `cooldownRemainingMs > 0` and torn down when it hits zero — no perpetual idle timer. The interval body just bumps a tick counter to force re-render; the actual countdown calc reads `Date.now() - myLastPlacedAt` against `cooldownSeconds * 1000`. We don't try to be clever with `setTimeout` chains — the interval is simple, and the ~250ms granularity is plenty for a seconds-resolution UI label.

### Mobile-first layout decisions

- Canvas cells size to `min(viewport - 32, 600)` / `width`. Recomputes on `window.resize`. At 320px-wide phones with a 32×32 canvas, cells are ~9px — small but workable because the two-step placement model compensates.
- Color palette is `overflow-x: auto` with `scroll-snap-type: x mandatory`. 16 swatches at 32×32 + gap doesn't fit on a 320px screen; it scrolls horizontally with snap-on-swipe.
- Action panel and palette anchor their width to the canvas's actual rendered pixel width (`cellSize × cells`) via the `--canvas-width` CSS variable HomeView sets on its container. Avoids the layout reading misaligned when the floored cellSize leaves the canvas narrower than a fixed `600px` cap.
- `touch-action: manipulation` on cells disables the browser's default double-tap zoom that would otherwise eat fast tapping.
- `-webkit-tap-highlight-color: transparent` on cells. We render our own selected-state ring; the default gray flash on iOS would conflict.
- Settings sections stack naturally on narrow screens via the parent's column flex layout — no narrow-screen media query needed because the unified Reset section's content is column-stacked at every width.

### Auto-save in Settings

`useDebouncedMutation` from the shared lib. Cooldown changes auto-save with a short debounce; the queue coalesces rapid edits into a single `UpdateSettings` RPC. Canvas size lives outside the auto-save flow — it's part of the destructive Reset operation below, where the size button only pre-selects until the admin commits via the Reset button.

### Destructive Reset Canvas section

A single section in admin Settings handles both "wipe all pixels" and "change canvas size" because they share the same destructive consequence — pixels can't survive a dimension change, so size is naturally a parameter of clearing. The button label flips between **"Reset to N×N"** (size changed) and **"Clear canvas"** (size unchanged) so the click target tells the admin exactly what's about to happen.

Adaptive ceremony scales friction to consequence:

- **Empty canvas:** clicking a size button commits immediately. Type-to-confirm is hidden; the button is hidden. There's nothing to destroy, so the ceremony would be theater.
- **Populated canvas:** clicking a size button only pre-selects it. The admin types `reset canvas` to enable the action button, then clicks to commit.

The dividing line ("does anything actually get destroyed?") is a clean axis. Earlier iterations split this into two sections — a separate "Clear canvas" with type-name-to-confirm and a separate "Resize" with no confirmation — but two ceremonies for what is essentially the same destructive operation read as inconsistent (the resize path appeared to hide the consequence vs. the clear path).

The type-name-to-confirm phrase is `"reset canvas"`. Comparison is strict equality against the constant — same shape `leveling-leaderboard` uses for its `ResetAllXp` ceremony.

## State

| Piece | Location |
|---|---|
| Current view (`home` / `settings`) | `useState<"home" \| "settings">` in `App.tsx` |
| Canvas pixels + dimensions + my-cooldown | `CanvasContext` fed by `GetCanvas` + `PixelPlaced` + `CanvasCleared` + `SettingsChanged` + `AdminsChanged` broadcasts |
| Currently selected cell + selected color | `useState` in `HomeView` (selection is ephemeral; not persisted) |
| Settings working copy | `useState` in `Settings.tsx`, auto-saved via `useDebouncedMutation` |
| Pending Reset selection (size + confirm input) | `useState` in `Settings.tsx` |

No query cache library. Subscriptions are plain `useEffect` + SDK `.on(...)` / `.off(...)` cleanup.

## Permissions and roles

```json
{ "community": {} }
```

No community permissions required, so `root-manifest.json` omits the `permissions` block entirely (equivalent to `"permissions": { "community": {} }`). The app reads and writes its own KV store, broadcasts to its own iframe audience, and uses `globalSettings` for admin gating — none of which require community-level grants. Smaller permission footprint than `leveling-leaderboard` (which needs `fullControl` for the channel tree) or `self-roles` (which needs `fullControl` to assign arbitrary community roles).

| Role | Description |
|------|-------------|
| **App admin** | Can configure cooldown, canvas size, and clear the canvas. Configured via Root's native Global Settings UI for this app (`general.admins`). The community owner is always an admin. |
| **Member** | Can place one pixel per cooldown period. No other capabilities — placement is the entire interaction surface. |

## Limits

Server is single source of truth. Shipped via `CanvasLimits` in `GetCanvas` / `GetSettings`.

| Limit | Value |
|---|---|
| Cooldown seconds (min) | 5 |
| Cooldown seconds (max) | 300 |
| Allowed canvas sizes | 32, 48, 64 |
| Color palette | Hardcoded 16-color set (server-side `PALETTE` constant) |

## Empty / error / loading states

| Surface | Loading | Empty | Error |
|---|---|---|---|
| HomeView | `<Loader />` until canvas + first cellSize compute | Empty cells render as neutral `--rootsdk-background-tertiary` background (no separate empty-state — the canvas is always present, just unpainted) | `<QueryError onRetry />` calling `reload()` |
| Settings | `<Loader />` | n/a (always has cooldown + size) | `<QueryError onRetry />` |
| Place-pixel error | Inline error banner above the action panel; auto-clears on next cell selection | n/a | n/a |

## Known production limits

A few production concerns are intentionally not addressed here. They depend on capabilities the SDK doesn't currently expose to apps, on infrastructure choices that vary per deployment, or on product-level decisions a fork should revisit.

- **No reconnect-driven catch-up.** Same as the other DevKit samples. Broadcasts that fire during a brief outage are lost — the canvas stays stale until the next live placement or a manual refresh. When the SDK exposes a reconnect hook, wire `CanvasProvider.reload()` to it.
- **High-frequency broadcasts at scale.** A community with thousands of active painters at the minimum allowed cooldown (5 seconds — the default is 30) could see hundreds of `PixelPlaced` events per second to the `"all"` audience. Comfortable at community scale (<~1k active); for larger deployments, coalesce updates server-side (e.g. batch into 250ms ticks) and send rectangle-bounded snapshots, OR move to delta-compression. Out of scope here.
- **Per-caller command rate limit (single-user abuse defended).** The Root Platform applies a per-user command-rate ceiling (~5 commands/sec) on top of our per-user cooldown. The 5-second `COOLDOWN_SECONDS_MIN` floor sits well inside that ceiling, so a single client can't pre-emptively burn through cooldown attempts faster than the platform allows — the place RPC starts rate-limiting at the SDK layer before it ever reaches our cooldown check. **This protects against single-user abuse only.** Aggregate fan-out across many users is bounded only by the size of the active community: at 10K active members at min cooldown, the canvas blob's serialization queue sees ~2K placements/sec, and each lands as a separate `appData.set` against the same per-app KV throughput envelope. Comfortable for a sample at community scale; very large deployments would need either server-side coalescing (batch placements into 250ms ticks before writing) or a per-pixel KV layout that distributes the write load.
- **Cross-process canvas cache coherence.** The in-memory canvas cache is correct for a single-process server. Horizontal scaling would need either a shared-state store (Redis) or per-process cache invalidation pub/sub.
- **Cooldown lost on restart.** The per-user cooldown map is in-memory only. On server restart, every user gets one "free" placement before the cooldown re-establishes. Acceptable for a sample; a fork that cares can persist cooldown timestamps to KV.
- **No undo for cleared canvas.** Admin clear is irreversible. The type-name-to-confirm pattern guards against accidents but there's no recovery if the wrong canvas was cleared. Forks could write a "snapshot before clear" to a separate KV key for a one-step undo.
- **Resize partial-failure window.** `UpdateSettings` writes the canvas blob first (clear-and-resize), then the settings blob. Two KV writes can't be a single transaction; if the second write fails in the gap, the canvas is at the new dimension while the settings KV still claims the old. The next admin Settings load reads the (still-old) settings, so the UI shows the prior size. The retry path self-heals — a subsequent UpdateSettings to either dimension will reach the canvas-clear branch via the live cache. Documented in `pixelCanvasService.updateSettings` for the why-this-order; surfaced here so an admin staring at "Settings UI shows old size, canvas already at new size" has somewhere to land. Forks can add an explicit "reconcile to canvas dimensions on read" step in `loadSettings` if the window matters at their scale.
