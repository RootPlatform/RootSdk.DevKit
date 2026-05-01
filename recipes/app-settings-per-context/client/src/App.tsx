// ============================================================================
// Recipe: App Settings (Per-Context) — Client
// Composes: networking-app-services
// ============================================================================
//
// Summary-detail editor for per-channel configurations:
//
//   - One row per configured channel, with inline editors for `enabled`
//     and `priority` plus per-row Save and Remove buttons (admins only).
//   - Above the list, an "Add config" form: text input for channel id +
//     defaults for the other fields + Add button.
//
// Channel-id input is plain text. Real apps would replace this with a
// channel picker (`client-app-channels` territory); the recipe focuses on
// the per-context mechanic, not channel discovery.
//
// Editability is gated by is_admin from the server. Non-admins see the
// list read-only — no inline editors, no buttons. The security boundary
// is server-side requireAdmin, see ui-feature-by-role.
//
// Initial state on mount: fetch the list + caller's is_admin flag.
// Subscribe to ChannelConfigsChanged so the list re-fetches whenever any
// admin in any tab adds, edits, or removes a config — or whenever the
// admins picker moves and somebody's is_admin flips.
//
// ============================================================================

import React, { useEffect, useRef, useState } from "react";
import { RootServerException } from "@rootsdk/client-app";
import {
  channelConfigsServiceClient,
  ChannelConfigsServiceClientEvent,
} from "@appsettingspercontext/gen-client";
import {
  ChannelConfig,
  ChannelConfigsError,
} from "@appsettingspercontext/gen-shared";

// Form state for the "Add config" row at the top.
interface AddFormState {
  channelId: string;
  enabled: boolean;
  priority: number;
}

const ADD_FORM_DEFAULTS: AddFormState = {
  channelId: "",
  enabled: true,
  priority: 50,
};

// Per-row edit buffer: tracks the user's pending changes to a row before
// they hit Save. Keyed by channelId so each row's edits stay independent.
type EditBuffer = Record<string, { enabled: boolean; priority: number }>;

