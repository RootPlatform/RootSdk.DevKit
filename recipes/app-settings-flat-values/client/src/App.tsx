// ============================================================================
// Recipe: App Settings (Flat Values) — Client
// Composes: networking-app-services
// ============================================================================
//
// A Settings form for the app's three flat values:
//
//   - welcomeMessage (text)
//   - maxItems        (number)
//   - showTimestamps  (checkbox)
//
// Initial state on mount: fetch current values + caller's is_admin flag.
// Subscribe to SettingsChanged so the form re-fetches when the server says
// values changed (another tab saved, the admins picker moved, etc.).
//
// Editability is gated by is_admin from the server. The button is hidden
// for non-admins and the form fields are read-only — that's the visible UX
// gate. The security gate is server-side: UpdateSettings throws
// RootServerException(NOT_ADMIN) if a non-admin somehow invokes it
// (DOM-edit, direct service-client call, etc.). UI gating is for visibility,
// not access control. See ui-feature-by-role for the canonical lesson on
// why both layers are required.
//
// ============================================================================

import React, { useEffect, useRef, useState } from "react";
import { RootServerException } from "@rootsdk/client-app";
import {
  settingsServiceClient,
  SettingsServiceClientEvent,
} from "@appsettingsflatvalues/gen-client";
import {
  SettingsValues,
  SettingsError,
} from "@appsettingsflatvalues/gen-shared";

interface FormState {
  welcomeMessage: string;
  maxItems: number;
  showTimestamps: boolean;
}

const EMPTY_FORM: FormState = {
  welcomeMessage: "",
  maxItems: 0,
  showTimestamps: false,
};

