import React, { useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
import { moderationServiceClient } from "@moderation/gen-client";
import { GetSettingsResponse } from "@moderation/gen-shared";
import { FormRow, styles } from "../Settings";
import { useFieldAutoSave, FieldAutoSaveStatus } from "./fieldAutoSave";
import { Panel } from "../../components/Panel";
import { Pill } from "../../components/Pill";
import { TypeToConfirm } from "../../components/TypeToConfirm";
import { withClientRetry } from "../../lib/retry";

const CLEAR_AUDIT_PHRASE = "clear audit log";
// Auto-dismiss the "Cleared N entries" success message after this much
// time. Long enough for the admin to read it; short enough that an
// unrelated revisit to the General tab doesn't look like the action
// just happened.
const CLEAR_RESULT_TTL_MS = 8_000;

interface Props {
  data: GetSettingsResponse;
  onSaved: () => void;
}

export const GeneralTab: React.FC<Props> = ({ data, onSaved }) => {
  const stored = data.general!;
  const limits = data.limits!;
  const exempt = data.exempt;
  const exemptUserCount = exempt?.userIds.length ?? 0;
  const exemptRoleCount = exempt?.roles.length ?? 0;
  const hasExempt = exemptUserCount + exemptRoleCount > 0;

  const retention = useFieldAutoSave(stored.retentionDays, async (v) => {
    await moderationServiceClient.setRetentionDays({ days: v });
    onSaved();
  });

  // Danger zone uses a two-step disclosure: first an "Open" button, then
  // the type-to-confirm card. Without the disclosure the type-out is
  // visible at all times, which is louder than necessary for an action
  // most admins will never run.
  const [clearOpen, setClearOpen] = useState(false);
  const [clearedCount, setClearedCount] = useState<number | null>(null);
  // Auto-dismiss the success message so it doesn't linger across an
  // unrelated revisit to the General tab.
  useEffect(() => {
    if (clearedCount === null) return;
    const t = window.setTimeout(
      () => setClearedCount(null),
      CLEAR_RESULT_TTL_MS,
    );
    return () => window.clearTimeout(t);
  }, [clearedCount]);
  const handleClear = async () => {
    const response = await withClientRetry(() =>
      moderationServiceClient.clearAuditLog({
        confirmationPhrase: CLEAR_AUDIT_PHRASE,
      }),
    );
    setClearedCount(response.rowsDeleted);
    setClearOpen(false);
    onSaved();
  };

  return (
    <>
      <Panel
        title="General"
        description="Retention and other app-wide settings."
      >
        <FormRow
          label="Analytics retention"
          description="Audit log entries older than this are deleted automatically during daily cleanup."
        >
          <input
            type="number"
            className={`${styles.input} ${styles.numberInput}`}
            value={retention.value}
            min={limits.retentionDaysMin}
            max={limits.retentionDaysMax}
            aria-label="Analytics retention in days"
            onChange={(e) => retention.setValue(Number(e.target.value) || 0)}
          />
          <span className={styles.help}>
            {limits.retentionDaysMin}–{limits.retentionDaysMax} days
          </span>
        </FormRow>
        <FieldAutoSaveStatus state={retention} />
      </Panel>

      {/* Read-only mirror of globalSettings.general.exempt. The picker lives
          in Root's native Settings UI (manifest-driven roleOrMember widget);
          this panel just shows the current selection so admins don't have to
          context-switch to confirm what's configured. Role names + colors
          are resolved server-side in GetSettings; user IDs are rendered as
          short-IDs (a future enhancement could batch a profiles RPC). */}
      <Panel
        title="Exempt members"
        description="Roles and members exempt from automated content, spam, and rate-limit rules. Manual admin actions (kick, ban, delete) are unaffected. Edit this selection in Root's native app Settings."
      >
        {!hasExempt ? (
          <p className={styles.help}>
            No exempt roles or members configured.
          </p>
        ) : (
          <div className={styles.exemptGroups}>
            {exemptRoleCount > 0 && (
              <div>
                <div className={styles.exemptHeading}>
                  {exemptRoleCount} role{exemptRoleCount === 1 ? "" : "s"}
                </div>
                <div className={styles.exemptPills}>
                  {exempt!.roles.map((role) => (
                    <Pill key={role.id} prefix="@" tone="info">
                      {role.colorHex && (
                        <span
                          className={styles.exemptRoleSwatch}
                          style={{ backgroundColor: role.colorHex }}
                          aria-hidden="true"
                        />
                      )}
                      {role.name || role.id}
                    </Pill>
                  ))}
                </div>
              </div>
            )}
            {exemptUserCount > 0 && (
              <div>
                <div className={styles.exemptHeading}>
                  {exemptUserCount} member{exemptUserCount === 1 ? "" : "s"}
                </div>
                <div className={styles.exemptPills}>
                  {exempt!.userIds.map((id) => (
                    <Pill key={id}>{shortId(id)}</Pill>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Panel>

      {/* Danger zone — irreversible bulk operations. The error-accent
          styling on Panel + button + confirm card carries the visual
          weight; the disclosure keeps the surface quiet for the 99% of
          sessions that don't need it. */}
      <Panel
        title="Danger zone"
        description="Irreversible bulk operations. Use with care."
        className={styles.dangerZonePanel}
      >
        <div className={styles.dangerRow}>
          <div>
            <div className={styles.dangerActionTitle}>Clear audit log</div>
            <div className={styles.help}>
              Permanently delete every audit log entry — automated and
              manual. Counters and analytics will reset to zero. A single
              "log was cleared" entry is recorded immediately after.
            </div>
            {clearedCount !== null && (
              <div className={styles.dangerSuccess} role="status">
                Cleared {clearedCount}{" "}
                {clearedCount === 1 ? "entry" : "entries"}.
              </div>
            )}
          </div>
          {!clearOpen && (
            // Icon-button (red at rest) for the destructive trigger.
            // The action title above already says "Clear audit log";
            // a labelled rectangle button with the same words was a
            // third copy of the same string. The trash icon carries
            // the affordance; the row title carries the verbal label.
            // Per the project's destructive-icon convention, the icon
            // is error-coloured at rest (not grey-then-red on hover).
            <button
              type="button"
              className={styles.dangerIconButton}
              onClick={() => {
                setClearedCount(null);
                setClearOpen(true);
              }}
              aria-label="Clear audit log"
              title="Clear audit log"
            >
              <Trash2 size={18} />
            </button>
          )}
        </div>
        {clearOpen && (
          <TypeToConfirm
            confirmationPhrase={CLEAR_AUDIT_PHRASE}
            prompt={`Type "${CLEAR_AUDIT_PHRASE}" to permanently delete every audit log entry. This cannot be undone.`}
            commitLabel="Clear audit log"
            onCommit={handleClear}
            onCancel={() => setClearOpen(false)}
          />
        )}
      </Panel>
    </>
  );
};

function shortId(id: string): string {
  return id.length > 12 ? id.slice(0, 8) + "…" : id;
}
