---
kind: recipe
category: audio
question: How do I ship and play short sound effects from my client, dealing with the autoplay policy and Vite asset bundling?
composes: []
exemplified_by: null
---

# Recipe: Audio Bundled SFX

> *"How do I play a sound effect from my Root client when the user clicks something?"*

The smallest possible client-side audio recipe. Two short WAV files are imported via Vite, played on button click via the Web Audio API. Server is a no-op stub — Root apps require a server in their manifest, but this lesson lives entirely in the client.

The lesson is the **three things every browser audio integration has to deal with**:

1. **Autoplay policy** — browsers block `AudioContext` until a user gesture. Lazy-init on the first `play()`, never at module load.
2. **Decode-once cache** — `decodeAudioData` is async and not free. Decode each asset once into an `AudioBuffer`; create a fresh single-use `BufferSource` per playback.
3. **Vite asset import** — `import url from "./assets/clip.wav"` gets the file fingerprinted, hashed, and bundle-cached. Same call site works in dev (raw URL) and prod (hashed URL) without code changes.

## TL;DR

```
import clickUrl from "./assets/click.wav";
import { play } from "./audio";

<button onClick={() => play(clickUrl)}>Click sound</button>
```

That's the whole user-facing API. The 50 lines of [`client/src/audio.ts`](client/src/audio.ts) are the lesson.

## Composes

This recipe doesn't compose any Root SDK API — it's a pure client-side primitive. No `rootServer.*` calls, no proto, no permissions.

It's listed in the recipes index because audio is one of those things every app eventually wants and every developer first does badly (auto-played `<audio>` elements that get blocked, no buffer cache, no understanding of the gesture rule). Owning the right shape upfront saves later forks from learning the same lessons by trial and error.

## Walkthrough

### 1. The audio files

[`client/src/assets/click.wav`](client/src/assets/click.wav) and [`client/src/assets/ding.wav`](client/src/assets/ding.wav) are 7 KB and 35 KB respectively. They were synthesized once with a small Node script and committed; the recipe owns the files outright (no third-party license to track) and ships them as part of the client bundle.

**WAV, not MP3, for SFX:** WAV decodes instantly. MP3 has audible setup latency on the first play after page load, which feels broken for a "click sound" that's supposed to be immediate. For sub-second clips, WAV's larger byte size is irrelevant — both files together add ~42 KB to the bundle.

**Replacing the sounds:** drop in your own `.wav` and update the import in [`App.tsx`](client/src/App.tsx). Vite handles `.mp3` and `.ogg` identically — change the file extension if you have non-WAV source material. Type stubs for all three formats live in [`client/global.d.ts`](client/global.d.ts).

### 2. The Vite asset import

```typescript
import clickUrl from "./assets/click.wav";
```

`clickUrl` is a string. In dev, it points at the raw asset under `/src/`. In prod, Vite copies the file into `dist/assets/` with a fingerprinted name (`click-a1b2c3d4.wav`) and rewrites the import to that hashed path — long-lived caching, automatic cache-busting on edit.

The TypeScript module declaration in [`global.d.ts`](client/global.d.ts) is what makes this typecheck:

```typescript
declare module "*.wav" {
  const url: string;
  export default url;
}
```

Without that, TypeScript rejects the import. Vite's import works at runtime regardless; the declaration is purely a typecheck nicety.

### 3. The audio module

[`client/src/audio.ts`](client/src/audio.ts) is the recipe's central artifact. Three responsibilities:

**Lazy AudioContext** — constructed inside `play()`, not at module load:

```typescript
if (!context) {
  context = new AudioContext();
}
if (context.state === "suspended") {
  await context.resume();
}
```

The `play()` function only ever runs from a click handler, so by the time it executes, we're inside a user-gesture call stack. Browsers permit `AudioContext` creation in that context.

A common mistake: calling `new AudioContext()` at module load (or in a `useEffect`). On most browsers the AC starts in `suspended` state, and `BufferSource.start()` silently does nothing. The `resume()` call is defensive — Safari especially can leave an AC suspended even after a gesture if it was constructed too early.

**Decode-once cache:**

```typescript
let buffer = buffers.get(url);
if (!buffer) {
  const response = await fetch(url);
  const bytes = await response.arrayBuffer();
  buffer = await context.decodeAudioData(bytes);
  buffers.set(url, buffer);
}
```

