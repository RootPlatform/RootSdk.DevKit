// contentFilter — text normalization + word-list matching for the content
// rule. Pure functions, no DB calls; the caller wires in the word lists.
//
// normalize(text) folds the input into a canonical form so trivial
// obfuscations (case, l33t-speak, repeated separators) don't slip past:
//
//   "Hello, World!"   →  "hello world"
//   "S H i T"         →  "shit"
//   "h@ck3r"          →  "hacker"
//
// The same normalization is applied to stored word-list entries (see
// wordListStore.addWord) so matching becomes a substring check on
// already-normalized text.
//
// matchCompiled() runs a single compiled-regex match per category instead
// of looping per term. The pattern is a flat alternation of escaped term
// strings, compiled once on word-list change (see wordListStore for the
// invalidation hook). Per-message work collapses from O(text × terms) to
// one regex-engine pass — V8 handles flat alternation efficiently and the
// escape step prevents any regex-DoS surface from user-supplied custom
// words (no nested quantifiers possible).
//
// Allowed-words cancellation: an allowed match must envelope the bad
// match's span. Otherwise "scunthorpe" wouldn't cancel a hit on "cunt"
// inside "scunthorpe," which is the whole point of the allowed list.

const LEET_MAP: Record<string, string> = {
  "0": "o",
  "1": "i",
  "3": "e",
  "4": "a",
  "5": "s",
  "7": "t",
  "@": "a",
  $: "s",
  "!": "i",
};

// Normalize: lowercase, fold leet substitutions, drop non-alphanumeric, and
// collapse whitespace. The result is a single space-separated token stream
// suitable for substring matching against pre-normalized word-list entries.
//
// The substring approach is intentionally lenient — "ban" matches inside
// "banana." The allowed-words list is the canonical escape hatch for
// false positives, mirroring how every word-list moderator handles the
// classic Scunthorpe-style edge case.
//
// NFKC first folds Unicode compatibility characters into their canonical
// equivalents before lowercasing. This catches a real evasion class: full-
// width letters ("ｓｌｕｒ" → "slur"), ligatures ("ﬁle" → "file"), and
// many compatibility-decomposable variants. It does NOT cover homoglyph
// attacks across scripts (Cyrillic "а" vs Latin "a") — those need a
// separate confusables map and are out of scope for the sample. Word-list
// entries flow through the same normalize() path on add (see
// wordListStore.addWord), so stored terms and message text agree.
export function normalize(text: string): string {
  if (!text) return "";
  const nfkc = text.normalize("NFKC");
  let out = "";
  let lastWasSpace = true;
  for (const ch of nfkc.toLowerCase()) {
    const folded = LEET_MAP[ch] ?? ch;
    if (/[a-z0-9]/.test(folded)) {
      out += folded;
      lastWasSpace = false;
    } else if (!lastWasSpace) {
      out += " ";
      lastWasSpace = true;
    }
  }
  return out.trim();
}

export interface MatchResult {
  // The term in the word list that matched.
  matchedTerm: string;
}

// Compile a flat alternation of escaped terms. Returns undefined for an
// empty list so callers can skip the match call entirely. The escape pass
// strips any user-supplied regex metacharacters — flat alternation has no
// catastrophic-backtracking failure mode in V8's regex engine.
export function compileAlternation(
  terms: readonly string[],
): RegExp | undefined {
  const filtered = terms.filter((t) => t.length > 0);
  if (filtered.length === 0) return undefined;
  const escaped = filtered.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  return new RegExp(escaped.join("|"));
}

// Run a single compiled-regex match over `normalizedText`. Returns the
// matched substring + its position, or undefined for no match. The caller
// then runs the allowed-words cancellation check.
export function matchCompiled(
  normalizedText: string,
  rulePattern: RegExp | undefined,
  allowedPattern: RegExp | undefined,
): MatchResult | undefined {
  if (!rulePattern || !normalizedText) return undefined;
  const m = rulePattern.exec(normalizedText);
  if (!m) return undefined;
  if (
    allowedPattern &&
    allowedCancels(allowedPattern, normalizedText, m.index, m[0])
  ) {
    return undefined;
  }
  return { matchedTerm: m[0] };
}

// Walk every allowed-pattern match in `text`. If any match span envelopes
// the bad-match span [matchIdx, matchIdx+matchedTerm.length), cancel.
//
// We re-create the regex with the `g` flag so `exec` advances `lastIndex`
// across the full text; the input `allowed` may have been compiled without
// `g` (compileAlternation doesn't set it) so callers' reuse stays safe.
function allowedCancels(
  allowed: RegExp,
  text: string,
  matchIdx: number,
  matchedTerm: string,
): boolean {
  const re = new RegExp(allowed.source, "g");
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const start = m.index;
    const end = start + m[0].length;
    if (start <= matchIdx && end >= matchIdx + matchedTerm.length) {
      return true;
    }
    // Guard against zero-width matches (shouldn't happen with our shape,
    // but cheap insurance against an infinite loop).
    if (m[0].length === 0) re.lastIndex++;
  }
  return false;
}
