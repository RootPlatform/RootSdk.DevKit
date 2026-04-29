import React, { useCallback, useEffect, useState } from "react";
import styles from "./App.module.css";
import { AppHeader } from "./components/AppHeader";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { HomeView } from "./views/HomeView";
import { Settings } from "./views/Settings";
import { FeedProvider, useFeed } from "./contexts/FeedContext";

// ============================================================================
// App shell. Single-view UX with a push-view for admin settings:
//
//   home     — AppHeader (title + gear if admin) over HomeView (release feed).
//   settings — AppHeader (back + "Settings") over Settings (admin-only).
//
// A gear click pushes the settings view. The back button pops. State is a
// single `view` union — no router library needed for two screens.
//
// Boundary structure:
//   * Root ErrorBoundary wraps the FeedProvider + shell. Catches render-time
//     crashes in setup code that would otherwise blank the whole app.
//   * Per-view ErrorBoundary wraps HomeView / Settings separately so a crash
//     in one doesn't take out the header or the other view.
//
// Settings hardening: if a user somehow reaches view="settings" without
// being an admin (e.g. they were demoted between renders), we fall back
// to home. The Settings component itself also uses <AdminOnly> as a
// defence in depth.
// ============================================================================

type View = "home" | "settings";

const App: React.FC = () => {
  return (
    <ErrorBoundary label="App">
      <FeedProvider>
        <AppShell />
      </FeedProvider>
    </ErrorBoundary>
  );
};

// AppShell lives inside the providers so it can read amIAdmin to guard the
// settings view. Keeping it separate from <App> keeps the provider stack in
// one place.
const AppShell: React.FC = () => {
  const [view, setView] = useState<View>("home");
  const { amIAdmin } = useFeed();

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

  // Non-admin viewing settings: snap back to home. Don't render the
  // Settings view at all — avoids a flash of admin UI while AdminOnly
  // decides.
  const effectiveView: View = view === "settings" && !amIAdmin ? "home" : view;

  return (
    <div className={styles.app}>
      <AppHeader
        mode={effectiveView}
        onOpenSettings={openSettings}
        onBack={goHome}
      />
      <main className={styles.content}>
        {effectiveView === "home" && (
          <ErrorBoundary label="HomeView">
            <HomeView />
          </ErrorBoundary>
        )}
        {effectiveView === "settings" && (
          <ErrorBoundary label="Settings">
            <Settings />
          </ErrorBoundary>
        )}
      </main>
    </div>
  );
};

export default App;
