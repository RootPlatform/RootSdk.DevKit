import React from "react";
import styles from "./ActionPanel.module.css";
import { Button } from "./Button";
import type { PixelInfo } from "../contexts/CanvasContext";
import { useProfiles } from "../contexts/ProfilesContext";
import { formatRelativeTime } from "../lib/relativeTime";

// ============================================================================
// ActionPanel — context-dependent "what's the next action you can take" panel
// below the canvas + palette. Replaces hover tooltips (which don't work on
// touch) by surfacing all the same info in a persistent UI element.
//
// State machine driven by three inputs:
//   - selected: a cell the user has tapped/clicked (or undefined)
//   - cooldownRemainingMs: > 0 if cooldown is still active
//   - existing pixel data at `selected` (if any)
//
// Five derived states (see DESIGN.md "Action panel state machine" for the
// table). The Place button is shown whenever a cell is selected; it's
// disabled when cooldown blocks the action, and the disabled label shows
// a live countdown. State transitions fall out of the inputs naturally —
// no separate state machine library; React's render-on-prop-change is
// sufficient because the component only owns presentation, not behavior.
//
// Provenance line: when the selected cell already has a pixel, the line
// reads "placed by @nickname, 3 min ago" once the placer's profile loads
// (cached per-userId via ProfilesContext, with live updates via the
// platform's UserProfileUpdate event). Until the profile resolves, we
// fall back to "placed 3 min ago" so the panel doesn't flicker on every
// tap. We don't show a userId — the raw GUID is meaningless to the user
// and looks like leaked debug output.
// ============================================================================

interface Props {
  selected: { x: number; y: number } | undefined;
  selectedColor: string;
  cooldownRemainingMs: number;
  existingPixel: PixelInfo | undefined;
  // Submit handler — fires when Place is pressed with cooldown clear.
  onPlace: () => void;
  // Disabled for non-interactive states (loading, error). `placing` while
  // an RPC is in flight blocks double-submit.
  placing: boolean;
}

export const ActionPanel: React.FC<Props> = ({
  selected,
  selectedColor,
  cooldownRemainingMs,
  existingPixel,
  onPlace,
  placing,
}) => {
  const { profiles } = useProfiles();
  const cooldownActive = cooldownRemainingMs > 0;
  const remainingSeconds = Math.ceil(cooldownRemainingMs / 1000);

  // No selection — communicate the next-step affordance based on
  // cooldown state.
  if (!selected) {
    return (
      <div className={styles.panel}>
        {/* aria-live="polite" + aria-atomic so AT re-announces the
            cooldown countdown when it changes. The text only changes
            once per wall-clock second (Math.ceil(ms/1000) drops to the
            next integer at 1-second boundaries) — the 250ms tick
            elsewhere only refreshes the React state, not this string —
            so AT users get one announcement per second, not 4. The
            "tap a cell" copy is also under aria-live; switching between
            the two states is itself a status change worth announcing. */}
        <div
          className={styles.text}
          aria-live="polite"
          aria-atomic="true"
        >
          {cooldownActive
            ? `Next placement in ${remainingSeconds}s`
            : "Tap a cell to choose where to place a pixel"}
        </div>
      </div>
    );
  }

  // Selection present — build the provenance line. The placer's profile
  // is requested by HomeView (when a cell is selected) so by the time we
  // render here it's typically already in the cache. If not, we render
  // the relative-time form and the line will live-update once the
  // profile resolves — same pattern leveling-leaderboard uses for top-10
  // entries.
  let provenance: string;
  if (!existingPixel) {
    provenance = "empty";
  } else {
    const nickname = profiles[existingPixel.userId]?.nickname;
    const when = formatRelativeTime(existingPixel.placedAt);
    provenance = nickname ? `placed by ${nickname}, ${when}` : `placed ${when}`;
  }

  return (
    <div className={styles.panel}>
      <div className={styles.info}>
        <div className={styles.coords}>
          <span
            className={styles.previewSwatch}
            style={{ backgroundColor: selectedColor }}
            aria-hidden="true"
          />
          <span>
            ({selected.x}, {selected.y})
          </span>
        </div>
        <div className={styles.provenance}>{provenance}</div>
      </div>
      <Button
        variant="primary"
        onClick={onPlace}
        disabled={cooldownActive || placing}
      >
        {cooldownActive
          ? `Wait ${remainingSeconds}s`
          : placing
            ? "Placing…"
            : "Place"}
      </Button>
    </div>
  );
};
