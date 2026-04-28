import React, { useCallback, useEffect, useState } from "react";
import styles from "./App.module.css";
import { AppHeader } from "./components/AppHeader";
import { ErrorBoundary, type ErrorReport } from "./components/ErrorBoundary";
import { HomeView } from "./views/HomeView";
import { Settings } from "./views/Settings";
import { PickerProvider, usePicker } from "./contexts/PickerContext";
import { rolePickerServiceClient } from "@selfroles/gen-client";

// ============================================================================
// App shell. Single-view UX with a push-view for admin settings:
//
//   home     — AppHeader (title + gear if admin) over HomeView (the toggles).
//   settings — AppHeader (back + "Settings") over Settings (admin-only editor).
//
// A gear click pushes the settings view. The back button pops. State is a
// single `view` union — no router library needed for two screens.
//
// Boundary structure:
//   * Root ErrorBoundary wraps the Provider + shell. Catches render-time
//     crashes in setup code that would otherwise blank the whole app.
//   * Per-view ErrorBoundary wraps HomeView / Settings separately so a crash
//     in one doesn't take out the header or the other view.
//
// Generic-component wiring: ErrorBoundary, AppHeader, AdminOnly are
// app-agnostic — they take SDK-bound values as props rather than reading
// them from this app's contexts. App.tsx is where we wire them up to:
//   - this app's RPC client (rolePickerServiceClient.reportClientError)
//   - this app's state container (usePicker for amIAdmin / app title).
// Apps copying those components verbatim only need to redo this wiring.
//
// Settings hardening: if a user somehow reaches view="settings" without
// being an admin (e.g. they were demoted between renders), we fall back to
// home. The Settings component itself also uses <AdminOnly> as a defence
// in depth.
// ============================================================================

type View = "home" | "settings";

const APP_TITLE = "Self-Roles";

// Glue: route ErrorBoundary's report-error callback through this app's
// RPC client. Apps copying ErrorBoundary verbatim swap the body for their
// own service-client call.
const reportError = (r: ErrorReport): Promise<unknown> =>
  rolePickerServiceClient.reportClientError(r);

const App: React.FC = () => {
  return (
    <ErrorBoundary label="App" reportError={reportError}>
      <PickerProvider>
        <AppShell />
      </PickerProvider>
    </ErrorBoundary>
  );
};

const AppShell: React.FC = () => {
  const [view, setView] = useState<View>("home");
  const { amIAdmin } = usePicker();

  const openSettings = useCallback(() => setView("settings"), []);
  const goHome = useCallback(() => setView("home"), []);

  // Reset view to home when admin status flips off. The effectiveView
  // computation below masks the view for the current render, but the
  // underlying `view` state survives — without this effect, an admin
  // who's demoted-then-re-promoted would land back in Settings without
  // explicit navigation.
  useEffect(() => {
    if (!amIAdmin) setView("home");
  }, [amIAdmin]);

  const effectiveView: View = view === "settings" && !amIAdmin ? "home" : view;

  return (
    <div className={styles.app}>
      <AppHeader
        title={APP_TITLE}
        mode={effectiveView}
        showSettingsButton={amIAdmin}
        onOpenSettings={openSettings}
        onBack={goHome}
      />
      <main className={styles.content}>
        {effectiveView === "home" && (
          <ErrorBoundary label="HomeView" reportError={reportError}>
            <HomeView />
          </ErrorBoundary>
        )}
        {effectiveView === "settings" && (
          <ErrorBoundary label="Settings" reportError={reportError}>
            <Settings />
          </ErrorBoundary>
        )}
      </main>
    </div>
  );
};

export default App;
