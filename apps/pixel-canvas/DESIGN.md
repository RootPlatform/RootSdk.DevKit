# pixel-canvas — Design

This document is the behavior contract and implementation guide for the `pixel-canvas` sample app.

The sample teaches a different SDK shape than [`leveling-leaderboard`](../leveling-leaderboard/DESIGN.md) and [`self-roles`](../self-roles/DESIGN.md): real-time collaborative state where every member mutates a shared canvas in view of every other member. Where a pattern appears in multiple samples, this doc names it briefly and links to the canonical source instead of restating.

---

## Adapting this sample

### Copy verbatim

| File | Purpose |
|---|---|
| `server/src/lib/{log,retry,safeBroadcast}.ts` | Structured log helper, `withRetry()`, broadcast error wrapper |
| `server/src/adminCheck.ts` | Admin gating against `globalSettings.general.admins` + community owner |
| `client/src/components/{Loader,QueryError,Button,TextInput,NumberInput,AutoSaveStatus}.tsx` | Generic UI primitives. No SDK or app-specific imports. Icons come from `lucide-react` per-import (`import { ChevronLeft, Settings } from "lucide-react"`); see [Icons](#icons). |
| `client/src/components/{ErrorBoundary,AdminOnly,AppHeader}.tsx` | App-agnostic by design — they take SDK-bound values (telemetry hook, `isAdmin`, app title) as props. Verbatim-copyable; only the wiring in `App.tsx` needs to be redone. |
| `client/src/lib/{retry,rootColorScheme,useDebouncedMutation}.ts` | Client-side retry, theme→`color-scheme` bridge, debounced auto-save hook |
| `client/src/lib/relativeTime.ts` | Tiny "3 min ago" formatter — useful in any sample that surfaces timestamps |
| `client/src/styles/globals.css` | Root theme tokens + reset |
| `client/src/index.tsx` | React entrypoint |

### Adapt

| File | What to change |
|---|---|
| `server/src/canvasStore.ts` | The canvas + cooldown shape is specific. Keep the (in-memory cache + KV blob + per-user-cooldown Map) pattern; replace the data model with yours. |
| `server/src/appSettingsStore.ts` | Replace `AppSettings` shape with your config. Keep the cache-invalidate-on-write pattern. |
| `server/src/pixelCanvasService.ts` | Your RPCs. Keep `requireAdmin`, the broadcast helpers, the validation pass on writes, the rate-limited `reportClientError`. |
| `client/src/contexts/CanvasContext.tsx` | Your client-side state container. Keep the load-on-mount + broadcast-subscription shape. |
| `client/src/views/{HomeView,Settings}.tsx` | Your views. Keep the auto-save wiring, the AdminOnly defence, the cell-size-on-resize recompute pattern. |

### Replace

These are pure pixel-canvas concerns:

- `networking/src/pixel_canvas_service.proto` (your proto)
- `client/src/components/{PixelGrid,ColorPalette,ActionPanel}.tsx` (your interactive surface)

---

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

Different from `leveling-leaderboard`'s atomic SQL pattern — that one was protecting against multi-statement races inside a SQL transaction, where the database does the serialization. Here we don't have a transactional KV, so the serialization is in-process. The single-process assumption is documented in README "Known limits"; a multi-process deployment would need a real distributed lock (or KV-level CAS).

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

Rate ceiling: with cooldown C seconds and N active painters, max global rate is N/C events/sec. Default C=30s, N=100 → 3.3 events/sec. Comfortable. At N=1000, 33 events/sec. Higher but still fine at "all" audience. For N≥10K, see Known Limits in README.

#### Wire format: palette-index encoding

Color crosses the wire as a `uint32 palette_index` (varint, 1 byte for our 16-color palette) rather than a hex string (~9 bytes including proto framing). At max community traffic (1k painters at 30s cooldown ≈ 33 events/sec), that's ~250 KB/sec of redundant color-string bytes removed from the global fanout. The same indexing applies to `PixelData` in `GetCanvas` — a fully-painted 64×64 snapshot saves ~28 KB on the wire.

Server-internal storage stays as canonical hex (KV blob format). Decoupling storage from the wire format means a future palette mutation can't invalidate stored history; encoding/decoding happens at the wire boundary in `pixelCanvasService.ts`. Forks that allow runtime palette mutation need a `PaletteChanged` broadcast and a re-render pass on existing pixels.

Orphan handling — a stored hex no longer in `PALETTE` (e.g., post-deploy palette reorder) — is **log + skip on the encode path** (server) and **log + skip on the decode path** (client). Symmetric: a drifted entry disappears from the canvas rather than rendering as a misleading fake-white pixel with the original placer's name. Users can re-paint the cell. The fail-loud-by-skipping policy makes the drift visible in operator logs instead of silently absorbing it.

#### Other broadcasts

- `CanvasCleared`: fires on admin Clear, and as a side effect of admin canvas-size change. Carries new dimensions.
- `SettingsChanged`: cooldown / size payload, public.
- `AdminsChanged`: empty signal — clients respond by firing the lightweight `GetAmIAdmin` RPC (1-byte response) instead of refetching the full `GetCanvas` snapshot. Refetching a ~200 KB pixels blob to update a single boolean every time `globalSettings.general.admins` flapped was the dominant wire-efficiency miss before that RPC existed.

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

### Admin gating

Same pattern as `leveling-leaderboard` and `self-roles`. `adminCheck.ts` is copied verbatim. Community owner is implicitly an admin (defence in depth). `AdminsChanged` broadcast fires whenever the role/member selection in `globalSettings.general.admins` changes; clients re-fetch `GetCanvas` to refresh `amIAdmin`.

### Auto-save in Settings

`useDebouncedMutation` from the shared lib. Cooldown changes auto-save with a short debounce; the queue coalesces rapid edits into a single `UpdateSettings` RPC. Canvas size lives outside the auto-save flow — it's part of the destructive Reset operation below, where the size button only pre-selects until the admin commits via the Reset button.

### Destructive Reset Canvas section

A single section in admin Settings handles both "wipe all pixels" and "change canvas size" because they share the same destructive consequence — pixels can't survive a dimension change, so size is naturally a parameter of clearing. The button label flips between **"Reset to N×N"** (size changed) and **"Clear canvas"** (size unchanged) so the click target tells the admin exactly what's about to happen.

Adaptive ceremony scales friction to consequence:

- **Empty canvas:** clicking a size button commits immediately. Type-to-confirm is hidden; the button is hidden. There's nothing to destroy, so the ceremony would be theater.
- **Populated canvas:** clicking a size button only pre-selects it. The admin types `reset canvas` to enable the action button, then clicks to commit.

The dividing line ("does anything actually get destroyed?") is a clean axis. Earlier iterations split this into two sections — a separate "Clear canvas" with type-name-to-confirm and a separate "Resize" with no confirmation — but two ceremonies for what is essentially the same destructive operation read as inconsistent (the resize path appeared to hide the consequence vs. the clear path).

The type-name-to-confirm phrase is `"reset canvas"`. Comparison is strict equality against the constant — same shape `leveling-leaderboard` uses for its `ResetAllXp` ceremony.

---

## State

| Piece | Location |
|---|---|
| Current view (`home` / `settings`) | `useState<"home" \| "settings">` in `App.tsx` |
| Canvas pixels + dimensions + my-cooldown | `CanvasContext` fed by `GetCanvas` + `PixelPlaced` + `CanvasCleared` + `SettingsChanged` + `AdminsChanged` broadcasts |
| Currently selected cell + selected color | `useState` in `HomeView` (selection is ephemeral; not persisted) |
| Settings working copy | `useState` in `Settings.tsx`, auto-saved via `useDebouncedMutation` |
| Pending Reset selection (size + confirm input) | `useState` in `Settings.tsx` |

No query cache library. Subscriptions are plain `useEffect` + SDK `.on(...)` / `.off(...)` cleanup.

---

## Permissions and roles

```json
{ "community": {} }
```

No community permissions. The app's surface is entirely self-contained: KV reads/writes, broadcasts to its own iframe audience, globalSettings reads for admin gating.

| Role | Description |
|------|-------------|
| **App admin** | Can configure cooldown, canvas size, and clear the canvas. Configured via Root's native Global Settings UI for this app (`general.admins`). The community owner is always an admin. |
| **Member** | Can place one pixel per cooldown period. No other capabilities — placement is the entire interaction surface. |

---

## Limits

Server is single source of truth. Shipped via `CanvasLimits` in `GetCanvas` / `GetSettings`.

| Limit | Value |
|---|---|
| Cooldown seconds (min) | 5 |
| Cooldown seconds (max) | 300 |
| Allowed canvas sizes | 32, 48, 64 |
| Color palette | Hardcoded 16-color set (server-side `PALETTE` constant) |

---

## Empty / error / loading states

| Surface | Loading | Empty | Error |
|---|---|---|---|
| HomeView | `<Loader />` until canvas + first cellSize compute | Empty cells render as neutral `--rootsdk-background-tertiary` background (no separate empty-state — the canvas is always present, just unpainted) | `<QueryError onRetry />` calling `reload()` |
| Settings | `<Loader />` | n/a (always has cooldown + size) | `<QueryError onRetry />` |
| Place-pixel error | Inline error banner above the action panel; auto-clears on next cell selection | n/a | n/a |

---

## Out of scope (mirrors README)

- Pixel-protection modes (own-only, time-protected)
- Custom palette — the palette is sent once via `GetCanvas.palette` and
  is not refreshable post-mount. A fork that lets admins edit the palette
  would need a `PaletteChanged` broadcast and a corresponding subscriber
  in `CanvasContext` that updates `palette` and re-runs the
  selectedColor-still-in-palette guard in `HomeView`.
- Live cursors / presence
- Canvas history / replay
- Per-channel canvases
- Non-square canvases
- HTML5 `<canvas>` rendering for very large canvases

For each, see the corresponding section of the README for fork-extension notes.
