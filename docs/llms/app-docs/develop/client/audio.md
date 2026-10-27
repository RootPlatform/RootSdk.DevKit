---
path: app-docs/develop/client/audio.md
audience: app
category: guide
summary: Play sound with an `<audio>` element.
---

# Audio

Play sound with an `<audio>` element.

## Add audio files

Put audio files in your client's `public` folder:

```
client/
  public/
    audio/
      theme.mp3
      click.wav
```

`public` is copied into `client/dist`, which `root-manifest.json` deploys:

```json
"package": {
  "client": {
    "deploy": "client/dist"
  }
}
```

Reference a file by relative URL: `audio/theme.mp3`.

Audio counts towards the **100 MiB** package limit. A three and a half minute track is about 8 MiB at 320 kbps.

## Formats

Use MP3 for music and WAV for effects.

Phones play MP3 and WAV. Desktop also plays OGG, FLAC and AAC.

## Play a sound

```ts
const audio = new Audio('audio/theme.mp3');
audio.volume = 0.5;
await audio.play();
```

The element streams the file. A long track starts immediately and is not held in memory.

```ts
audio.loop = true;
audio.pause();
```

In JSX:

```tsx
<audio ref={audioRef} src="audio/theme.mp3" loop />
```

`play()` rejects when the file cannot load:

```ts
try {
  await audio.play();
} catch (error) {
  // The file failed to load.
}
```

## Seeking

Setting `currentTime` works on desktop and iPhone.

On Android, setting `currentTime` past the loaded part of the file can stop playback. The Android client streams package files without a content length.

To seek on Android, load the file into memory:

```ts
const response = await fetch('audio/theme.mp3');
const blob = await response.blob();
const audio = new Audio(URL.createObjectURL(blob));
```

Call `URL.revokeObjectURL` when you change track.

## Web Audio

Web Audio mixes several sources, schedules playback and generates tones.

`decodeAudioData` decodes the whole file before playback. An 8 MiB MP3 becomes about 75 MiB in memory.

On iPhone, the silent switch mutes Web Audio. An `<audio>` element is not muted.

An `AudioContext` can start suspended. A suspended context produces no sound and no error. Await `resume()` before starting a source:

```ts
if (context.state === 'suspended') {
  await context.resume();
}

const source = context.createBufferSource();
source.buffer = buffer;
source.connect(context.destination);
source.start();
```

## Test on a real client

Test on the desktop client and on a phone. On iPhone, test with the handset on silent.