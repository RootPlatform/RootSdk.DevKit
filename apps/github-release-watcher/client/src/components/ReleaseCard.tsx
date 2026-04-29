import React, { useEffect, useState } from "react";
import type { Release } from "@githubreleasewatcher/gen-shared";
import styles from "./ReleaseCard.module.css";
import { formatRelativeTime } from "../lib/relativeTime";
import { stripMarkdownLite } from "../lib/markdownLite";

// ============================================================================
// ReleaseCard — one card in the home feed (and the Test preview).
//
// Layout: a colored uppercase "category" label top-left, an optional
// status pill top-right, bold title below, body excerpt, then a muted
// footer with metadata.
//
//   ┌────────────────────────────────────────────┐
//   │ V0.45.1                       [pre-release] │  ← tag (brand-color) + pill
//   │ copilot/0.45.1                              │  ← title
//   │ Changes:                                    │  ← body excerpt
//   │ • …                                         │
//   │ microsoft/vscode · 5d ago                   │  ← footer
//   │ https://github.com/microsoft/vscode/...     │
//   └────────────────────────────────────────────┘
//
// The tag in colored uppercase serves as the card's category. The release
// name (often "copilot/0.45.1" or "Bun v1.3.13") is the bold title. Repo
// and timestamp move to the muted footer because they're context, not
// identity — what makes this card distinct is the version it represents,
// so the version earns the color treatment.
//
// The release URL in the footer is a real anchor. Root's iframe hands
// `target="_blank"` clicks off to the system browser — the canonical
// pattern documented in the navigation playground. `rel="noopener
// noreferrer"` is explicit (target=_blank already implies noopener in
// modern browsers, but missing it has caused intermittent "links don't
// work" reports). `user-select: all` on the URL text means a single
// click still highlights the whole URL for keyboard/right-click copy.
//
// Live highlight: when `isNew` is true on first render, the card mounts
// with the highlight class and the 300ms pulse fades the background back
// to default.
// ============================================================================

interface Props {
  release: Release;
  // True when the card was just prepended via a ReleaseAdded broadcast.
  isNew?: boolean;
}

export const ReleaseCard: React.FC<Props> = ({ release, isNew }) => {
  const [pulsing, setPulsing] = useState(isNew ?? false);

  useEffect(() => {
    if (!pulsing) return;
    const t = setTimeout(() => setPulsing(false), 350);
    return () => clearTimeout(t);
  }, [pulsing]);

  const repoPath = `${release.owner}/${release.name}`;
  const heading = release.releaseName?.trim() || release.tagName;

  // published_at can be 0 if the upstream payload didn't include a timestamp
  // (rare). Fall back to added_at — when WE saw it — which is always set.
  const tsMs = Number(release.publishedAt) || Number(release.addedAt);
  const relTs = tsMs ? formatRelativeTime(tsMs) : "";

  // The release name is shown as the title only when it's distinct from the
  // tag — many releases use the tag as the name (or leave name empty), in
  // which case showing both reads as duplication.
  const showHeading = !!heading && heading !== release.tagName;

  const cleanedBody = release.body ? stripMarkdownLite(release.body) : "";

  const cardClass = pulsing ? `${styles.card} ${styles.pulse}` : styles.card;

  return (
    <article className={cardClass}>
      <header className={styles.header}>
        <span className={styles.tag}>{release.tagName}</span>
        {release.prerelease && (
          <span className={styles.prereleasePill}>pre-release</span>
        )}
      </header>

      {showHeading && <h3 className={styles.heading}>{heading}</h3>}

      {cleanedBody && (
        // mask-image fade clips at ~6 lines without truncating mid-character.
        <div className={styles.body}>{cleanedBody}</div>
      )}

      <footer className={styles.footer}>
        <span className={styles.metadata}>
          {repoPath}
          {relTs && <> · {relTs}</>}
        </span>
        {/* External anchor — opens the release page in the system browser
            via the iframe's target=_blank handoff. `user-select: all` keeps
            the right-click "Copy URL" behavior available too. */}
        <a
          className={styles.urlText}
          href={release.htmlUrl}
          target="_blank"
          rel="noopener noreferrer"
        >
          {release.htmlUrl}
        </a>
      </footer>
    </article>
  );
};
