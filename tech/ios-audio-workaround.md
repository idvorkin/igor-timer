# iOS Web Audio Architecture

iOS Safari has strict audio requirements. The `audioService` handles all edge cases.

## The Problem

iOS Safari requires `AudioContext` to be created and resumed **within a user gesture** (tap/click). If the context is not unlocked properly, audio silently fails.

**Key constraints:**
- Safari allows max 4 AudioContext instances per page
- Context starts in "suspended" state on iOS
- Context enters "interrupted" state when tab switches or screen locks
- Must call `resume()` within user gesture context
- `resume()` can hang forever on iOS Safari

## The Solution: Global AudioContext Service

We use a singleton `AudioService` (`src/services/audioService.ts`) that:

1. **Single shared context** - Reuses one AudioContext (respects Safari's limit)
2. **Persistent unlock listeners** - Attaches to `touchstart`, `click`, `keydown`, etc.
3. **Handles all states** - suspended, interrupted, closed, running
4. **Timeout protection** - All `resume()` calls timeout after 3 seconds

## AudioContext States

| State | Meaning | Can Play? | How It Happens |
|-------|---------|-----------|----------------|
| `suspended` | Default on iOS - waiting for user gesture | No | New context |
| `running` | Active and processing audio | Yes | After successful resume |
| `interrupted` | iOS paused audio (call, Siri, tab switch) | No | Tab switch, phone call |
| `closed` | Destroyed, cannot recover | No | After `close()` called |

## Unlock Mechanisms (3 layers of defense)

### 1. User Gesture Listeners
Every tap/click/keydown attempts `resume()`:
- Listeners stay attached **forever** (don't remove after success)
- iOS can re-interrupt at any time, so we retry on every gesture

```typescript
const events = ["touchstart", "touchend", "mousedown", "keydown", "click"];
events.forEach(e => document.body.addEventListener(e, attemptUnlock, { passive: true }));
// Note: listeners are NEVER removed - iOS can interrupt at any time
```

### 2. Visibility Change Listener
When user returns to tab:
- iOS sets `interrupted` on tab switch
- Auto-resume when `visibilityState === "visible"`

```typescript
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") {
    attemptResume("visibility");
  }
});
```

### 3. Timer Start Hook
`useTimer.start()` calls `ensureRunning()`:
- **Critical**: MUST happen during the click gesture
- Timer intervals run outside gesture context, so unlock first

## Timeout Handling

iOS Safari `resume()` can hang forever. All resume calls use `withTimeout()`:

```typescript
withTimeout(ctx.resume(), 3000, "Resume timeout (iOS hung)")
```

Session recording will show `audio:resume_failed` with timeout error instead of hanging forever.

## Known iOS Quirks

| Issue | Behavior | Mitigation |
|-------|----------|------------|
| Silent switch | Mutes all Web Audio | Can't detect - user must check |
| Phone calls | `interrupted`, `resume()` fails until call ends | Retry on next gesture |
| Tab switch | May go `interrupted` | Visibility listener auto-resumes |
| `resume()` hangs | Promise never resolves | 3-second timeout |
| Safari limit | Max 4 AudioContext per page | Single shared instance |

## Usage

```typescript
import { audioService } from '../services/audioService';

// Simple beep (440Hz, 200ms)
audioService.playBeep(440, 0.2);

// Custom sound
audioService.playBeep(880, 0.15, 'square', 0.5);

// Prime on app load (optional - attaches unlock listeners early)
audioService.prime();

// Ensure running before timer starts (call in click handler)
await audioService.ensureRunning();
```

## Audio Event Types (for debugging)

Session recording captures these events:

| Event Type | Trigger | Details |
|------------|---------|---------|
| `audio:resuming` | Starting resume | `{trigger: "gesture"|"visibility", fromState}` |
| `audio:resumed` | Resume succeeded | `{newState}` |
| `audio:resume_failed` | Resume failed/timeout | `{error, fromState}` |
| `audio:played` | Beep played | `{frequency, state}` |
| `audio:play_skipped` | Couldn't play | `{reason, state}` |
| `audio:play_error` | Oscillator failed | `{error, frequency}` |
| `audio:test_requested` | Test button clicked | `{initialState, contextExists}` |
| `audio:test_played` | Test succeeded | `{state}` |
| `audio:test_failed` | Test failed | `{error, reason}` |

**Analyzing audio issues from session recording:**

```bash
cat session.json | jq '.stateChanges[] | select(.type | startswith("audio:"))'
```

## References

- [Web Audio API Best Practices - MDN](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Best_practices)
- [Unlock Web Audio in Safari - Matt Montag](https://www.mattmontag.com/web/unlock-web-audio-in-safari-for-ios-and-macos)
- [BaseAudioContext.state - MDN](https://developer.mozilla.org/en-US/docs/Web/API/BaseAudioContext/state)
