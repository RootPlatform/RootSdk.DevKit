// ============================================================================
// How-To: Client App Lifecycle — Restart
// SDK: rootClient.lifecycle.restart(relativeUrl?)
// Works in: Apps (@rootsdk/client-app)
// ============================================================================
//
// rootClient.lifecycle.restart() performs a full page reload. This is NOT a
// React re-mount — it reloads all JS bundles, resets all application state,
// and reinitializes the app from scratch (equivalent to window.location.reload).
//
// The optional relativeUrl parameter navigates to a different page within the
// app instead of reloading the current one (equivalent to setting
// window.location.href).
//
// Use cases:
//   - After applying configuration changes that require a fresh start
//   - Error recovery when the app enters an unrecoverable state
//   - Deep-linking to a specific section of the app
//
// Platform notes:
//   - The method calls through the native bridge. If the bridge doesn't
//     support restart, the call silently no-ops (guarded with ?. chaining).
//
// ============================================================================

import React from "react";
import { rootClient } from "@rootsdk/client-app";

export function RestartPanel() {
  // --- Restart: full page reload ---
  // Reloads all JS bundles, clears all in-memory state, and reinitializes
  // React from scratch. Any unsaved state will be lost.
  function handleRestart() {
    rootClient.lifecycle.restart();
  }

  // --- Restart with navigation ---
  // Instead of reloading the current page, navigates to a relative URL
  // within the app. The app reinitializes at the new location.
  // Example: restart("/settings") loads the app's /settings route.
  function handleRestartToSettings() {
    rootClient.lifecycle.restart("/settings");
  }

  return (
    <div>
      <h2>Lifecycle — Restart</h2>

      <button onClick={handleRestart}>Restart App</button>

      <button onClick={handleRestartToSettings}>
        Restart to /settings
      </button>
    </div>
  );
}
