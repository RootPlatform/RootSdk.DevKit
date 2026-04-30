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
// wordListStore.addWord), so matching becomes a simple substring check.
//
// match() returns the first term that matched, or undefined. Allowed-words
// is checked against the SAME normalized input — if an allowed word
// contains the matched bad word as a substring (e.g. "Scunthorpe" contains
// a slur in casual matching, allowed-list entry "scunthorpe" overrides),
// the message passes.

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
export function normalize(text: string): string {
  if (!text) return "";
  let out = "";
  let lastWasSpace = true;
  for (const ch of text.toLowerCase()) {
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

// Iterate the rule list looking for a substring match in `normalizedText`.
// Returns the first hit. allowedTerms cancel a hit when the matched bad
// word is a substring of an allowed term that itself appears in the input.
//
// Allowed-term cancellation is computed inline: a matched bad word "ban"
// at position p is cancelled iff some allowed term contains "ban" as a
// substring AND that allowed term appears in the input around p.
//
// Cost: O(text * sum(rule lengths)). Word lists at community scale are
// in the hundreds; substring scanning at this size is fine. Forks at
// platform scale should swap this for an Aho-Corasick pass.
export function match(
  normalizedText: string,
  ruleTerms: readonly string[],
  allowedTerms: readonly string[],
): MatchResult | undefined {
  if (!normalizedText) return undefined;
  for (const term of ruleTerms) {
    if (!term) continue;
    const idx = normalizedText.indexOf(term);
    if (idx < 0) continue;
    if (isAllowed(normalizedText, idx, term, allowedTerms)) continue;
    return { matchedTerm: term };
  }
  return undefined;
}

function isAllowed(
  text: string,
  matchIdx: number,
  matchedTerm: string,
  allowedTerms: readonly string[],
): boolean {
  for (const allowed of allowedTerms) {
    if (!allowed) continue;
    if (!allowed.includes(matchedTerm)) continue;
    // The allowed term, if it exists in the input, must envelope the match
    // for the cancellation to apply. Otherwise an allowed entry "scunthorpe"
    // wouldn't cancel a hit on "cunt" inside "scunthorpe", which is the
    // whole point of the list.
    let searchFrom = 0;
    while (searchFrom <= text.length) {
      const allowedIdx = text.indexOf(allowed, searchFrom);
      if (allowedIdx < 0) break;
      if (allowedIdx <= matchIdx && allowedIdx + allowed.length >= matchIdx + matchedTerm.length) {
        return true;
      }
      searchFrom = allowedIdx + 1;
    }
  }
  return false;
}
