---
name: root-synthesized-audio
description: Implements synthesized audio (sound effects, tones, music) in Root Apps using the Web Audio API
---

# Synthesized Audio in Root Apps

Use this skill when adding synthesized audio (sound effects, tones, procedural music) to a Root App.

## When to Use

- User wants procedurally generated sounds (blips, sweeps, tones)
- User needs dynamic audio (variable pitch, duration, or parameters)
- User wants musical notes or synthesizer-style sounds
- User prefers not to manage audio files

## Key Concepts

### What is Synthesized Audio?

Synthesized audio is generated programmatically using the Web Audio API's oscillators and audio buffers, rather than loading pre-recorded files. Benefits:
- No file storage or asset management
- Dynamic sounds with variable parameters
- Instant playback (no loading)
- Smaller bundle size

### Root Apps Run in Chromium

Root App clients run in a Chromium-based container, so standard Web Audio API works. The Web Audio API is the recommended approach - existing Root Apps use this rather than `<audio>` elements.

### User Interaction Requirement

**Critical**: Browsers block audio until user interaction. You must:
1. Wait for a user click/tap before initializing audio
2. Call `audioContext.resume()` if the context is suspended

## Architecture

```
User Interaction → Create AudioContext → Create GainNode(s) → Connect to destination
                                              ↓
                    Generate/Load Sounds → AudioBufferSourceNode → Play
```

### Basic Audio Engine

```typescript
export class AudioEngine {
  private context: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private volume: number = 0.5;

  async init(): Promise<void> {
    if (this.context) return;

    this.context = new AudioContext();
    this.masterGain = this.context.createGain();
    this.masterGain.gain.value = this.volume;
    this.masterGain.connect(this.context.destination);

    // Resume if suspended (browser policy)
    if (this.context.state === 'suspended') {
      await this.context.resume();
    }
  }

  getContext(): AudioContext | null {
    return this.context;
  }

  getMasterGain(): GainNode | null {
    return this.masterGain;
  }

  setVolume(value: number): void {
    this.volume = Math.max(0, Math.min(1, value));
    if (this.masterGain) {
      this.masterGain.gain.value = this.volume;
    }
  }

  async resume(): Promise<void> {
    if (this.context && this.context.state === 'suspended') {
      await this.context.resume();
    }
  }

  dispose(): void {
    if (this.context) {
      this.context.close();
      this.context = null;
      this.masterGain = null;
    }
  }
}
```

## Sound Generation (Synthesis)

Root Apps typically **synthesize audio programmatically** rather than loading audio files. This avoids file storage/loading complexity.

### Simple Tone (Oscillator)

```typescript
function playTone(
  context: AudioContext,
  masterGain: GainNode,
  frequency: number,
  duration: number
): void {
  const oscillator = context.createOscillator();
  const gain = context.createGain();

  oscillator.type = 'sine'; // 'sine' | 'square' | 'sawtooth' | 'triangle'
  oscillator.frequency.value = frequency;

  oscillator.connect(gain);
  gain.connect(masterGain);

  const now = context.currentTime;
  gain.gain.setValueAtTime(0.3, now);
  gain.gain.linearRampToValueAtTime(0.001, now + duration);

  oscillator.start(now);
  oscillator.stop(now + duration);
}

// Usage
playTone(audioEngine.getContext()!, audioEngine.getMasterGain()!, 440, 0.3);
```

### Pre-generated Sound Effects

Generate sounds into AudioBuffers for instant playback:

```typescript
class SoundManager {
  private audioContext: AudioContext;
  private masterGain: GainNode;
  private soundBuffers: Map<string, AudioBuffer> = new Map();

  constructor(context: AudioContext, masterGain: GainNode) {
    this.audioContext = context;
    this.masterGain = masterGain;
    this.generateSounds();
  }

  private generateSounds(): void {
    // Generate a blip sound
    this.soundBuffers.set('blip', this.generateBlip(440, 0.1));
    this.soundBuffers.set('error', this.generateBlip(220, 0.2));
  }

  private generateBlip(frequency: number, duration: number): AudioBuffer {
    const sampleRate = this.audioContext.sampleRate;
    const length = Math.floor(sampleRate * duration);
    const buffer = this.audioContext.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < length; i++) {
      const t = i / sampleRate;
      const progress = i / length;
      // Attack and decay envelope
      const envelope = Math.exp(-progress * 4);
      // Sine wave
      data[i] = Math.sin(2 * Math.PI * frequency * t) * envelope * 0.3;
    }

    return buffer;
  }

  playSound(name: string, volume: number = 1.0): void {
    const buffer = this.soundBuffers.get(name);
    if (!buffer) return;

    // Resume context if needed
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }

    const source = this.audioContext.createBufferSource();
    const gainNode = this.audioContext.createGain();

    source.buffer = buffer;
    gainNode.gain.value = volume;

    source.connect(gainNode);
    gainNode.connect(this.masterGain);
    source.start();
  }
}
```

