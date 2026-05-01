// ============================================================================
// Recipe: Audio Bundled SFX — Client
// Composes: (none, actually — this recipe is client-pure)
// ============================================================================
//
// Two buttons, each plays one of the bundled WAV files. A status line
// shows the most recent cue so the demo is visible even if the user has
// system audio off (or is reviewing the recipe in a meeting where they
// can't sanity-check by ear).
//
// The whole "lesson" is the two `import` lines below + `play(url)` in
// the click handler — the rest is React UI scaffolding.
// ============================================================================

import React, { useState } from "react";

// Vite asset imports. At dev time these resolve to raw URLs under /src;
// at build time they're hashed and fingerprinted into the bundle. The
// app code is identical in both modes — `clickUrl` is a string, that's
// all the call sites need to know.
import clickUrl from "./assets/click.wav";
import dingUrl from "./assets/ding.wav";
import { play } from "./audio";

interface Cue {
  label: string;
  url: string;
}

const CUES: Cue[] = [
  { label: "Click", url: clickUrl },
  { label: "Ding", url: dingUrl },
];

export const App: React.FC = () => {
  const [lastPlayed, setLastPlayed] = useState<string | undefined>(undefined);
  const [error, setError] = useState<string | undefined>(undefined);

  const handleCue = async (cue: Cue): Promise<void> => {
    setError(undefined);
    try {
      await play(cue.url);
      setLastPlayed(`${cue.label} @ ${new Date().toLocaleTimeString()}`);
    } catch (err) {
      // Decode failure or fetch failure. Surface to the user so the
      // demo doesn't silently appear broken.
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  return (
    <main style={pageStyle}>
      <h1 style={{ fontSize: 24, margin: 0 }}>Audio Bundled SFX</h1>
      <p style={metaStyle}>
        Two short WAV files bundled with the client. Click to play.
      </p>

      <div style={buttonRowStyle}>
        {CUES.map((cue) => (
          <button
            key={cue.label}
            onClick={() => void handleCue(cue)}
            style={buttonStyle}
          >
            {cue.label}
          </button>
        ))}
      </div>

      {lastPlayed && !error && (
        <p style={statusStyle}>last played: {lastPlayed}</p>
      )}

      {error && <p style={errorStyle}>error: {error}</p>}
    </main>
  );
};

// All colors come from Root's design tokens — `--rootsdk-*` CSS custom
// properties that the host injects on `document.documentElement` and
// updates automatically when the user toggles light/dark theme. Hardcoded
// hex values would lock the recipe into one theme and look wrong on the
// other. Token reference:
//   docs/llms/app-docs/develop/client/design-system-reference.md

const pageStyle: React.CSSProperties = {
  fontFamily: "system-ui, -apple-system, sans-serif",
  padding: 24,
  maxWidth: 640,
  margin: "0 auto",
  color: "var(--rootsdk-text-primary)",
};

const metaStyle: React.CSSProperties = {
  color: "var(--rootsdk-text-secondary)",
  fontSize: 14,
  marginTop: 8,
};

const buttonRowStyle: React.CSSProperties = {
  display: "flex",
  gap: 12,
  marginTop: 20,
};

const buttonStyle: React.CSSProperties = {
  padding: "10px 20px",
  borderRadius: 8,
  border: "1px solid var(--rootsdk-border)",
  background: "var(--rootsdk-highlight-light)",
  color: "var(--rootsdk-text-primary)",
  cursor: "pointer",
  fontSize: 14,
  minWidth: 100,
};

const statusStyle: React.CSSProperties = {
  marginTop: 20,
  fontSize: 13,
  color: "var(--rootsdk-text-tertiary)",
  fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
};

const errorStyle: React.CSSProperties = {
  marginTop: 20,
  fontSize: 13,
  color: "var(--rootsdk-error)",
};
