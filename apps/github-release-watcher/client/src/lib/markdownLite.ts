// ============================================================================
// markdownLite — minimal markdown → plain-text transform for ReleaseCard body
// excerpts.
//
// GitHub release notes are typically markdown; rendering raw "### Core
// Changes" reads as visual noise. A full markdown parser would be heavy
// (and DevKit samples avoid extra UI deps for the standard "no third-party
// stack" reason — see DESIGN.md → Stack), so this strips the most common
// markers in place. Readable enough for a card preview without pulling in
// a parser.
//
// What it handles:
//   # / ## / ### headings   → strip marker, keep text
//   - or * bullets          → "• "
//   `inline code`           → strip backticks
//   **bold** / __bold__     → strip markers (unambiguous; consecutive markers)
//   [text](url)             → text
//
// What it deliberately leaves alone:
//   *italic* / _italic_     — single-marker italic conflicts with code
//                             identifiers (`_NEXT_ERROR_CODE_`, `*args`)
//                             and snake_case file/var names. The cost of
//                             a literal `_word_` showing as italic-marker-
//                             plus-text is much smaller than the cost of
//                             mangling a code identifier into nonsense.
//   ``` code blocks ```     — verbatim; the card's mask-fade clips them
//   tables, images, raw HTML — rare in release notes; pass through
//   #1234 issue references  — preserved (the # isn't a heading marker)
// ============================================================================

export function stripMarkdownLite(text: string): string {
  return text
    // Code fences first — strip ``` (with optional language tag) so the
    // single-backtick regex below doesn't get confused by them. Bun's
    // release notes use ```bash and ```sh fences for install snippets,
    // and leftover backticks were rendering as visual noise.
    .replace(/```[a-zA-Z0-9_-]*\n?/g, "")
    .replace(/^#{1,6}\s+/gm, "")              // # ## ### headings
    .replace(/^[ \t]*[-*]\s+/gm, "• ")         // - or * bullets
    .replace(/`([^`]+)`/g, "$1")              // `code`
    .replace(/\*\*([^*]+)\*\*/g, "$1")        // **bold**
    .replace(/__([^_]+)__/g, "$1")            // __bold__
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")  // [text](url) → text
    .replace(/\n{3,}/g, "\n\n")                // collapse blank-line runs
    .trim();
}
