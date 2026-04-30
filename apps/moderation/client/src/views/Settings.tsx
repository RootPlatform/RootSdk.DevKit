import React, { useCallback, useEffect, useState } from "react";
import {
  moderationServiceClient,
  ModerationServiceClientEvent,
} from "@moderation/gen-client";
import {
  GetSettingsResponse,
  ContentFilterSettings,
  SpamControlSettings,
  RateLimitSettings,
  GeneralSettings,
  SpamScope,
  WordCategory,
} from "@moderation/gen-shared";
import { withClientRetry } from "../lib/retry";
import styles from "./Settings.module.css";
import { useAdmin } from "../contexts/AdminContext";
import { SubTabs } from "../components/SubTabs";
import { Loader } from "../components/Loader";
import { QueryError } from "../components/QueryError";
import { ContentFilterTab } from "./settings/ContentFilterTab";
import { SpamControlTab } from "./settings/SpamControlTab";
import { RateLimitTab } from "./settings/RateLimitTab";
import { GeneralTab } from "./settings/GeneralTab";
import { MonitoredChannelsTab } from "./settings/MonitoredChannelsTab";

// Settings — admin-only push view with sub-tabs. The page fetches the full
// snapshot once and routes it into each tab; tabs save with focused per-
// field RPCs (SetContentFilterEnabled, SetSpamThreshold, …) so concurrent
// edits to different fields don't stomp.
//
// SettingsChanged broadcasts trigger a refetch — another admin saving in
// a different session, or the admins picker moving in globalSettings,
// makes the snapshot stale.

export type SubTab =
  | "general"
  | "content"
  | "spam"
  | "rate"
  | "channels";

const SUBTAB_ITEMS = [
  { key: "general" as const, label: "General" },
  { key: "content" as const, label: "Content filter" },
  { key: "spam" as const, label: "Spam control" },
  { key: "rate" as const, label: "Rate limiting" },
  { key: "channels" as const, label: "Monitored channels" },
];

export const Settings: React.FC = () => {
  const { amIAdmin, loading: adminLoading } = useAdmin();
  const [tab, setTab] = useState<SubTab>("general");
  const [data, setData] = useState<GetSettingsResponse | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | undefined>(undefined);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const r = await withClientRetry(() =>
        moderationServiceClient.getSettings({}),
      );
      setData(r);
      setError(undefined);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!amIAdmin) return;
    void refresh();
    const onChanged = () => {
      void refresh();
    };
    moderationServiceClient.on(
      ModerationServiceClientEvent.SettingsChanged,
      onChanged,
    );
    return () => {
      moderationServiceClient.off(
        ModerationServiceClientEvent.SettingsChanged,
        onChanged,
      );
    };
  }, [amIAdmin, refresh]);

  if (adminLoading) return <Loader />;
  if (!amIAdmin) {
    return <div className={styles.error}>Admin access required.</div>;
  }
  if (loading && !data) return <Loader />;
  if (error && !data) return <QueryError onRetry={refresh} message={error} />;
  if (!data) return null;

  return (
    <div className={styles.settings}>
      <header className={styles.heading}>
        <h2 className={styles.title}>Settings</h2>
        <p className={styles.subtitle}>Configure moderation rules and behavior</p>
      </header>

      <SubTabs
        items={SUBTAB_ITEMS}
        active={tab}
        onChange={setTab}
        ariaLabel="Settings sections"
      />

      <div className={styles.tabBody}>
        {tab === "general" && <GeneralTab data={data} onSaved={refresh} />}
        {tab === "content" && (
          <ContentFilterTab data={data} onSaved={refresh} />
        )}
        {tab === "spam" && <SpamControlTab data={data} onSaved={refresh} />}
        {tab === "rate" && <RateLimitTab data={data} onSaved={refresh} />}
        {tab === "channels" && (
          <MonitoredChannelsTab data={data} onSaved={refresh} />
        )}
      </div>
    </div>
  );
};

// --- Shared building blocks (re-exported for tabs) -------------------------
//
// Toggle and FormRow are kept exported here so existing sub-tabs continue
// to import { Toggle, FormRow, styles } from "../Settings". A future pass
// could split these into their own components/* files; the current
// re-export keeps Sprint 3c.4's diff focused on the tab bodies.

export const Toggle: React.FC<{
  checked: boolean;
  onChange: (next: boolean) => void;
}> = ({ checked, onChange }) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    onClick={() => onChange(!checked)}
    className={`${styles.toggle} ${checked ? styles.toggleOn : ""}`}
  >
    <span
      className={`${styles.toggleKnob} ${checked ? styles.toggleOnKnob : ""}`}
    />
  </button>
);

export const FormRow: React.FC<{
  label: string;
  description?: React.ReactNode;
  children: React.ReactNode;
}> = ({ label, description, children }) => (
  <div className={styles.formRow}>
    <div className={styles.formRowText}>
      <div className={styles.rowLabel}>{label}</div>
      {description && (
        <div className={styles.rowDescription}>{description}</div>
      )}
    </div>
    <div className={styles.formRowControl}>{children}</div>
  </div>
);

// Re-export proto types so sub-tabs can import from one file.
export type {
  ContentFilterSettings,
  SpamControlSettings,
  RateLimitSettings,
  GeneralSettings,
  SpamScope,
  WordCategory,
};
export { styles };
