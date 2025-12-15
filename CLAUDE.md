# Igor Timer

A PWA gym interval timer with iOS Safari audio support.

## Quick Start

```bash
just setup      # First-time setup
just dev        # Start dev server
just test       # Run tests
just build      # Build for production
just deploy     # Deploy to surge.sh
```

## Architecture

React + TypeScript PWA with:
- **Interval timer** with work/rest phases
- **Audio feedback** via Web Audio API (iOS Safari compatible)
- **Session recording** for debugging via @idvorkin/pwa-utils
- **Bug reporting** with GitHub integration

### Key Modules

| Module | Location | Description |
|--------|----------|-------------|
| Timer | `src/hooks/useTimer.ts` | Core interval timer logic |
| Audio | `src/services/audioService.ts` | Global AudioContext (iOS unlock) |
| Debug | `src/services/pwaDebugServices.ts` | Session recorder, bug reporter |
| Settings | `src/components/AppSettingsModal.tsx` | Debug tools UI |

## iOS Audio

iOS Safari requires AudioContext to be resumed within a user gesture. The `audioService` handles this automatically:

- Single global AudioContext (Safari limits to 4)
- Auto-unlock on first tap/click
- Handles suspended/interrupted states

## Testing

```bash
npm test              # Unit tests (Vitest)
npm run test:e2e      # E2E tests (Playwright)
```

## Debug Tools

Settings → Debug section:
- **Test Sound**: Verify audio works, logs diagnostic info
- **Download Session Recording**: Export debug data as JSON

Session names: `igor-timer-{timestamp}-{word}-{word}` (e.g., `igor-timer-1734217890-blue-cat`)

## Convention Updates

**Last reviewed:** 2025-12-14 (chop-conventions @ latest)

Projects using chop-conventions should periodically:

1. **Pull updates** - Check https://github.com/idvorkin/chop-conventions for new conventions
2. **Push improvements** - Submit useful patterns back to chop-conventions
3. **Update this date** - After reviewing, update the "Last reviewed" date above
