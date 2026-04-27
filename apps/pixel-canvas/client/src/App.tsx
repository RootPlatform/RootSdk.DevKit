import React, { useCallback, useState } from "react";
import styles from "./App.module.css";
import { AppHeader } from "./components/AppHeader";
import { ErrorBoundary, type ErrorReport } from "./components/ErrorBoundary";
import { HomeView } from "./views/HomeView";
import { Settings } from "./views/Settings";
import { CanvasProvider, useCanvas } from "./contexts/CanvasContext";
import { ProfilesProvider } from "./contexts/ProfilesContext";
import { pixelCanvasServiceClient } from "@pixelcanvas/gen-client";

// ============================================================================
// App shell — same push-view pattern as leveling-leaderboard / self-roles:
// home view at default; admin gear pushes Settings; back chevron pops back.
// AdminOnly + the shell's effective-view fallback both gate Settings against
// runtime amIAdmin loss.
// ============================================================================

type View = "home" | "settings";

const APP_TITLE = "Pixel Canvas";

const reportError = (r: ErrorReport): Promise<unknown> =>
  pixelCanvasServiceClient.reportClientError(r);

const App: React.FC = () => {
  return (
    <ErrorBoundary label="App" reportError={reportError}>
      <CanvasProvider>
        {/* ProfilesProvider lives inside CanvasProvider so that any
            descendant — currently ActionPanel for the placement
            provenance line — can request user profiles by ID. The
            provider does no fetching at mount; the first call to
            request(...) flips the batch timer. */}
        <ProfilesProvider>
          <AppShell />
        </ProfilesProvider>
      </CanvasProvider>
    </ErrorBoundary>
  );
};

const AppShell: React.FC = () => {
  const [view, setView] = useState<View>("home");
  const { amIAdmin } = useCanvas();

  const openSettings = useCallback(() => setView("settings"), []);
  const goHome = useCallback(() => setView("home"), []);

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