export const App: React.FC = () => {
  // Server-authoritative current values + caller permission flag.
  const [stored, setStored] = useState<SettingsValues | undefined>(undefined);
  const [isAdmin, setIsAdmin] = useState(false);

  // Form-local edit buffer. Independent of `stored` so the user can type
  // freely without server round trips on every keystroke. Initialized from
  // `stored` on first load and after a successful save.
  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);
  const [savedNotice, setSavedNotice] = useState(false);
  // Tracks the in-flight "Saved." flash timer so we can clear it when (a)
  // the user saves again before the flash fades and (b) the component
  // unmounts mid-flash (without the clear, setSavedNotice on an unmounted
  // component logs a React warning and the second flash gets cut short
  // by the first's late timer).
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  // StrictMode latch — see useEffect below.
  const initialFetchRef = useRef(false);
  // Monotonically increasing request id. Each fetchSettings() captures the
  // current value; if a newer fetch has started by the time the response
  // returns, the older response is dropped. Without this, mount-fetch and
  // a near-simultaneous SettingsChanged refetch can race and let a stale
  // response overwrite fresh state if the network reorders them.
  const fetchSeqRef = useRef(0);

  const fetchSettings = async (): Promise<void> => {
    const mySeq = ++fetchSeqRef.current;
    setLoading(true);
    setError(undefined);
    try {
      const r = await settingsServiceClient.getSettings({});
      // A newer fetch already started — drop this response.
      if (mySeq !== fetchSeqRef.current) return;
      const values = r.values ?? EMPTY_FORM;
      setStored(values);
      setIsAdmin(r.isAdmin);
      // Sync form to server state on every load. If the user had unsaved
      // edits, they get overwritten — that's the right call here because
      // a SettingsChanged broadcast means somebody else saved, and showing
      // a stale "your unsaved edits" form atop a different authoritative
      // baseline is more confusing than a fresh form. A real app might
      // detect dirty state and prompt before clobbering.
      setForm({
        welcomeMessage: values.welcomeMessage,
        maxItems: values.maxItems,
        showTimestamps: values.showTimestamps,
      });
    } catch (err) {
      if (mySeq !== fetchSeqRef.current) return;
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      // Only clear loading when this fetch is still the latest. Older
      // fetches that already lost the race no-op above; we want
      // loading=false only when nothing's still in flight.
      if (mySeq === fetchSeqRef.current) setLoading(false);
    }
  };

  // Initial load + subscribe to SettingsChanged. Re-fetch on every change
  // signal regardless of who triggered it (this tab's own save, another
  // tab, an admins-picker mutation in the platform).
  //
  // initialFetchRef gates the FETCH only — without it, React.StrictMode's
  // dev-mode double-invoke fires two parallel fetches on mount, producing
  // duplicate work and visible flicker. The on/off subscription pair runs
  // on every mount/cleanup cycle: on the StrictMode unmount the cleanup
  // unsubscribes, and on the re-mount we re-subscribe — net zero, and the
  // listener is correctly registered after the dust settles. (Earlier
  // versions of this recipe also gated the on()/off() behind the latch,
  // which left the second mount with no subscription at all in dev. Don't
  // do that.)
  useEffect(() => {
    if (!initialFetchRef.current) {
      initialFetchRef.current = true;
      void fetchSettings();
    }
    settingsServiceClient.on(
      SettingsServiceClientEvent.SettingsChanged,
      fetchSettings,
    );
    return () => {
      settingsServiceClient.off(
        SettingsServiceClientEvent.SettingsChanged,
        fetchSettings,
      );
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSave = async (): Promise<void> => {
    if (!stored) return;
    setSaving(true);
    setError(undefined);
    setSavedNotice(false);
    try {
      // Send only the fields that differ from `stored`. The proto's
      // optional fields make this a partial update — fields we don't send
      // keep their current value server-side. The save is no-ops if
      // nothing changed.
      const partial: {
        welcomeMessage?: string;
        maxItems?: number;
        showTimestamps?: boolean;
      } = {};
      if (form.welcomeMessage !== stored.welcomeMessage) partial.welcomeMessage = form.welcomeMessage;
      if (form.maxItems !== stored.maxItems) partial.maxItems = form.maxItems;
      if (form.showTimestamps !== stored.showTimestamps) partial.showTimestamps = form.showTimestamps;

      const r = await settingsServiceClient.updateSettings(partial);
      // The server returns the merged result. Apply locally so we don't
      // wait for the SettingsChanged broadcast to round-trip back to us.
      // (The broadcast still fires and triggers another fetchSettings,
      // which is harmless — the values match what we just set.)
      if (r.values) {
        setStored(r.values);
        setForm({
          welcomeMessage: r.values.welcomeMessage,
          maxItems: r.values.maxItems,
          showTimestamps: r.values.showTimestamps,
        });
      }
      setSavedNotice(true);
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
      savedTimerRef.current = setTimeout(() => setSavedNotice(false), 2_000);
    } catch (err) {
      // Match on the typed error code. err.code is stable across versions;
      // err.message is freeform. See ui-feature-by-role README for the
      // full reasoning.
      if (err instanceof RootServerException && err.code === SettingsError.NOT_ADMIN) {
        setError("You're no longer authorized to save settings. Refresh to see the current state.");
      } else {
        setError(err instanceof Error ? err.message : String(err));
      }
    } finally {
      setSaving(false);
    }
  };

  if (!stored && loading) return <div style={pageStyle}>Loading settings…</div>;
  if (!stored) return <div style={pageStyle}>Failed to load settings.</div>;

  const dirty =
    form.welcomeMessage !== stored.welcomeMessage ||
    form.maxItems !== stored.maxItems ||
    form.showTimestamps !== stored.showTimestamps;

  return (
    <main style={pageStyle}>
      <h1 style={{ fontSize: 24, margin: 0 }}>App Settings</h1>
      <p style={metaStyle}>
        {isAdmin
          ? "You're an admin — you can edit these values."
          : "Read-only. Ask an admin to make changes."}
      </p>

      {error && <p style={errorStyle}>{error}</p>}

      <div style={fieldStyle}>
        <label style={labelStyle} htmlFor="welcomeMessage">Welcome message</label>
        <input
          id="welcomeMessage"
          type="text"
          value={form.welcomeMessage}
          disabled={!isAdmin}
          onChange={(e) => setForm({ ...form, welcomeMessage: e.target.value })}
          style={inputStyle}
        />
      </div>

      <div style={fieldStyle}>
        <label style={labelStyle} htmlFor="maxItems">Max items</label>
        <input
          id="maxItems"
          type="number"
          min={0}
          value={form.maxItems}
          disabled={!isAdmin}
          onChange={(e) => {
            // Coerce to a finite number — empty input gives 0, paste of
            // non-numeric text gives NaN. NaN would silently send NaN over
            // a uint32 field; coalesce to 0 so the form stays valid.
            const n = Number(e.target.value);
            setForm({ ...form, maxItems: Number.isFinite(n) ? n : 0 });
          }}
          style={inputStyle}
        />
      </div>

      <div style={fieldStyle}>
        <label style={{ ...labelStyle, display: "flex", gap: 8, alignItems: "center" }}>
          <input
            type="checkbox"
            checked={form.showTimestamps}
            disabled={!isAdmin}
            onChange={(e) => setForm({ ...form, showTimestamps: e.target.checked })}
          />
          Show timestamps
        </label>
      </div>

      {isAdmin && (
        <div style={{ marginTop: 24, display: "flex", gap: 12, alignItems: "center" }}>
          <button
            onClick={() => void handleSave()}
            disabled={saving || !dirty}
            style={buttonStyle}
          >
            {saving ? "Saving…" : "Save"}
          </button>
          {savedNotice && <span style={savedStyle}>Saved.</span>}
        </div>
      )}
    </main>
  );
};

// Inline styles so this recipe doesn't bring a CSS toolchain into scope.
// A real app would lift these into CSS modules. All colors come from Root
// design tokens (`--rootsdk-*` CSS custom properties); the host injects
// them on document.documentElement and updates them automatically when
// the user toggles light/dark theme. Reference:
// docs/llms/app-docs/develop/client/design-system-reference.md

const pageStyle: React.CSSProperties = {
  fontFamily: "system-ui, -apple-system, sans-serif",
  padding: 24,
  maxWidth: 560,
  margin: "0 auto",
  color: "var(--rootsdk-text-primary)",
};

const metaStyle: React.CSSProperties = {
  color: "var(--rootsdk-text-secondary)",
  fontSize: 14,
  marginTop: 8,
};

const fieldStyle: React.CSSProperties = {
  marginTop: 20,
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 14,
  marginBottom: 6,
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "8px 10px",
  fontSize: 14,
  border: "1px solid var(--rootsdk-border)",
  background: "var(--rootsdk-input)",
  color: "var(--rootsdk-text-primary)",
  borderRadius: 6,
  boxSizing: "border-box",
};

const buttonStyle: React.CSSProperties = {
  padding: "10px 16px",
  borderRadius: 8,
  border: "1px solid var(--rootsdk-border)",
  background: "var(--rootsdk-highlight-light)",
  color: "var(--rootsdk-text-primary)",
  cursor: "pointer",
  fontSize: 14,
};

// Success indicator — Root has no dedicated success token; brandSecondary
// is the conventional success-ish accent.
const savedStyle: React.CSSProperties = {
  color: "var(--rootsdk-brand-secondary)",
  fontSize: 14,
};

const errorStyle: React.CSSProperties = {
  color: "var(--rootsdk-error)",
  fontSize: 14,
  marginTop: 16,
};
