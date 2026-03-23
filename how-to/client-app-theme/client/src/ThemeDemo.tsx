// ============================================================================
// How-To: Client App Theme — Theme Detection & Events
// SDK: rootClient.theme.getTheme() — read current theme mode
//      rootClient.theme.on(ThemeUpdate) — subscribe to theme changes
//      rootClient.theme.off(ThemeUpdate) — unsubscribe
// Works in: Apps (@rootsdk/client-app)
// ============================================================================
//
// The theme is read-only — it's controlled by the Root platform, not the app.
// Only two modes exist: "light" and "dark" (no "auto" or "system").
//
// CSS variables (--rootsdk-brand-primary, --rootsdk-text-primary, etc.) are
// applied automatically to the document root by the platform. They update
// instantly when the theme changes — no event listener needed for restyling.
//
// Use the theme event for programmatic logic that depends on the mode:
//   - Swapping image assets (light logo vs dark logo)
//   - Adjusting canvas or WebGL rendering colors
//   - Configuring third-party libraries that need explicit theme values
//
// For the full design system reference (CSS variable names, component patterns,
// icons, spacing), see the Themes sample app.
//
// ============================================================================

import React, { useState, useEffect } from "react";
import {
  rootClient,
  RootThemeMode,
  RootClientThemeEvent,
} from "@rootsdk/client-app";

export function ThemeDemo() {
  // --- Read current theme on mount ---
  // getTheme() returns "light" or "dark" synchronously.
  const [theme, setTheme] = useState<RootThemeMode>(
    rootClient.theme.getTheme(),
  );

  // --- Subscribe to theme changes ---
  // The ThemeUpdate event fires when the user or platform changes the theme.
  // Use useEffect cleanup to unsubscribe and avoid memory leaks.
  useEffect(() => {
    function onThemeUpdate(newTheme: RootThemeMode) {
      setTheme(newTheme);
    }

    rootClient.theme.on(RootClientThemeEvent.ThemeUpdate, onThemeUpdate);

    return () => {
      rootClient.theme.off(RootClientThemeEvent.ThemeUpdate, onThemeUpdate);
    };
  }, []);

  // --- CSS variables are automatic ---
  // The styles below use --rootsdk-* CSS variables. These are applied by the
  // platform and update automatically when the theme changes. No event
  // listener is needed for CSS-based theming — just reference the variables.
  return (
    <div
      style={{
        padding: "16px",
        color: "var(--rootsdk-text-primary)",
        backgroundColor: "var(--rootsdk-background-primary)",
      }}
    >
      <h2>Theme: {theme}</h2>
      <p style={{ color: "var(--rootsdk-text-secondary)" }}>
        The current theme mode is <strong>{theme}</strong>. This value updates
        automatically when the platform changes the theme.
      </p>
    </div>
  );
}
