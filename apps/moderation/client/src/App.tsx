import React, { useState } from "react";
import styles from "./App.module.css";
import { AdminProvider, useAdmin } from "./contexts/AdminContext";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { Sidebar } from "./components/Sidebar";
import { MobileHeader } from "./components/MobileHeader";
import { ModerationTab } from "./components/navItems";
import { Dashboard } from "./views/Dashboard";
import { AuditLog } from "./views/AuditLog";
import { Analytics } from "./views/Analytics";
import { Settings } from "./views/Settings";

// Shell layout:
//   ≥960px: 240px Sidebar | content (CSS grid)
//   <960px: MobileHeader on top, content below; drawer is local to MobileHeader.
//
// Logic identical to pre-3b version: Root + per-view ErrorBoundaries; admin
// gate snaps non-admins out of admin-only tabs; AdminContext owns amIAdmin.
const App: React.FC = () => {
  return (
    <ErrorBoundary label="App">
      <AdminProvider>
        <Shell />
      </AdminProvider>
    </ErrorBoundary>
  );
};

const Shell: React.FC = () => {
  const { amIAdmin } = useAdmin();
  const [tab, setTab] = useState<ModerationTab>("dashboard");

  // Snap back to dashboard if a user lands on an admin-only tab and is
  // then demoted. Per-view AdminOnly gates inside Settings/AuditLog provide
  // a second layer.
  const effectiveTab: ModerationTab =
    !amIAdmin && (tab === "audit" || tab === "settings") ? "dashboard" : tab;

  return (
    <div className={styles.shell}>
      <Sidebar tab={effectiveTab} setTab={setTab} amIAdmin={amIAdmin} />
      <div className={styles.contentColumn}>
        <MobileHeader
          tab={effectiveTab}
          setTab={setTab}
          amIAdmin={amIAdmin}
        />
        <main className={styles.content}>
          {effectiveTab === "dashboard" && (
            <ErrorBoundary label="Dashboard">
              <Dashboard />
            </ErrorBoundary>
          )}
          {effectiveTab === "audit" && (
            <ErrorBoundary label="AuditLog">
              <AuditLog />
            </ErrorBoundary>
          )}
          {effectiveTab === "analytics" && (
            <ErrorBoundary label="Analytics">
              <Analytics />
            </ErrorBoundary>
          )}
          {effectiveTab === "settings" && (
            <ErrorBoundary label="Settings">
              <Settings />
            </ErrorBoundary>
          )}
        </main>
      </div>
    </div>
  );
};

export default App;
