# Igor Timer - Agent Instructions

A PWA gym interval timer with iOS Safari audio support.

## Quick Reference

### Requires Explicit "YES" From User

- Pushing to **upstream** (idvorkin repo) - always needs PR + human approval
- Force pushing (`--force`, `-f`)
- Removing/deleting tests
- Any action that loses work (hard resets, deleting unmerged branches)

### Allowed Without Approval

- Merging to **origin/main** (idvorkin-ai-tools fork) - this is the agent working repo
- Deleting unused code/files (preserved in git history)

### Session Start

```bash
git fetch origin
git checkout -b feature/your-feature-name  # or checkout existing
git rebase origin/main
just dev  # Start dev server
```

### Session End

```bash
git status && git add <files>
git commit -m "..."
git push
```

---

## Git Workflow

### Remote Setup

| Remote     | Repo                     | Who Can Merge             |
| ---------- | ------------------------ | ------------------------- |
| `origin`   | idvorkin-ai-tools (fork) | Agents directly           |
| `upstream` | idvorkin                 | Humans only (PR required) |

### Branch Naming

```bash
# Good - describes the work
feature/audio-diagnostics
fix/ios-audio-unlock
refactor/timer-hooks

# Avoid
agent-work
```

### Git Rules (Non-Negotiable)

| Rule                 | Why                                               |
| -------------------- | ------------------------------------------------- |
| **No force push**    | Can destroy others' work. Messy history is OK.    |
| **No --no-verify**   | Hooks exist for a reason.                         |
| **Specific adds**    | Use `git add <files>` not `git add -A`.           |
| **git status first** | Always review staged files before committing.     |

---

## Testing

### Commands

```bash
just test        # Unit tests (Vitest)
just build       # Build for production (includes type check)
just deploy      # Deploy to surge.sh
```

### Philosophy

- **Tests > Code** - Users should never find bugs tests could have caught
- Add failing test BEFORE fixing bugs

---

## Architecture

### Key Modules

| Module   | Location                             | Description                       |
| -------- | ------------------------------------ | --------------------------------- |
| Timer    | `src/hooks/useTimer.ts`              | Core interval timer logic         |
| Audio    | `src/services/audioService.ts`       | Global AudioContext (iOS unlock)  |
| Debug    | `src/services/pwaDebugServices.ts`   | Session recorder, bug reporter    |
| Settings | `src/components/AppSettingsModal.tsx`| Debug tools UI                    |

### iOS Audio Architecture

iOS Safari has strict audio requirements. See **[tech/ios-audio-workaround.md](tech/ios-audio-workaround.md)** for full documentation including:
- AudioContext states and unlock mechanisms
- Timeout handling for hung `resume()` calls
- Known iOS quirks and mitigations
- Audio event types for debugging

---

## Debug Tools

Settings → Debug section:

- **Test Sound**: Verify audio works, shows ✓/✗ feedback
- **Download Session Recording**: Export debug data as JSON

### Session Recording

Session names: `igor-timer-{timestamp}-{word}-{word}` (e.g., `igor-timer-1734217890-blue-cat`)

**What's captured:**
- User clicks/interactions
- Audio state changes (typed events above)
- Console errors
- Environment info (browser, device)

**Analyzing a bug report:**

```bash
# Find audio issues
cat session.json | jq '.stateChanges[] | select(.type | startswith("audio:"))'

# Find errors
cat session.json | jq '.stateChanges[] | select(.type == "error")'
```

---

## Convention Updates

**Last reviewed:** 2025-12-15 (chop-conventions @ latest)

Projects using [chop-conventions](https://github.com/idvorkin/chop-conventions) should periodically pull updates and push improvements.
