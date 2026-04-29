import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  releaseWatcherServiceClient,
} from "@githubreleasewatcher/gen-client";
import type { Repo, Release } from "@githubreleasewatcher/gen-shared";
import { PollStatus } from "@githubreleasewatcher/gen-shared";
import styles from "./RepoRow.module.css";
import { Button } from "./Button";
import { NumberInput } from "./NumberInput";
import { Switch } from "./Switch";
import { Icon } from "./Icon";
import { ReleaseCard } from "./ReleaseCard";
import { AutoSaveStatus } from "./AutoSaveStatus";
import { useDebouncedMutation } from "../lib/useDebouncedMutation";
import { formatRelativeTime } from "../lib/relativeTime";
import {
  INTERVAL_CEILING_MINUTES,
  INTERVAL_FLOOR_MINUTES,
} from "../lib/limits";

// ============================================================================
// RepoRow — one row in Settings → Repos.
//
// Layout:
//   ┌─────────────────────────────────────────────────┐
//   │ owner/name      [interval] [☐pre] [pre-release] [🗑]│  controls
//   │ ✓ Last polled 2m ago                            │  status
//   │ ▶ Preview                                       │  disclosure (closed)
//   └─────────────────────────────────────────────────┘
//
// When the Preview disclosure is open, a ReleaseCard renders below it
// showing the latest release fetched on demand. The disclosure is its own
// row (separate from the configuration controls + trash above) so the
// toggle and the preview content sit together — the user complaint about
// the previous "Test/Hide button in the controls row" was that the toggle
// was visually disconnected from the preview content it controlled.
//
// State:
//   - localInterval / localPrerelease: optimistic local mirror of the row's
//     editable fields. Auto-saved via useDebouncedMutation; the parent
//     reflects the latest server values back through `repo` after the save
//     broadcast lands.
//   - confirmRemove: true when the Remove button has been clicked once;
//     swaps the row controls to a Cancel | Remove pair (DESIGN.md →
//     Destructive confirmations). Reverts on Cancel, click outside the
//     row, or on switching to another row's confirm flow.
//   - testPreview: the most recent TestRepo response, or null when the
//     preview isn't open. Cleared on row collapse.
// ============================================================================

interface Props {
  repo: Repo;
  // Parent handles the actual RemoveRepo RPC and the resulting broadcasts —
  // RepoRow only collects the confirmed intent.
  onRemove: (owner: string, name: string) => Promise<void>;
}