## Separate SFX and Music Volume

For apps with both sound effects and background music:

```typescript
class AudioManager {
  private audioContext: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private musicGain: GainNode | null = null;

  private _soundEnabled: boolean = true;
  private _musicEnabled: boolean = true;
  private _soundVolume: number = 0.5;
  private _musicVolume: number = 0.4;

  ensureInitialized(): boolean {
    if (this.audioContext) return true;

    try {
      this.audioContext = new AudioContext();

      // Master gain
      this.masterGain = this.audioContext.createGain();
      this.masterGain.connect(this.audioContext.destination);

      // Separate channels for SFX and Music
      this.sfxGain = this.audioContext.createGain();
      this.sfxGain.connect(this.masterGain);
      this.sfxGain.gain.value = this._soundVolume;

      this.musicGain = this.audioContext.createGain();
      this.musicGain.connect(this.masterGain);
      this.musicGain.gain.value = this._musicVolume;

      return true;
    } catch (e) {
      console.warn('Failed to initialize audio:', e);
      return false;
    }
  }

  set soundEnabled(value: boolean) {
    this._soundEnabled = value;
    if (this.sfxGain) {
      this.sfxGain.gain.value = value ? this._soundVolume : 0;
    }
  }

  set musicEnabled(value: boolean) {
    this._musicEnabled = value;
    if (this.musicGain) {
      this.musicGain.gain.value = value ? this._musicVolume : 0;
    }
  }
}
```

## Looping Background Music

```typescript
class MusicPlayer {
  private audioContext: AudioContext;
  private musicGain: GainNode;
  private musicSource: AudioBufferSourceNode | null = null;
  private musicBuffer: AudioBuffer | null = null;
  private isPlaying: boolean = false;

  constructor(context: AudioContext, musicGain: GainNode) {
    this.audioContext = context;
    this.musicGain = musicGain;
  }

  setMusicBuffer(buffer: AudioBuffer): void {
    this.musicBuffer = buffer;
  }

  play(): void {
    if (!this.musicBuffer || this.isPlaying) return;

    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }

    this.musicSource = this.audioContext.createBufferSource();
    this.musicSource.buffer = this.musicBuffer;
    this.musicSource.loop = true;
    this.musicSource.connect(this.musicGain);
    this.musicSource.start();
    this.isPlaying = true;
  }

  stop(): void {
    if (this.musicSource) {
      try {
        this.musicSource.stop();
      } catch {
        // Ignore errors if already stopped
      }
      this.musicSource = null;
    }
    this.isPlaying = false;
  }

  fadeOut(durationMs: number = 1000): void {
    if (!this.musicGain || !this.audioContext) return;

    const startTime = this.audioContext.currentTime;
    this.musicGain.gain.linearRampToValueAtTime(0, startTime + durationMs / 1000);

    setTimeout(() => {
      this.stop();
      // Restore gain for next play
      if (this.musicGain) {
        this.musicGain.gain.value = 0.4;
      }
    }, durationMs);
  }
}
```

## Loading Audio Files

For loading pre-recorded audio files, see the `root-audio-files` skill. That skill covers file storage, loading patterns, and supported formats.

This skill focuses on synthesized audio only.

## React Integration

### Handling User Interaction

