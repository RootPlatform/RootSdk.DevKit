# pixel-canvas

A shared pixel grid every member of the community paints on, one cell at a time. Members place colored pixels from a fixed palette, then wait a per-user cooldown before placing again. Other members see the placement appear in real time. Anyone can overwrite anyone (r/place model). Admins curate canvas size, cooldown, and can clear the canvas. Full behavior contract and implementation patterns in [DESIGN.md](DESIGN.md).

## Coverage scope

**Demonstrates:**
- **Real-time collaborative state via per-action broadcasts.** Each placement fires a `PixelPlaced` event to the `"all"` audience. No coalescing — the per-pixel "I see your contribution land instantly" feel is the whole point. Per-user cooldown caps the global broadcast rate.
- **Shared mutable canvas as a single state blob (KV).** The data model is one shared object every member mutates, not per-record CRUD. Compare `leveling-leaderboard` (SQLite for indexed top-N queries) and `self-roles` (KV for a small admin-curated config). pixel-canvas is the third tool-choice example: KV for a community-wide blob that's read on mount and mutated frequently.
- **Cooldown as a member-facing UX element.** The cooldown countdown is visible in the action panel, the Place button shows "Wait Ns" while it's active, and the palette dims during cooldown. Server-side enforcement is the source of truth (atomic check-then-place); the client UI mirrors it for tactile feedback. Compare `leveling-leaderboard`'s cooldown which was an invisible-to-members rate limit.
- **Two-step placement flow (tap-to-preview → tap-to-confirm).** Mobile-first design pattern that replaces hover-only interactions. The action panel surfaces preview state, provenance, cooldown, and the Place button in a persistent UI element. Same UX desktop and mobile.
- **Mobile-first layout.** Canvas cells size to fit viewport (down to ~10px on a 320px-wide phone). Touch-target swatches at 32×32px. Horizontally-scrolling palette strip when 16 swatches don't fit. `touch-action: manipulation` and `-webkit-tap-highlight-color: transparent` for clean tap behavior.
- **Adaptive-ceremony destructive action.** The admin Settings "Reset canvas" section combines size selection and clear into a single destructive operation, scaling friction to consequence: an empty canvas commits size changes immediately (nothing to lose), a populated canvas requires the type-name-to-confirm pattern (`reset canvas`) to enable the action button. The button label flips between "Reset to N×N" (size changed) and "Clear canvas" (size unchanged) so the click target tells the admin exactly what's about to happen.
- **Reused patterns** — admin gating via `globalSettings.general.admins`, debounced auto-save in admin Settings, push-view shell with gear-icon header, ErrorBoundary + ReportClientError telemetry funnel, theme tokens, the section-label / sub-section conventions from the design system.

**Does NOT demonstrate:**
- Pixel-protection modes (own-only, time-protected). r/place free-for-all is the model. A fork can add protection rules using the existing `placedAt` and `userId` per-pixel metadata.
- Custom palette. 16 colors hardcoded server-side. Sent to the client via `GetCanvas.palette`. A fork can let admins edit the palette.
- Live cursors / presence ("see other members' cursors hovering"). Doable but adds a per-user cursor-broadcast at higher frequency; out of scope.
- Canvas history / replay. Storing per-pixel timeseries is meaningfully more storage; not in this sample.
- Per-channel canvases. Single community-wide canvas. A fork could shard by `channelId`.
- Non-square canvases. Width and height are equal (`canvasSize` is one number). A fork could split into separate dimensions.
- HTML5 `<canvas>` rendering. Uses CSS grid for accessibility + simplicity. A fork moving to `<canvas>` would scale better at 256×256+, see DESIGN.md for the upgrade path.

## Permissions

No community permissions required, so `root-manifest.json` omits the
`permissions` block entirely (equivalent to `"permissions": { "community": {} }`).
The app reads and writes its own KV store, broadcasts to its own iframe
audience, and uses globalSettings for admin gating — none of which
require community-level grants. Smaller permission footprint than
`leveling-leaderboard` (which needs `fullControl` for the channel tree)
or `self-roles` (which needs `fullControl` to assign arbitrary community
roles).

## Known limits

- **No reconnect-driven catch-up.** Same as the other DevKit samples. Broadcasts that fire during a brief outage are lost — the canvas stays stale until the next live placement or a manual refresh. When the SDK exposes a reconnect hook, wire `CanvasProvider.reload()` to it.
- **High-frequency broadcasts at scale.** A community with thousands of active painters at the minimum allowed cooldown (5 seconds — the default is 30) could see hundreds of `PixelPlaced` events per second to the `"all"` audience. Comfortable at community scale (<~1k active); for larger deployments, coalesce updates server-side (e.g. batch into 250ms ticks) and send rectangle-bounded snapshots, OR move to delta-compression. Out of scope here.
- **Cross-process canvas cache coherence.** The in-memory canvas cache is correct for a single-process server. Horizontal scaling would need either a shared-state store (Redis) or per-process cache invalidation pub/sub.
- **Cooldown lost on restart.** The per-user cooldown map is in-memory only. On server restart, every user gets one "free" placement before the cooldown re-establishes. Acceptable for a sample; a fork that cares can persist cooldown timestamps to KV.
- **No undo for cleared canvas.** Admin clear is irreversible. The type-name-to-confirm pattern guards against accidents but there's no recovery if the wrong canvas was cleared. Forks could write a "snapshot before clear" to a separate KV key for a one-step undo.

Use this sample as a shape reference for real-time collaborative state, per-action broadcasts, mobile-first interactive UI, and the action-panel-replaces-hover pattern. Reuse the lib helpers (`adminCheck`, `safeBroadcast`, `useDebouncedMutation`) verbatim where they fit.