`decodeAudioData` parses the WAV header, converts to the `AudioContext`'s native float-32 PCM format, and allocates a typed array. Doing it on every play is wasteful — a 35 KB `ding.wav` decode cost ~1-3 ms even on fast hardware, and stacks up with rapid clicking.

**Single-use BufferSource per playback:**

```typescript
const source = context.createBufferSource();
source.buffer = buffer;
source.connect(context.destination);
source.start();
```

`AudioBufferSourceNode` is single-use — once `start()` is called, the node can't be reused. Construct a fresh one per play. They're cheap; the decoded `AudioBuffer` is the expensive thing and that's shared.

### 4. The UI

[`client/src/App.tsx`](client/src/App.tsx) is button scaffolding around `play(url)`. The two cues are listed declaratively:

```typescript
const CUES: Cue[] = [
  { label: "Click", url: clickUrl },
  { label: "Ding", url: dingUrl },
];
```

Adding a third cue is one entry plus one Vite import.

The status line ("last played: Click @ 14:22:15") exists so the demo is visible to a developer reviewing the recipe with system audio off — it's not a UX requirement, just a debugging affordance.

**Colors come from Root's design tokens, not hardcoded hex.** The styles use `var(--rootsdk-text-primary)`, `var(--rootsdk-border)`, `var(--rootsdk-highlight-light)`, `var(--rootsdk-error)`, etc. — CSS custom properties that the host iframe injects on `document.documentElement`. They update automatically when the user toggles light/dark theme; recipe code never reads or computes a color value. Hardcoded `#666` would look correct on light, wrong on dark, and impossible to fix once shipped. Full token reference: [`docs/llms/app-docs/develop/client/design-system-reference.md`](../../docs/llms/app-docs/develop/client/design-system-reference.md).

### 5. The server

[`server/src/main.ts`](server/src/main.ts):

```typescript
async function onStarting(_state: RootAppStartState): Promise<void> {
  // Intentionally empty — the audio mechanic lives entirely in the client.
}
```

Root apps must declare a server in their manifest. This one does the minimum: a `lifecycle.start` no-op. Forks that compose audio with server behavior (e.g. play a sound in response to a chat trigger) put their wiring inside `onStarting`.

## Does NOT cover

| Concern | Lives in |
|---|---|
| Per-app mute toggle | Out of scope — device/OS volume is the right surface for "off." Forks that want it: read a `localStorage`-backed flag in `play()`, short-circuit if true. ~10 extra lines. |
| Volume slider | Same reason. Forks: insert a `GainNode` between `BufferSource` and `destination`, expose `gainNode.gain.value` to a slider. |
| Concurrent-playback throttling ("only one click sound at a time") | Out of scope — overlapping plays are fine. Forks that want exclusivity: track the last `BufferSource` and call `.stop()` on it before starting a new one. |
| Background music with play/pause/stop transport | Different shape — a `BufferSource` with `loop = true` plus a stored reference for `.stop()`. Future recipe candidate. |
| Server-broadcast cues ("play this sound on every connected client") | Future recipe candidate — composes with the broadcast event SDK. |
| Procedural synthesis (oscillators, no bundled files) | Future recipe candidate — covers `OscillatorNode`, gain envelopes, and "no bundle bloat" trade-offs. |
| MP3 / OGG support | Out of scope as a lesson, but works identically — the `global.d.ts` declarations cover all three formats. Just change the file extension and import. |
| iOS Safari quirks for AudioContext on Lock Screen / backgrounded tabs | Out of scope — most apps don't care, and the workarounds are platform-specific. |

## Build and run

```bash
# From this directory
npm install
npm run build       # builds server + client (Vite bundles the WAVs)

# Then in two terminals, each starting from this recipe root
# (set DEV_TOKEN in server/.env first):
cd server && npm run server      # devhost — terminal 1
# In a separate terminal, also from this recipe root:
cd client && npm run client      # vite — terminal 2
```

Open the client URL Vite prints. Click "Click" or "Ding"; the sound plays and the status line updates. First click is the gesture that unlocks the `AudioContext`; every subsequent click is instant (buffer is cached).
