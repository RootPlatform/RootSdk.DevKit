import React, { useCallback, useEffect, useRef, useState } from "react";
import { moderationServiceClient } from "@moderation/gen-client";
import { Word, WordCategory } from "@moderation/gen-shared";
import { withClientRetry } from "../../lib/retry";
import { Button } from "../../components/Button";
import { InlineConfirm } from "../../components/InlineConfirm";
import { Panel } from "../../components/Panel";
import { Badge } from "../../components/Badge";
import { ShowWordListGate } from "../../components/ShowWordListGate";
import { Loader } from "../../components/Loader";
import { Toggle, styles } from "../Settings";

interface Props {
  title: string;
  description: string;
  category: WordCategory;
  maxLength: number;
  // Display label for the count badge in the panel header (e.g. "189 words").
  countLabel: string;
  // When true, the word list body is hidden behind a Show/Hide gate. Used
  // for the custom-words list to avoid splashing offensive content on
  // an admin's screen by default.
  gateContents: boolean;
  onChanged: () => void;
}

const PAGE_SIZE = 50;

export const WordListPanel: React.FC<Props> = ({
  title,
  description,
  category,
  maxLength,
  countLabel,
  gateContents,
  onChanged,
}) => {
  const [search, setSearch] = useState("");
  const [words, setWords] = useState<Word[]>([]);
  const [cursor, setCursor] = useState("");
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);
  const [newText, setNewText] = useState("");
  const [error, setError] = useState<string | undefined>(undefined);
  // ids currently in two-step-confirm mode. Keyed by stringified bigint id
  // so Set works.
  const [pendingRemove, setPendingRemove] = useState<Set<string>>(new Set());
  // Bulk-import disclosure: collapsed by default since most admins
  // never need it. Open via "Import" button; commit clears the textarea.
  const [importOpen, setImportOpen] = useState(false);
  const [importText, setImportText] = useState("");
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<
    { added: number; duplicates: number; invalid: number } | undefined
  >(undefined);
  const seqRef = useRef(0);

  const fetchPage = useCallback(
    async (cursorArg: string, replace: boolean) => {
      const mySeq = ++seqRef.current;
      setLoading(true);
      try {
        const r = await withClientRetry(() =>
          moderationServiceClient.listWords({
            category,
            search,
            cursor: cursorArg,
            pageSize: PAGE_SIZE,
          }),
        );
        if (mySeq !== seqRef.current) return;
        setWords((prev) => (replace ? r.words : [...prev, ...r.words]));
        setCursor(r.nextCursor);
        setTotal(r.totalMatches);
        setError(undefined);
      } catch (err) {
        if (mySeq !== seqRef.current) return;
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        if (mySeq === seqRef.current) setLoading(false);
      }
    },
    [category, search],
  );

  // Eager-load the body on mount when not gated. When gated, the
  // ShowWordListGate's body only renders after the user reveals it; the
  // useEffect below handles that case via mountedRef.
  const mountedRef = useRef(false);
  useEffect(() => {
    if (mountedRef.current) {
      void fetchPage("", true);
    }
  }, [fetchPage]);

  const onAdd = async () => {
    const text = newText.trim();
    if (!text) return;
    setAdding(true);
    setError(undefined);
    try {
      await withClientRetry(() =>
        moderationServiceClient.addWord({ category, text }),
      );
      setNewText("");
      mountedRef.current = true;
      await fetchPage("", true);
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setAdding(false);
    }
  };

  const onToggle = async (word: Word) => {
    try {
      await withClientRetry(() =>
        moderationServiceClient.setWordEnabled({
          id: word.id,
          enabled: !word.enabled,
        }),
      );
      // Optimistic local update — saves a refetch on the common case of
      // toggling a single word.
      setWords((prev) =>
        prev.map((w) =>
          w.id === word.id ? { ...w, enabled: !w.enabled } : w,
        ),
      );
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  const onImport = async () => {
    if (!importText.trim()) return;
    setImporting(true);
    setError(undefined);
    try {
      // Send the textarea content as a single entry — the server splits
      // on commas + newlines internally. Lets us preserve any internal
      // commas the admin intentionally typed in a single word (rare but
      // possible) without us second-guessing.
      const r = await withClientRetry(() =>
        moderationServiceClient.importWords({
          category,
          texts: [importText],
        }),
      );
      setImportResult({
        added: r.addedCount,
        duplicates: r.duplicateCount,
        invalid: r.invalidCount,
      });
      setImportText("");
      mountedRef.current = true;
      await fetchPage("", true);
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setImporting(false);
    }
  };

  const onRemove = async (word: Word) => {
    try {
      await withClientRetry(() =>
        moderationServiceClient.removeWord({ id: word.id }),
      );
      setWords((prev) => prev.filter((w) => w.id !== word.id));
      setTotal((t) => Math.max(0, t - 1));
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  // Triggered the first time the gate is revealed; loads the initial page.
  const handleRevealOnce = () => {
    if (mountedRef.current) return;
    mountedRef.current = true;
    void fetchPage("", true);
  };

  const body = (
    <>
      <div className={styles.wordAddRow}>
        <input
          className={styles.input}
          type="text"
          placeholder="Add a word…"
          aria-label={`Add a word to the ${title.toLowerCase()}`}
          maxLength={maxLength}
          value={newText}
          onChange={(e) => setNewText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") void onAdd();
          }}
          style={{ flex: 1, minWidth: 0 }}
        />
        <Button
          variant="primary"
          disabled={adding || !newText.trim()}
          onClick={() => void onAdd()}
        >
          {adding ? "Adding…" : "Add"}
        </Button>
      </div>
      {error && <div className={styles.error}>{error}</div>}
      {/* Bulk-import disclosure. Sits visually attached to the Add row
          above (small top margin, larger bottom margin) so the "Or
          paste a list…" copy reads as an alternative to typing one
          word at a time, not as a bridge to the Search row below.
          The "Or " prefix + "paste" verb telegraph the relationship +
          the textarea-not-file-picker interaction; both were unclear
          when the toggle just said "Import a list…". */}
      <div className={styles.importRow}>
        {!importOpen ? (
          <button
            type="button"
            className={styles.importToggle}
            onClick={() => {
              setImportResult(undefined);
              setImportOpen(true);
            }}
          >
            Or paste a list…
          </button>
        ) : (
          <div className={styles.importPanel}>
            <textarea
              className={styles.importTextarea}
              placeholder="Paste words separated by commas or newlines…"
              aria-label={`Bulk import to the ${title.toLowerCase()}`}
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              disabled={importing}
              rows={4}
            />
            <div className={styles.importActions}>
              <Button
                variant="default"
                onClick={() => {
                  setImportOpen(false);
                  setImportText("");
                }}
                disabled={importing}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={() => void onImport()}
                disabled={importing || !importText.trim()}
              >
                {importing ? "Importing…" : "Import"}
              </Button>
            </div>
          </div>
        )}
        {importResult && (
          <div className={styles.importResult} role="status">
            Added {importResult.added}
            {importResult.duplicates > 0 &&
              `, ${importResult.duplicates} duplicate${importResult.duplicates === 1 ? "" : "s"}`}
            {importResult.invalid > 0 &&
              `, ${importResult.invalid} invalid`}
            .
          </div>
        )}
      </div>
      <div className={styles.searchRow}>
        <input
          className={styles.input}
          type="text"
          placeholder="Search words…"
          aria-label={`Search ${title.toLowerCase()}`}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <span className={styles.searchRowMeta}>
          {total} {total === 1 ? "word" : "words"}
        </span>
      </div>
      <div className={styles.wordList}>
        {loading && words.length === 0 ? (
          <Loader />
        ) : words.length === 0 ? (
          <div className={styles.emptyMessage}>
            {search ? "No matches." : "No words yet. Add one above."}
          </div>
        ) : (
          words.map((w) => {
            const idKey = w.id.toString();
            const isPending = pendingRemove.has(idKey);
            if (isPending) {
              return (
                <div
                  key={idKey}
                  className={styles.wordRow}
                  style={{ display: "block" }}
                >
                  <InlineConfirm
                    prompt={`Remove "${w.text}" from the word list?`}
                    commitLabel="Remove"
                    onCancel={() =>
                      setPendingRemove((prev) => {
                        const next = new Set(prev);
                        next.delete(idKey);
                        return next;
                      })
                    }
                    onCommit={async () => {
                      await onRemove(w);
                      setPendingRemove((prev) => {
                        const next = new Set(prev);
                        next.delete(idKey);
                        return next;
                      });
                    }}
                  />
                </div>
              );
            }
            return (
              <div key={idKey} className={styles.wordRow}>
                <span
                  className={`${styles.wordText} ${
                    !w.enabled ? styles.wordTextDisabled : ""
                  }`}
                >
                  {w.text}
                </span>
                <Toggle
                  checked={w.enabled}
                  onChange={() => void onToggle(w)}
                />
                <Button
                  variant="iconDanger"
                  aria-label="Remove word"
                  onClick={() =>
                    setPendingRemove((prev) => new Set(prev).add(idKey))
                  }
                >
                  Delete
                </Button>
              </div>
            );
          })
        )}
      </div>
      {cursor && (
        <Button
          disabled={loading}
          onClick={() => void fetchPage(cursor, false)}
        >
          {loading ? "Loading…" : "Load more"}
        </Button>
      )}
    </>
  );

  return (
    <Panel
      title={title}
      description={description}
      action={<Badge variant="default">{countLabel}</Badge>}
    >
      {gateContents ? (
        <GateWrapper onReveal={handleRevealOnce}>{body}</GateWrapper>
      ) : (
        <EagerLoader fetchPage={fetchPage} mountedRef={mountedRef}>
          {body}
        </EagerLoader>
      )}
    </Panel>
  );
};

// Renders the gate; signals reveal upward so the parent kicks the first
// fetch only when the user actually opens the list.
const GateWrapper: React.FC<{
  onReveal: () => void;
  children: React.ReactNode;
}> = ({ onReveal, children }) => {
  return (
    <ShowWordListGate>
      <RevealOnceEffect onReveal={onReveal} />
      {children}
    </ShowWordListGate>
  );
};

const RevealOnceEffect: React.FC<{ onReveal: () => void }> = ({ onReveal }) => {
  useEffect(() => {
    onReveal();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
};

// For non-gated panels (allowed words): kick the first fetch on mount.
const EagerLoader: React.FC<{
  fetchPage: (cursor: string, replace: boolean) => Promise<void>;
  mountedRef: React.MutableRefObject<boolean>;
  children: React.ReactNode;
}> = ({ fetchPage, mountedRef, children }) => {
  useEffect(() => {
    if (mountedRef.current) return;
    mountedRef.current = true;
    void fetchPage("", true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return <>{children}</>;
};
