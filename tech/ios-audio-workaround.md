# iOS Web Audio Architecture

## The Problem

iOS Safari requires `AudioContext` to be created and resumed **within a user gesture** (tap/click). If the context is not unlocked properly, audio silently fails.

**Key constraints:**
- Safari allows max 4 AudioContext instances per page
- Context starts in "suspended" state on iOS
- Context enters "interrupted" state when tab switches or screen locks
- Must call `resume()` within user gesture context

## The Solution: Global AudioContext Service

We use a singleton `AudioService` that:

1. **Single shared context** - Reuses one AudioContext (respects Safari's limit)
2. **Auto-unlock listeners** - Attaches to `touchstart`, `click`, `keydown`, etc.
3. **Self-cleaning** - Removes listeners after first successful unlock
4. **Handles all states** - suspended, interrupted, closed, running

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  AudioService (Singleton)                src/services/      │
│  ├─ Creates AudioContext on first use                       │
│  ├─ Attaches unlock listeners to document.body              │
│  ├─ Handles suspended/interrupted/closed states             │
│  └─ Self-cleans listeners after unlock                      │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
              Any component or hook can use:
              audioService.playBeep(frequency, duration, type, volume)
```

## AudioContext States

| State | Meaning | How It Happens | Action |
|-------|---------|----------------|--------|
| `suspended` | iOS default on creation | New context | Call `resume()` in user gesture |
| `running` | Ready to play | After successful resume | Good to go |
| `interrupted` | iOS paused it | Tab switch, screen lock | Call `resume()` |
| `closed` | Permanently closed | After `close()` called | Create new context |

## Usage

```typescript
import { audioService } from '../services/audioService';

// Simple beep (440Hz, 200ms)
audioService.playBeep(440, 0.2);

// Custom sound
audioService.playBeep(880, 0.15, 'square', 0.5);

// Prime on app load (optional - attaches unlock listeners early)
audioService.prime();
```

## Key Implementation Details

### Auto-Unlock Pattern

```typescript
// Global unlock listeners - attach once, remove after first unlock
const events = ["touchstart", "touchend", "mousedown", "keydown", "click"];
events.forEach(e => document.body.addEventListener(e, attemptUnlock, { passive: true }));

// attemptUnlock checks state and calls resume()
// On success, removes all listeners
```

### playBeep Pattern

```typescript
playBeep(frequency, duration, type, volume) {
  const ctx = this.getContext();

  // Try resume if needed (within user gesture)
  if (ctx.state === "suspended" || ctx.state === "interrupted") {
    ctx.resume();  // Fire and forget - we're in gesture context
  }

  // Only play if running
  if (ctx.state !== "running") return;

  // Create and play oscillator...
}
```

## Why This Works

1. **First sound is always user-triggered** - Button taps are user gestures
2. **Global listeners as backup** - If context gets interrupted, any tap unlocks it
3. **Single context** - Reused across all sounds, never hits Safari's 4-context limit
4. **Self-healing** - Closed context gets recreated, interrupted gets resumed

## References

- [Web Audio API Best Practices - MDN](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Best_practices)
- [Unlock Web Audio in Safari - Matt Montag](https://www.mattmontag.com/web/unlock-web-audio-in-safari-for-ios-and-macos)
- [Unlocking Web Audio the Smarter Way - HackerNoon](https://hackernoon.com/unlocking-web-audio-the-smarter-way-8858218c0e09)
- [BaseAudioContext.state - MDN](https://developer.mozilla.org/en-US/docs/Web/API/BaseAudioContext/state)
