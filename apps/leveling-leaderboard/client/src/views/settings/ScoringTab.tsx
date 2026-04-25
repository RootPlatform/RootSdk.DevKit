import React, { useCallback, useEffect, useRef, useState } from "react";
import { RootServerException } from "@rootsdk/client-app";
import { leaderboardServiceClient } from "@levelingleaderboard/gen-client";
import type {
  AppSettings,
  AppSettingsLimits,
} from "@levelingleaderboard/gen-shared";
import { LeaderboardError } from "@levelingleaderboard/gen-shared";
import styles from "./ScoringTab.module.css";
import { NumberInput } from "../../components/NumberInput";
import { TextInput } from "../../components/TextInput";
import { Button } from "../../components/Button";
import { RootUserRoleSelector } from "../../components/RootUserRoleSelector";
import { AutoSaveStatus } from "../../components/AutoSaveStatus";
import { useDebouncedMutation } from "../../lib/useDebouncedMutation";
import { useProfiles } from "../../contexts/ProfilesContext";
import { isPersonId } from "../../lib/guid";
import { withClientRetry } from "../../lib/retry";

// ============================================================================
// ScoringTab — XP scoring knobs plus reset actions.
//
// Auto-save:
//   * NumberInputs use local state for responsive typing, debounced push to
//     UpdateScoringSettings via useDebouncedMutation (150ms). Last keystroke
//     wins; rapid changes coalesce into one RPC.
//   * Reset actions (member + all) use the "type the name to confirm"
//     pattern (case-sensitive). Destructive actions never auto-fire, and
//     typing the name forces the admin to recognise exactly WHAT they're
//     destroying — stronger than a two-click confirm.
// ============================================================================

const RESET_ALL_PHRASE = "reset all XP";

interface Props {
  initial: AppSettings;
  limits: AppSettingsLimits;
  onSaved: (next: AppSettings) => void;
}

export const ScoringTab: React.FC<Props> = ({ initial, limits, onSaved }) => {
  const [scoring, setScoring] = useState<AppSettings>(initial);

  // Re-initialise if the parent replaces `initial` (another admin saved and
  // we refreshed). Compare by stringify because `initial` is a fresh object
  // reference each render but the contents rarely change.
  const initialKey = `${initial.xpPerMessage}|${initial.cooldownSeconds}|${initial.levelCurveCoefficient}`;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => setScoring(initial), [initialKey]);

  // Destructure to use the stable `mutate` reference directly. Passing the
  // whole `save` object into useEffect deps would thrash — the hook returns
  // a fresh object per render (pending/error state changes), but `mutate` is
  // wrapped in useCallback and stays stable.
  const {
    mutate: saveMutate,
    error: saveError,
    retry: saveRetry,
    clearError: saveClearError,
  } = useDebouncedMutation<AppSettings>({
    mutationFn: async (data) => {
      await withClientRetry(() =>
        leaderboardServiceClient.updateScoringSettings({ settings: data }),
      );
      onSaved(data);
    },
  });

  // Fire save whenever local state changes — except on the very first render
  // (where state equals initial). Without the mount-skip, opening the tab
  // would immediately re-send the server's own values.
  const mountedRef = useRef(false);
  useEffect(() => {
    if (!mountedRef.current) {
      mountedRef.current = true;
      return;
    }
    saveMutate(scoring);
  }, [scoring, saveMutate]);

  const patch = useCallback((p: Partial<AppSettings>) => {
    setScoring((prev) => ({ ...prev, ...p }));
  }, []);

  return (
    <div className={styles.tab}>
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.heading}>Scoring</h2>
          <AutoSaveStatus
            error={saveError}
            onRetry={saveRetry}
            onDismissError={saveClearError}
          />
        </div>

        <div className={styles.formGrid}>
          <NumberInput
            label="XP per message"
            value={scoring.xpPerMessage}
            onChange={(v) => patch({ xpPerMessage: v })}
            min={limits.xpPerMessageMin}
            max={limits.xpPerMessageMax}
          />
          <NumberInput
            label="Cooldown (seconds)"
            value={scoring.cooldownSeconds}
            onChange={(v) => patch({ cooldownSeconds: v })}
            min={limits.cooldownSecondsMin}
            max={limits.cooldownSecondsMax}
          />
          <NumberInput
            label="Level curve"
            value={scoring.levelCurveCoefficient}
            onChange={(v) => patch({ levelCurveCoefficient: v })}
            min={limits.levelCurveCoefficientMin}
            max={limits.levelCurveCoefficientMax}
            hint="Lower is faster. Level N costs N² × curve XP."
          />
        </div>
      </section>

      <hr className={styles.divider} />

      <ResetMemberSection />

      <hr className={styles.divider} />

      <ResetAllSection />
    </div>
  );
};

// --- Reset member XP --------------------------------------------------------

