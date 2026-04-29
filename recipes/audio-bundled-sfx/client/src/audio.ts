// ============================================================================
// Recipe: Audio Bundled SFX — audio module
// SDK: none — pure browser Web Audio API
// ============================================================================
//
// Three concerns this module handles in ~50 lines, each one a thing every
// browser-audio integration has to deal with:
//
//   1. Lazy AudioContext.
//      Browsers block AudioContext creation (or auto-suspend it) until a
//      user gesture. Constructing one at module load time produces an AC
//      stuck in the "suspended" state on most browsers, and the first
//      `play()` call silently does nothing. We construct it inside
//      `play()` instead — by the time `play()` runs, a button has been
//      clicked, so we're inside a gesture handler and the AC starts in
//      "running" state.
//
//   2. Decode-once cache.
//      `decodeAudioData` is async and not cheap (it parses the WAV header,
//      converts to the AC's native format, allocates a typed array). We
//      do it once per asset and cache the resulting AudioBuffer. Each
//      `play()` then creates a fresh BufferSource — they're cheap, and
//      a BufferSource can only `start()` once.
//
//   3. Vite asset URLs.
//      The `import clickUrl from "./assets/click.wav"` line at the top of
//      App.tsx is the Vite import that gets the file fingerprinted, hashed,
//      and served from the bundle. The string we hand to `fetch()` here is
//      that fingerprinted URL — works in dev (raw asset) and prod (hashed
//      bundled asset) without recipe-side awareness of the difference.
//
// What this module does NOT do, intentionally:
//   - No mute toggle. Device/OS volume is the right surface for "off."
//     Forks that want per-app mute can wrap `play()` in a check against
//     a `localStorage`-persisted flag and short-circuit. ~10 extra lines.
//   - No volume slider. Same reason as mute.
//   - No concurrent-playback throttling. Each `play()` makes an
//     independent BufferSource; click click click overlaps cleanly.
//     If you want "only one click sound at a time," track the last
//     source and call `.stop()` on it before starting a new one.
// ============================================================================

let context: AudioContext | undefined;
const buffers = new Map<string, AudioBuffer>();

/**
 * Play a sound by its asset URL. The first call is the one that builds the
 * AudioContext and decodes the buffer; subsequent calls reuse both.
 *
 * Returns once playback has STARTED (not finished) — async only because
 * decoding the first time is async. Throws if fetch or decode fails;
 * recipe code wraps in try/catch and logs.
 */
export async function play(url: string): Promise<void> {
  // Lazy-build the AudioContext on first play. Constructed inside a
  // gesture handler (the button click that called us) so the browser
  // permits it to start in "running" state.
  if (!context) {
    context = new AudioContext();
  }

  // Some browsers (Safari especially) start the AC suspended even after a
  // gesture if it was created very early. Resume defensively — no-op if
  // already running.
  if (context.state === "suspended") {
    await context.resume();
  }

  // Decode-once. The Map check covers repeat calls; the await covers
  // the cold path. Concurrent first-plays of the same URL would each
  // start their own fetch+decode — fine for a recipe; production code
  // that cares would dedupe via an in-flight Promise map.
  let buffer = buffers.get(url);
  if (!buffer) {
    const response = await fetch(url);
    const bytes = await response.arrayBuffer();
    buffer = await context.decodeAudioData(bytes);
    buffers.set(url, buffer);
  }

  // BufferSource is single-use — one start() per instance. Construct
  // a fresh one each time; they're cheap (just a wrapper around the
  // shared AudioBuffer).
  const source = context.createBufferSource();
  source.buffer = buffer;
  source.connect(context.destination);
  source.start();
}