```tsx
export default function App() {
  const [needsInteraction, setNeedsInteraction] = useState(true);
  const audioEngineRef = useRef<AudioEngine | null>(null);

  const handleInteraction = useCallback(async () => {
    if (!needsInteraction) return;
    setNeedsInteraction(false);

    const audioEngine = new AudioEngine();
    await audioEngine.init();
    audioEngineRef.current = audioEngine;
  }, [needsInteraction]);

  return (
    <div onClick={needsInteraction ? handleInteraction : undefined}>
      {needsInteraction && (
        <div className="start-overlay">
          <button onClick={handleInteraction}>
            Tap to Start
          </button>
        </div>
      )}
      {/* App content */}
    </div>
  );
}
```

### Audio Control UI

```tsx
// Volume slider
<div className="setting-row">
  <label>Volume</label>
  <input
    type="range"
    min={0}
    max={100}
    value={Math.round(volume * 100)}
    onChange={(e) => {
      const newVolume = parseInt(e.target.value) / 100;
      setVolume(newVolume);
      audioEngine?.setVolume(newVolume);
    }}
  />
  <span>{Math.round(volume * 100)}%</span>
</div>

// Sound toggle
<button
  onClick={() => setSoundEnabled(!soundEnabled)}
  title={soundEnabled ? 'Mute' : 'Unmute'}
>
  {soundEnabled ? '🔊' : '🔇'}
</button>

// Music toggle
<button
  onClick={() => setMusicEnabled(!musicEnabled)}
  title={musicEnabled ? 'Pause music' : 'Play music'}
>
  {musicEnabled ? '❚❚' : '▶'}
</button>
```

### Syncing State with Audio Manager

```tsx
const [soundEnabled, setSoundEnabled] = useState(true);
const [musicEnabled, setMusicEnabled] = useState(true);

useEffect(() => {
  audioManager.soundEnabled = soundEnabled;
}, [soundEnabled]);

useEffect(() => {
  audioManager.musicEnabled = musicEnabled;
  if (musicEnabled) {
    audioManager.playMusic();
  } else {
    audioManager.stopMusic();
  }
}, [musicEnabled]);
```

## Common Sound Generation Patterns

### Blip (UI feedback)
```typescript
// Short, punchy tone for button clicks
generateBlip(frequency: 440, duration: 0.1)
```

### Sweep (transitions, level up)
```typescript
// Frequency sweep from low to high
for (let i = 0; i < length; i++) {
  const progress = i / length;
  const freq = startFreq * Math.pow(endFreq / startFreq, progress);
  data[i] = Math.sin(2 * Math.PI * freq * t) * envelope;
}
```

### Thud (drops, impacts)
```typescript
// Low frequency with fast decay + noise
const freq = baseFreq * Math.exp(-progress * 2);
const noise = (Math.random() * 2 - 1) * 0.1;
data[i] = (Math.sin(2 * Math.PI * freq * t) + noise) * envelope;
```

### Arpeggio (success, victory)
```typescript
// Play multiple notes in sequence
const frequencies = [330, 392, 494, 587]; // Notes
const noteLength = duration / frequencies.length;
// Step through frequencies over time
```

## Musical Note Frequencies

```typescript
const noteFrequencies: Record<string, number> = {
  'C4': 261.63, 'C#4': 277.18, 'D4': 293.66, 'D#4': 311.13,
  'E4': 329.63, 'F4': 349.23, 'F#4': 369.99, 'G4': 392.00,
  'G#4': 415.30, 'A4': 440.00, 'A#4': 466.16, 'B4': 493.88,
  'C5': 523.25,
};
```

## Guidelines

1. **Always require user interaction** before creating AudioContext
2. **Use synthesis** over loading files when possible - simpler and faster
3. **Create AudioBufferSourceNode per play** - they're one-shot, not reusable
4. **Separate SFX and music volumes** for better user control
5. **Handle suspended state** - call `audioContext.resume()` after interaction
6. **Track playing state** to prevent duplicate music starts
7. **Clean up** - dispose AudioContext when component unmounts

## Workflow

1. Understand what sounds the user needs (blips, tones, sweeps, music)
2. Create an AudioEngine class to manage the AudioContext
3. Add user interaction handling (overlay or first-click detection)
4. Generate sounds into AudioBuffers using oscillators or direct sample writing
5. Implement play methods connecting sources → gains → destination
6. Add UI controls for volume and mute toggles
7. Sync React state with audio manager