export const RepoRow: React.FC<Props> = ({ repo, onRemove }) => {
  // Local mirrors. Initialized from the row props; kept in sync with
  // external updates only when the user isn't actively editing (the
  // NumberInput / Switch handle their own focus-aware sync).
  const [localInterval, setLocalInterval] = useState<number>(repo.pollIntervalMinutes);
  const [localPrerelease, setLocalPrerelease] = useState<boolean>(repo.includePrereleases);

  // No focus-check guard on these resets, deliberately: the visible inputs
  // (NumberInput for interval, Switch for prerelease) each manage their own
  // focus-aware display state internally, so re-syncing the parent's local
  // mirror to the latest repo prop doesn't disturb mid-typing/mid-toggle.
  // The only thing this `setLocal*` does is keep the optimistic value
  // aligned with the broadcast-driven repo prop for any future render that
  // doesn't go through the focused input. Adding a focus-check here would
  // be redundant with the inputs' own logic.
  useEffect(() => {
    setLocalInterval(repo.pollIntervalMinutes);
  }, [repo.pollIntervalMinutes]);
  useEffect(() => {
    setLocalPrerelease(repo.includePrereleases);
  }, [repo.includePrereleases]);

  // Auto-save per editable field — separate hooks so concurrent edits
  // (admin tweaks interval and toggles prerelease in quick succession)
  // don't coalesce into one larger payload that re-stomps unrelated fields.
  const intervalSave = useDebouncedMutation<number>({
    mutationFn: (minutes) =>
      releaseWatcherServiceClient.updateRepoInterval({
        owner: repo.owner,
        name: repo.name,
        pollIntervalMinutes: minutes,
      }),
  });
  const prereleaseSave = useDebouncedMutation<boolean>({
    mutationFn: (flag) =>
      releaseWatcherServiceClient.updateRepoPrerelease({
        owner: repo.owner,
        name: repo.name,
        includePrereleases: flag,
      }),
  });

  const handleIntervalChange = useCallback(
    (n: number) => {
      setLocalInterval(n);
      intervalSave.mutate(n);
    },
    [intervalSave],
  );

  const handlePrereleaseChange = useCallback(
    (b: boolean) => {
      setLocalPrerelease(b);
      prereleaseSave.mutate(b);
    },
    [prereleaseSave],
  );

  // --- Test preview ---------------------------------------------------------

  const [testPreview, setTestPreview] = useState<Release | null>(null);
  const [testLoading, setTestLoading] = useState(false);
  const [testError, setTestError] = useState<Error | undefined>(undefined);

  // Disclosure is "open" whenever there's something to show beneath the
  // toggle: a loaded preview, an in-flight fetch, or an error from the
  // last fetch. Clicking the toggle while open closes everything.
  const previewOpen = !!testPreview || testLoading || !!testError;

  const handleTestClick = useCallback(async () => {
    if (testLoading) return; // ignore clicks while a fetch is in flight
    if (testPreview || testError) {
      // Toggle: if expanded, second click collapses.
      setTestPreview(null);
      setTestError(undefined);
      return;
    }
    setTestLoading(true);
    setTestError(undefined);
    try {
      const response = await releaseWatcherServiceClient.testRepo({
        owner: repo.owner,
        name: repo.name,
      });
      // Per the proto: `release.id === 0` means the repo has no eligible
      // release (e.g., empty repo, or only prereleases with the toggle off).
      if (!response.release || Number(response.release.id) === 0) {
        setTestPreview(null);
        setTestError(new Error("No releases yet for this repository."));
      } else {
        setTestPreview(response.release);
      }
    } catch (err: unknown) {
      setTestError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setTestLoading(false);
    }
  }, [repo.owner, repo.name, testPreview, testError, testLoading]);

  // --- Remove (two-step inline confirm) ------------------------------------

  const [confirmRemove, setConfirmRemove] = useState(false);
  const [removing, setRemoving] = useState(false);
  const rowRef = useRef<HTMLDivElement>(null);

  // Cancel-on-outside-click + Escape-to-cancel. Listen at the document
  // level when the confirm is open and revert on either signal. Also
  // clears when the row unmounts (via the cleanup) — important because
  // confirm state lives at the row level and the row could be replaced
  // if its owner/name pair changes.
  //
  // mousedown (not click) so the dismiss fires before any inadvertent
  // mouseup-triggered action on the target. Escape covers keyboard-only
  // users who don't have an "outside" to click on.
  useEffect(() => {
    if (!confirmRemove) return;
    const onDocClick = (e: MouseEvent) => {
      if (rowRef.current && !rowRef.current.contains(e.target as Node)) {
        setConfirmRemove(false);
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setConfirmRemove(false);
      }
    };
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [confirmRemove]);

  const handleRemoveClick = useCallback(() => {
    setConfirmRemove(true);
  }, []);

  const handleConfirmRemove = useCallback(async () => {
    setRemoving(true);
    try {
      await onRemove(repo.owner, repo.name);
      // No setConfirmRemove(false) — the parent will drop this row from
      // the list; the component unmounts.
    } catch {
      // Parent's onRemove is responsible for surfacing errors; we just
      // close the confirm so the user can retry from a clean state.
      setRemoving(false);
      setConfirmRemove(false);
    }
  }, [onRemove, repo.owner, repo.name]);

  const handleCancelRemove = useCallback(() => {
    setConfirmRemove(false);
  }, []);

  // --- Subtitle -------------------------------------------------------------

  let subtitleNode: React.ReactNode = null;
  if (repo.lastPollStatus === PollStatus.OK && Number(repo.lastPollAt) > 0) {
    // Icons (not unicode characters) so the leading glyph aligns with the
    // chevron in the Preview disclosure below — both are 16px Icons in
    // identical span containers, so left-edges are mechanically equal.
    subtitleNode = (
      <div className={styles.subtitleOk}>
        <Icon name="Checkmark" size={16} />
        <span>Last polled {formatRelativeTime(Number(repo.lastPollAt))}</span>
      </div>
    );
  } else if (repo.lastPollStatus === PollStatus.ERROR) {
    subtitleNode = (
      <div className={styles.subtitleError}>
        <Icon name="Error" size={16} />
        <span>{repo.lastErrorMessage || "Could not reach GitHub."}</span>
      </div>
    );
  }
  // PollStatus.UNSPECIFIED (just-persisted, no poll yet) renders no subtitle.

  // --- Render ---------------------------------------------------------------

  return (
    <div ref={rowRef} className={styles.row}>
      {confirmRemove ? (
        <div className={styles.confirmRow}>
          <span className={styles.confirmPrompt}>
            Remove this repository? Past releases will clear from the feed.
          </span>
          <Button variant="text" onClick={handleCancelRemove} disabled={removing}>
            Cancel
          </Button>
          <Button variant="danger" onClick={handleConfirmRemove} disabled={removing}>
            Remove
          </Button>
        </div>
      ) : (
        <>
          <div className={styles.topLine}>
            <div className={styles.repoPath}>{repo.owner}/{repo.name}</div>
            <div className={styles.controls}>
              <NumberInput
                compact
                value={localInterval}
                onChange={handleIntervalChange}
                min={INTERVAL_FLOOR_MINUTES}
                max={INTERVAL_CEILING_MINUTES}
                hint="minutes"
              />
              <label className={styles.toggleLabel}>
                <Switch
                  checked={localPrerelease}
                  onChange={handlePrereleaseChange}
                  ariaLabel={`Include pre-releases for ${repo.owner}/${repo.name}`}
                />
                <span className={styles.toggleText}>pre-release</span>
              </label>
              <button
                type="button"
                className={styles.removeButton}
                onClick={handleRemoveClick}
                aria-label={`Remove ${repo.owner}/${repo.name}`}
              >
                <Icon name="Delete" size={24} />
              </button>
            </div>
          </div>

          {subtitleNode}

          {/* Auto-save error pills — rare; only on save failure. */}
          <AutoSaveStatus
            error={intervalSave.error}
            onRetry={intervalSave.retry}
            onDismissError={intervalSave.clearError}
          />
          <AutoSaveStatus
            error={prereleaseSave.error}
            onRetry={prereleaseSave.retry}
            onDismissError={prereleaseSave.clearError}
          />

          {/* Preview disclosure — its own row, with a chevron + "Preview"
              label. Click toggles open/close. Open state fetches the
              latest release on demand and shows it below as a ReleaseCard.
              This pattern keeps the verification action separate from the
              configuration controls above; the toggle and the preview
              content sit together so there's no spatial disconnect. */}
          <button
            type="button"
            className={styles.previewToggle}
            onClick={handleTestClick}
            disabled={testLoading}
            aria-expanded={previewOpen}
          >
            <Icon
              name={previewOpen ? "ChevronDown" : "ChevronRight"}
              size={16}
            />
            <span>Preview</span>
            {testLoading && (
              <span className={styles.previewStatus}>· loading…</span>
            )}
          </button>
          {previewOpen && (
            <div className={styles.previewContent}>
              {testError && (
                <div className={styles.testError} role="alert">
                  <Icon name="Error" size={16} />
                  <span>{testError.message}</span>
                </div>
              )}
              {testPreview && <ReleaseCard release={testPreview} />}
            </div>
          )}
        </>
      )}
    </div>
  );
};