export const App: React.FC = () => {
  const [configs, setConfigs] = useState<ChannelConfig[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);

  const [addForm, setAddForm] = useState<AddFormState>(ADD_FORM_DEFAULTS);
  const [edits, setEdits] = useState<EditBuffer>({});

  const [loading, setLoading] = useState(false);
  const [savingChannelId, setSavingChannelId] = useState<string | undefined>(undefined);
  const [removingChannelId, setRemovingChannelId] = useState<string | undefined>(undefined);
  const [adding, setAdding] = useState(false);

  const [error, setError] = useState<string | undefined>(undefined);

  // StrictMode latch — same correct shape from the prior recipes' reviews:
  // gate the FETCH only, let the on/off subscription pair run on every
  // mount/cleanup cycle.
  const initialFetchRef = useRef(false);
  // In-flight request counter — drop responses that lost the race to a
  // newer fetch.
  const fetchSeqRef = useRef(0);

  const fetchList = async (): Promise<void> => {
    const mySeq = ++fetchSeqRef.current;
    setLoading(true);
    setError(undefined);
    try {
      const r = await channelConfigsServiceClient.listChannelConfigs({});
      if (mySeq !== fetchSeqRef.current) return;
      const next = r.configs ?? [];
      setConfigs(next);
      setIsAdmin(r.isAdmin);
      // Reset per-row edit buffers to whatever the server just returned.
      // Anything the user had in flight that hadn't been Saved is dropped
      // — same call as flat-values: showing pending edits atop new
      // authoritative state is more confusing than starting fresh.
      const buf: EditBuffer = {};
      for (const c of next) {
        buf[c.channelId] = { enabled: c.enabled, priority: c.priority };
      }
      setEdits(buf);
    } catch (err) {
      if (mySeq !== fetchSeqRef.current) return;
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      if (mySeq === fetchSeqRef.current) setLoading(false);
    }
  };

  useEffect(() => {
    if (!initialFetchRef.current) {
      initialFetchRef.current = true;
      void fetchList();
    }
    channelConfigsServiceClient.on(
      ChannelConfigsServiceClientEvent.ChannelConfigsChanged,
      fetchList,
    );
    return () => {
      channelConfigsServiceClient.off(
        ChannelConfigsServiceClientEvent.ChannelConfigsChanged,
        fetchList,
      );
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const friendlyError = (err: unknown): string => {
    if (err instanceof RootServerException) {
      switch (err.code) {
        case ChannelConfigsError.NOT_ADMIN:
          return "You're no longer authorized. Refresh to see the current state.";
        case ChannelConfigsError.INVALID_CHANNEL_ID:
          return err.message || "That channel id isn't valid.";
        case ChannelConfigsError.INVALID_PRIORITY:
          return err.message || "Priority must be between 0 and 100.";
        default:
          return err.message;
      }
    }
    return err instanceof Error ? err.message : String(err);
  };

  const handleAdd = async (): Promise<void> => {
    const channelId = addForm.channelId.trim();
    if (!channelId) return;
    setAdding(true);
    setError(undefined);
    try {
      await channelConfigsServiceClient.upsertChannelConfig({
        channelId,
        enabled: addForm.enabled,
        priority: addForm.priority,
      });
      // Don't optimistically merge into local state — the broadcast will
      // fire and trigger a fetchList(), which is the canonical source of
      // truth for the list shape (ordering, etc.).
      setAddForm(ADD_FORM_DEFAULTS);
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setAdding(false);
    }
  };

  const handleSave = async (config: ChannelConfig): Promise<void> => {
    const buf = edits[config.channelId];
    if (!buf) return;
    setSavingChannelId(config.channelId);
    setError(undefined);
    try {
      await channelConfigsServiceClient.upsertChannelConfig({
        channelId: config.channelId,
        enabled: buf.enabled,
        priority: buf.priority,
      });
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setSavingChannelId(undefined);
    }
  };

  const handleRemove = async (channelId: string): Promise<void> => {
    setRemovingChannelId(channelId);
    setError(undefined);
    try {
      await channelConfigsServiceClient.deleteChannelConfig({ channelId });
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setRemovingChannelId(undefined);
    }
  };

  const updateBuffer = (
    channelId: string,
    patch: Partial<{ enabled: boolean; priority: number }>,
  ): void => {
    setEdits((prev) => ({
      ...prev,
      [channelId]: { ...prev[channelId], ...patch },
    }));
  };

  return (
    <main style={pageStyle}>
      <h1 style={{ fontSize: 24, margin: 0 }}>Per-channel configuration</h1>
      <p style={metaStyle}>
        {isAdmin
          ? "You're an admin — you can add, edit, and remove channel configs."
          : "Read-only. Ask an admin to make changes."}
      </p>

      {error && <p style={errorStyle}>{error}</p>}

      {isAdmin && (
        <section style={addSectionStyle}>
          <h2 style={{ fontSize: 16, margin: "0 0 8px" }}>Add config</h2>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <input
              type="text"
              placeholder="Channel id"
              value={addForm.channelId}
              disabled={adding}
              onChange={(e) => setAddForm({ ...addForm, channelId: e.target.value })}
              style={{ ...inputStyle, flex: "1 1 240px" }}
            />
            <label style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 14 }}>
              <input
                type="checkbox"
                checked={addForm.enabled}
                disabled={adding}
                onChange={(e) => setAddForm({ ...addForm, enabled: e.target.checked })}
              />
              enabled
            </label>
            <label style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 14 }}>
              priority
              <input
                type="number"
                min={0}
                max={100}
                value={addForm.priority}
                disabled={adding}
                onChange={(e) => {
                  // Empty string and non-numeric paste both snap to 0
                  // here, with no in-form indication that the value was
                  // coerced. Recipe ergonomics — a production app would
                  // either hold the raw string in state and validate on
                  // Save, or render a warning when coercion happens.
                  const n = Number(e.target.value);
                  setAddForm({
                    ...addForm,
                    priority: Number.isFinite(n) ? n : 0,
                  });
                }}
                style={{ ...inputStyle, width: 70 }}
              />
            </label>
            <button
              onClick={() => void handleAdd()}
              disabled={adding || addForm.channelId.trim().length === 0}
              style={buttonStyle}
            >
              {adding ? "Adding…" : "Add"}
            </button>
          </div>
        </section>
      )}

      {loading && configs.length === 0 ? (
        <p style={metaStyle}>Loading…</p>
      ) : configs.length === 0 ? (
        <p style={metaStyle}>No channel configs yet.</p>
      ) : (
        <ul style={listStyle}>
          {configs.map((c) => {
            const buf = edits[c.channelId];
            const dirty =
              buf !== undefined &&
              (buf.enabled !== c.enabled || buf.priority !== c.priority);
            return (
              <li key={c.channelId} style={itemStyle}>
                <code style={channelIdStyle}>{c.channelId}</code>
                <label style={inlineLabelStyle}>
                  <input
                    type="checkbox"
                    checked={buf?.enabled ?? c.enabled}
                    disabled={!isAdmin || savingChannelId === c.channelId}
                    onChange={(e) => updateBuffer(c.channelId, { enabled: e.target.checked })}
                  />
                  enabled
                </label>
                <label style={inlineLabelStyle}>
                  priority
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={buf?.priority ?? c.priority}
                    disabled={!isAdmin || savingChannelId === c.channelId}
                    onChange={(e) => {
                      // Same coercion-to-0 behavior as the Add row above;
                      // see that comment for the recipe-ergonomics note.
                      const n = Number(e.target.value);
                      updateBuffer(c.channelId, {
                        priority: Number.isFinite(n) ? n : 0,
                      });
                    }}
                    style={{ ...inputStyle, width: 70 }}
                  />
                </label>
                {isAdmin && (
                  <>
                    <button
                      onClick={() => void handleSave(c)}
                      disabled={!dirty || savingChannelId === c.channelId}
                      style={buttonStyle}
                    >
                      {savingChannelId === c.channelId ? "Saving…" : "Save"}
                    </button>
                    <button
                      onClick={() => void handleRemove(c.channelId)}
                      disabled={removingChannelId === c.channelId}
                      style={removeButtonStyle}
                    >
                      {removingChannelId === c.channelId ? "Removing…" : "Remove"}
                    </button>
                  </>
                )}
              </li>
            );
          })}
        </ul>
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
  maxWidth: 800,
  margin: "0 auto",
  color: "var(--rootsdk-text-primary)",
};

const metaStyle: React.CSSProperties = {
  color: "var(--rootsdk-text-secondary)",
  fontSize: 14,
  marginTop: 8,
};

const addSectionStyle: React.CSSProperties = {
  marginTop: 20,
  padding: 16,
  border: "1px solid var(--rootsdk-border)",
  borderRadius: 12,
};

const listStyle: React.CSSProperties = {
  listStyle: "none",
  padding: 0,
  margin: "16px 0 0",
};

const itemStyle: React.CSSProperties = {
  padding: "10px 0",
  borderBottom: "1px solid var(--rootsdk-border)",
  fontSize: 14,
  display: "flex",
  alignItems: "center",
  gap: 12,
  flexWrap: "wrap",
};

const channelIdStyle: React.CSSProperties = {
  flex: "1 1 240px",
  minWidth: 0,
  fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
  fontSize: 13,
  overflowWrap: "anywhere",
};

const inlineLabelStyle: React.CSSProperties = {
  display: "flex",
  gap: 6,
  alignItems: "center",
  fontSize: 14,
};

const inputStyle: React.CSSProperties = {
  padding: "6px 8px",
  fontSize: 14,
  border: "1px solid var(--rootsdk-border)",
  background: "var(--rootsdk-input)",
  color: "var(--rootsdk-text-primary)",
  borderRadius: 6,
  boxSizing: "border-box",
};

const buttonStyle: React.CSSProperties = {
  padding: "6px 12px",
  borderRadius: 6,
  border: "1px solid var(--rootsdk-border)",
  background: "var(--rootsdk-highlight-light)",
  color: "var(--rootsdk-text-primary)",
  cursor: "pointer",
  fontSize: 13,
};

// Destructive button — red at rest (per Root convention; see
// feedback_root_destructive_icons_red).
const removeButtonStyle: React.CSSProperties = {
  padding: "6px 12px",
  borderRadius: 6,
  border: "1px solid var(--rootsdk-error)",
  background: "transparent",
  color: "var(--rootsdk-error)",
  cursor: "pointer",
  fontSize: 13,
};

const errorStyle: React.CSSProperties = {
  color: "var(--rootsdk-error)",
  fontSize: 14,
  marginTop: 16,
};
