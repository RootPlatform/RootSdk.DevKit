import React, { useCallback, useEffect, useRef, useState } from "react";
import { RootServerException } from "@rootsdk/client-app";
import {
  releaseWatcherServiceClient,
} from "@githubreleasewatcher/gen-client";
import { ReleaseWatcherError } from "@githubreleasewatcher/gen-shared";
import styles from "./Settings.module.css";
import { AdminOnly } from "../components/AdminOnly";
import { Button } from "../components/Button";
import { Loader } from "../components/Loader";
import { QueryError } from "../components/QueryError";
import { RepoRow } from "../components/RepoRow";
import { TextInput } from "../components/TextInput";
import { Icon } from "../components/Icon";
import { RepoProvider, useRepos } from "../contexts/RepoContext";
import { MAX_REPOS } from "../lib/limits";

// ============================================================================
// Settings view — admin-only. Single page (no tab bar). Layout per
// DESIGN.md → Settings:
//
//   Watching N of 10 repos          (count header; status line)
//
//   ┌─ owner/name ──────────────┐
//   │ [interval][pre][Test][X]  │   ← RepoRow (per watched repo)
//   │ ✓ Last polled 2m ago       │
//   └────────────────────────────┘
//   ...
//
//   + Add repository                (hidden when count = 10)
//
// Admins are managed via Root's native Global Settings UI (manifest
// setting `general.admins`) — NOT in this app's Settings.
// ============================================================================

export const Settings: React.FC = () => {
  return (
    <AdminOnly>
      <RepoProvider>
        <SettingsBody />
      </RepoProvider>
    </AdminOnly>
  );
};

const SettingsBody: React.FC = () => {
  const { repos, loading, error, reload } = useRepos();

  // Adding state lives at the view level (not on a child component) because
  // the "+ Add repository" button must hide entirely while the input is
  // open, and the input must auto-collapse once the new row appears in
  // the repos list.
  const [adding, setAdding] = useState(false);
  const [addUrl, setAddUrl] = useState("");
  const [addError, setAddError] = useState<string | undefined>(undefined);
  const [addPending, setAddPending] = useState(false);
  const addInputRef = useRef<HTMLInputElement>(null);

  // Auto-focus the input when adding opens.
  useEffect(() => {
    if (adding && addInputRef.current) {
      addInputRef.current.focus();
    }
  }, [adding]);

  const handleStartAdd = useCallback(() => {
    setAdding(true);
    setAddUrl("");
    setAddError(undefined);
  }, []);

  const handleCancelAdd = useCallback(() => {
    setAdding(false);
    setAddUrl("");
    setAddError(undefined);
  }, []);

  const handleSaveAdd = useCallback(async () => {
    const url = addUrl.trim();
    if (!url) return;
    setAddPending(true);
    setAddError(undefined);
    try {
      await releaseWatcherServiceClient.addRepo({ url });
      // Broadcast-driven reconciliation pattern: the RPC's success means
      // the row is persisted server-side; the UI row appears via
      // RepoContext when the RepoListChanged broadcast lands (admin
      // audience), and the home view's count bumps when RepoAdded lands
      // (public audience). We deliberately do NOT await either broadcast
      // here — the input-collapse UX should fire as soon as the server
      // confirms; coupling it to broadcast arrival would leave the form
      // open during slow ticks. If a broadcast is missed (transient
      // WebSocket gap, slow delivery), the next GetSettings round-trip
      // — triggered by reload(), navigation, or a subsequent edit —
      // reconciles the list.
      setAdding(false);
      setAddUrl("");
      setAddError(undefined);
    } catch (err: unknown) {
      setAddError(messageForAddError(err));
    } finally {
      setAddPending(false);
    }
  }, [addUrl]);

  // Per-row remove. Wraps the RemoveRepo RPC so RepoRow doesn't need to
  // know the proto client. Errors here surface inline on the row (RepoRow
  // re-opens the confirm pair) rather than a global banner.
  const handleRemove = useCallback(async (owner: string, name: string) => {
    await releaseWatcherServiceClient.removeRepo({ owner, name });
    // No local state update — RepoListChanged updates the list.
  }, []);

  if (loading) return <Loader />;
  if (error) return <QueryError onRetry={reload} message={error.message} />;

  const atCap = repos.length >= MAX_REPOS;
  const canShowAdd = adding && !atCap;
  const canShowAddButton = !adding && !atCap;

  // Header text per DESIGN.md → Copy:
  //   "Watching N of 10 repos"  (default)
  //   "Watching 10 of 10 repos · remove one to add another"  (at cap)
  const headerText = atCap
    ? `Watching ${MAX_REPOS} of ${MAX_REPOS} repos · remove one to add another`
    : `Watching ${repos.length} of ${MAX_REPOS} repos`;

  return (
    <div className={styles.column}>
      <div className={styles.header}>{headerText}</div>

      <div className={styles.list}>
        {repos.map((repo) => (
          <RepoRow
            key={`${repo.owner}/${repo.name}`}
            repo={repo}
            onRemove={handleRemove}
          />
        ))}

        {canShowAdd && (
          <div className={styles.addRow}>
            {/* Single-row form: input + Add + cancel-X. Submit on Enter
                or Add-button click. No onBlur auto-save — explicit
                affordances are clearer and avoid the blur/cancel race. */}
            <div className={styles.addInputRow}>
              <TextInput
                ref={addInputRef}
                value={addUrl}
                onChange={setAddUrl}
                placeholder="https://github.com/owner/repo"
                disabled={addPending}
                invalid={!!addError}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    void handleSaveAdd();
                  } else if (e.key === "Escape") {
                    handleCancelAdd();
                  }
                }}
              />
              <Button
                variant="text"
                onClick={handleCancelAdd}
                disabled={addPending}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={() => void handleSaveAdd()}
                disabled={!addUrl.trim() || addPending}
              >
                {addPending ? "Adding…" : "Add"}
              </Button>
            </div>
            {addError && !addPending && (
              <div className={styles.addError} role="alert">
                {addError}
              </div>
            )}
          </div>
        )}

        {canShowAddButton && (
          <button
            type="button"
            className={styles.addButton}
            onClick={handleStartAdd}
          >
            <Icon name="Plus" size={16} />
            <span>Add repository</span>
          </button>
        )}
      </div>
    </div>
  );
};

// Map an AddRepo RPC failure to the inline error string. Server-defined
// error codes use the proto enum; transport failures fall through to a
// generic message. Copy comes from DESIGN.md → Copy → Add-repository input.
function messageForAddError(err: unknown): string {
  if (err instanceof RootServerException) {
    switch (err.code) {
      case ReleaseWatcherError.INVALID_URL:
        return "Not a github.com repository URL.";
      case ReleaseWatcherError.REPO_NOT_FOUND:
        return "Repository not found. Double-check the URL.";
      case ReleaseWatcherError.GITHUB_RATE_LIMITED:
        return "GitHub rate limit reached. Try again in a minute.";
      case ReleaseWatcherError.GITHUB_UNREACHABLE:
        return "Couldn't reach GitHub. Check connection and retry.";
      case ReleaseWatcherError.MAX_REPOS_REACHED:
        return `Maximum ${MAX_REPOS} repositories. Remove one to add another.`;
      case ReleaseWatcherError.REPO_ALREADY_WATCHED:
        return "This repository is already being watched.";
      case ReleaseWatcherError.NOT_ADMIN:
        return "You do not have permission to add repositories.";
    }
  }
  return err instanceof Error ? err.message : "Couldn't add repository.";
}