const ResetMemberSection: React.FC = () => {
  const { profiles, request } = useProfiles();

  const [userId, setUserId] = useState<string | undefined>(undefined);
  const [pickerError, setPickerError] = useState<string | undefined>(undefined);
  const [typed, setTyped] = useState("");
  const [resetting, setResetting] = useState(false);
  const [rpcError, setRpcError] = useState<string | undefined>(undefined);

  // Request the profile for the selected member so we can render + match
  // their nickname.
  useEffect(() => {
    if (userId) request([userId]);
  }, [userId, request]);

  // Clear the typed text whenever the selected member changes — typing out
  // the old nickname shouldn't carry over to a new selection.
  useEffect(() => {
    setTyped("");
    setRpcError(undefined);
  }, [userId]);

  const nickname = userId ? profiles[userId]?.nickname : undefined;
  // If the profile is still loading we don't know the nickname to match.
  // Disable the button until we do (resolves within a frame or two under
  // the ProfilesContext batched fetch).
  const canReset = !!userId && !!nickname && typed === nickname && !resetting;

  const doReset = async () => {
    if (!canReset || !userId) return;
    setResetting(true);
    setRpcError(undefined);
    try {
      await withClientRetry(() =>
        leaderboardServiceClient.resetMemberXp({ userId }),
      );
      setUserId(undefined);
      setTyped("");
    } catch (err: unknown) {
      setRpcError(scoringErrorMessage(err));
    } finally {
      setResetting(false);
    }
  };

  return (
    <section className={styles.section}>
      <h3 className={styles.subheading}>Reset member XP</h3>
      <p className={styles.help}>
        Reset one member's XP to zero. Cannot be undone.
      </p>

      <div className={styles.pickerRow}>
        <div className={styles.picker}>
          <RootUserRoleSelector
            mode="single"
            selectedUserIds={userId ? [userId] : []}
            onSelectionChange={(detail) => {
              const picked = detail.selectedUserIds[0];
              if (!picked) {
                setUserId(undefined);
                setPickerError(undefined);
                return;
              }
              if (!isPersonId(picked)) {
                setUserId(undefined);
                setPickerError("Apps and bots don't earn XP — pick a member.");
                return;
              }
              setUserId(picked);
              setPickerError(undefined);
            }}
          />
        </div>
      </div>
      {pickerError && (
        <p className={styles.error} role="alert">
          {pickerError}
        </p>
      )}

      {userId && (
        <div className={styles.confirmRow}>
          <TextInput
            value={typed}
            onChange={setTyped}
            placeholder={
              nickname
                ? `Type ${nickname} to confirm`
                : "Loading nickname…"
            }
            disabled={resetting}
          />
          <Button
            variant="danger"
            onClick={doReset}
            disabled={!canReset}
          >
            {resetting ? "Resetting…" : "Reset"}
          </Button>
        </div>
      )}
      {rpcError && (
        <p className={styles.error} role="alert">
          {rpcError}
        </p>
      )}
    </section>
  );
};

// --- Reset all XP -----------------------------------------------------------

const ResetAllSection: React.FC = () => {
  const [typed, setTyped] = useState("");
  const [resetting, setResetting] = useState(false);
  const [rpcError, setRpcError] = useState<string | undefined>(undefined);

  const canReset = typed === RESET_ALL_PHRASE && !resetting;

  const doReset = async () => {
    if (!canReset) return;
    setResetting(true);
    setRpcError(undefined);
    try {
      await withClientRetry(() => leaderboardServiceClient.resetAllXp({}));
      setTyped("");
    } catch (err: unknown) {
      setRpcError(scoringErrorMessage(err));
    } finally {
      setResetting(false);
    }
  };

  return (
    <section className={styles.section}>
      <h3 className={styles.subheading}>Reset all XP</h3>
      <p className={styles.help}>
        This resets every member's XP to zero. This action cannot be undone.
      </p>
      <div className={styles.confirmRow}>
        <TextInput
          value={typed}
          onChange={setTyped}
          placeholder={`Type ${RESET_ALL_PHRASE} to confirm`}
          disabled={resetting}
        />
        <Button variant="danger" onClick={doReset} disabled={!canReset}>
          {resetting ? "Resetting…" : "Reset all XP"}
        </Button>
      </div>
      {rpcError && (
        <p className={styles.error} role="alert">
          {rpcError}
        </p>
      )}
    </section>
  );
};

function scoringErrorMessage(err: unknown): string {
  if (err instanceof RootServerException) {
    switch (err.code as LeaderboardError) {
      case LeaderboardError.NOT_ADMIN:
        return "You do not have permission to change settings.";
      case LeaderboardError.INVALID_SETTINGS:
        return err.message || "Invalid settings.";
      default:
        return err.message;
    }
  }
  if (err instanceof Error) return err.message;
  return "An unknown error occurred.";
}
