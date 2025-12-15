/**
 * Global AudioContext Service with iOS Safari Auto-Unlock
 *
 * Provides a reliable way to play Web Audio on all platforms, including iOS Safari
 * which has strict requirements around AudioContext initialization and user gestures.
 *
 * Best Practices Implemented:
 * - Single shared AudioContext (Safari limits to 4 max)
 * - Auto-unlock on first user gesture
 * - Handles suspended/interrupted/closed states
 * - Self-cleaning event listeners after unlock
 * - Records audio events to session recorder for debugging
 *
 * Usage:
 *   import { audioService } from './services/audioService';
 *   audioService.playBeep(440, 0.2);  // Play 440Hz for 200ms
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Best_practices
 * @see https://www.mattmontag.com/web/unlock-web-audio-in-safari-for-ios-and-macos
 */

import { sessionRecorder } from "./pwaDebugServices";

type AudioContextState = "suspended" | "running" | "closed" | "interrupted";

// Audio event types for session recording
type AudioEventType =
	| "audio:played"
	| "audio:play_skipped"
	| "audio:play_error"
	| "audio:resuming"
	| "audio:resumed"
	| "audio:resume_failed"
	| "audio:context_created"
	| "audio:context_closed"
	| "audio:test_requested"
	| "audio:test_played"
	| "audio:test_failed";

// Helper to record audio events to session recorder
function recordAudioEvent(type: AudioEventType, details?: Record<string, unknown>): void {
	sessionRecorder.recordStateChange({
		type,
		timestamp: Date.now(),
		details,
	});
}

// Timeout for resume() calls - iOS Safari can hang indefinitely
const RESUME_TIMEOUT_MS = 3000;

/**
 * Wrap a promise with a timeout - rejects if promise doesn't resolve in time
 * Used because iOS Safari resume() can hang forever
 */
function withTimeout<T>(promise: Promise<T>, ms: number, errorMsg: string): Promise<T> {
	return Promise.race([
		promise,
		new Promise<T>((_, reject) =>
			setTimeout(() => reject(new Error(errorMsg)), ms)
		),
	]);
}

// Convenience functions for common audio events (like swing-analyzer pattern)
export function recordAudioPlayed(frequency: number, state: string): void {
	recordAudioEvent("audio:played", { frequency, state });
}

export function recordAudioPlaySkipped(reason: string, state: string): void {
	recordAudioEvent("audio:play_skipped", { reason, state });
}

export function recordAudioResuming(fromState: string): void {
	recordAudioEvent("audio:resuming", { fromState });
}

export function recordAudioResumed(newState: string): void {
	recordAudioEvent("audio:resumed", { newState });
}

export function recordAudioResumeFailed(error: string, fromState: string): void {
	recordAudioEvent("audio:resume_failed", { error, fromState });
}

export function recordAudioError(error: string, frequency?: number): void {
	recordAudioEvent("audio:play_error", { error, frequency });
}

class AudioService {
	private context: AudioContext | null = null;
	private unlockPromise: Promise<void> | null = null;
	private unlockListenersAttached = false;
	private visibilityListenerAttached = false;
	private resumeInProgress = false; // Prevent parallel resume() calls

	/**
	 * Get or create the global AudioContext
	 */
	private getContext(): AudioContext {
		if (!this.context || this.context.state === "closed") {
			const AudioContextClass =
				window.AudioContext ||
				(window as unknown as { webkitAudioContext: typeof AudioContext })
					.webkitAudioContext;
			this.context = new AudioContextClass();
			recordAudioEvent("audio:context_created", { state: this.context.state });

			// Set up auto-unlock listeners on creation
			this.setupUnlockListeners();
			this.setupVisibilityListener();
		}
		return this.context;
	}

	/**
	 * Destroy context so it can be recreated fresh
	 * Used when iOS audio device fails and context is unrecoverable
	 */
	private destroyContext(): void {
		if (this.context) {
			recordAudioEvent("audio:context_closed", { reason: "destroyed_for_recovery" });
			try {
				this.context.close();
			} catch {
				// Ignore close errors
			}
			this.context = null;
			this.unlockPromise = null;
			this.resumeInProgress = false;
		}
	}

	/**
	 * Set up visibility change listener to resume audio when user returns to tab
	 * iOS Safari may set context to "interrupted" when user switches tabs
	 */
	private setupVisibilityListener(): void {
		if (this.visibilityListenerAttached) return;
		this.visibilityListenerAttached = true;

		document.addEventListener("visibilitychange", () => {
			if (document.visibilityState === "visible" && this.context) {
				const state = this.context.state as AudioContextState;
				if (state === "interrupted" || state === "suspended") {
					// Skip if another resume is already in progress (prevents cascade)
					if (this.resumeInProgress) {
						return;
					}
					this.resumeInProgress = true;
					recordAudioEvent("audio:resuming", { trigger: "visibility", fromState: state });
					withTimeout(this.context.resume(), RESUME_TIMEOUT_MS, "Resume timeout (visibility)")
						.then(() => recordAudioResumed(this.context?.state ?? "unknown"))
						.catch((err) => {
							recordAudioResumeFailed(String(err), state);
							// If audio device failed, destroy context for recovery
							const errorMsg = String(err);
							if (errorMsg.includes("Failed to start") || errorMsg.includes("audio device")) {
								this.destroyContext();
							}
						})
						.finally(() => {
							this.resumeInProgress = false;
						});
				}
			}
		});
	}

	/**
	 * Set up event listeners to unlock audio on ANY user gesture
	 * Listeners stay attached to handle iOS re-interruption scenarios
	 */
	private setupUnlockListeners(): void {
		if (this.unlockListenersAttached) return;
		this.unlockListenersAttached = true;

		const events = ["touchstart", "touchend", "mousedown", "keydown", "click"];

		const attemptUnlock = async () => {
			const ctx = this.context;
			if (!ctx) return;

			const state = ctx.state as AudioContextState;
			// Already running - nothing to do
			if (state === "running") {
				return;
			}

			// Skip if another resume is already in progress (prevents cascade)
			if (this.resumeInProgress) {
				return;
			}

			// Try to resume on suspended or interrupted
			if (state === "suspended" || state === "interrupted") {
				try {
					this.resumeInProgress = true;
					recordAudioEvent("audio:resuming", { trigger: "gesture", fromState: state });
					await withTimeout(ctx.resume(), RESUME_TIMEOUT_MS, "Resume timeout (gesture)");
					recordAudioResumed(ctx.state);
					// Don't remove listeners - iOS can re-interrupt anytime
				} catch (error) {
					const errorMsg = error instanceof Error ? error.message : String(error);
					recordAudioResumeFailed(errorMsg, state);
					// If audio device failed, destroy context so it gets recreated
					if (errorMsg.includes("Failed to start") || errorMsg.includes("audio device")) {
						this.destroyContext();
					}
					// Will retry on next gesture
				} finally {
					this.resumeInProgress = false;
				}
			}
		};

		events.forEach((event) =>
			document.body.addEventListener(event, attemptUnlock, { passive: true }),
		);
	}

	/**
	 * Ensure AudioContext is running before playing audio
	 * Safe to call multiple times - will reuse existing unlock promise
	 * Includes timeout because iOS Safari resume() can hang indefinitely
	 */
	async ensureRunning(): Promise<AudioContext> {
		const ctx = this.getContext();
		const state = ctx.state as AudioContextState;

		if (state === "running") {
			return ctx;
		}

		// Handle suspended or interrupted states
		if (state === "suspended" || state === "interrupted") {
			recordAudioEvent("audio:resuming", { trigger: "ensureRunning", fromState: state });
			// Reuse existing unlock promise if one is in progress
			if (!this.unlockPromise) {
				this.resumeInProgress = true;
				this.unlockPromise = withTimeout(
					ctx.resume(),
					RESUME_TIMEOUT_MS,
					"Resume timeout (ensureRunning)"
				).finally(() => {
					this.unlockPromise = null;
					this.resumeInProgress = false;
				});
			}

			try {
				await this.unlockPromise;
				recordAudioResumed(this.context?.state ?? "unknown");
			} catch (error) {
				const errorMsg = error instanceof Error ? error.message : String(error);
				recordAudioResumeFailed(errorMsg, state);
				// If audio device failed, destroy context so it gets recreated on next attempt
				if (errorMsg.includes("Failed to start") || errorMsg.includes("audio device")) {
					this.destroyContext();
				}
			}
		}

		return this.getContext(); // Return fresh context if destroyed
	}

	/**
	 * Play a beep sound with the given parameters
	 * Handles all unlock logic internally
	 */
	playBeep(
		frequency = 880,
		duration = 0.15,
		type: OscillatorType = "sine",
		volume = 0.7,
	): void {
		const ctx = this.getContext();
		const state = ctx.state as AudioContextState;

		// If context needs resuming, await it before playing
		// This is critical - resume() is async and we must wait for it
		if (state === "suspended" || state === "interrupted") {
			// Skip if resume already in progress (will be handled by that call)
			if (this.resumeInProgress) {
				recordAudioPlaySkipped("resume_in_progress", state);
				return;
			}
			recordAudioResuming(state);
			this.resumeInProgress = true;
			withTimeout(ctx.resume(), RESUME_TIMEOUT_MS, "Resume timeout (playBeep)")
				.then(() => {
					recordAudioResumed(ctx.state);
					this.doPlayBeep(ctx, frequency, duration, type, volume);
				})
				.catch((error) => {
					const errorMsg = error instanceof Error ? error.message : String(error);
					recordAudioResumeFailed(errorMsg, state);
					// If audio device failed, destroy context for recovery
					if (errorMsg.includes("Failed to start") || errorMsg.includes("audio device")) {
						this.destroyContext();
					}
				})
				.finally(() => {
					this.resumeInProgress = false;
				});
			return;
		}

		// Context already running - play immediately
		if (ctx.state === "running") {
			this.doPlayBeep(ctx, frequency, duration, type, volume);
		} else {
			// Unexpected state - not suspended, not running
			recordAudioPlaySkipped("unexpected_state", ctx.state);
		}
	}

	/**
	 * Internal method to actually play the beep
	 */
	private doPlayBeep(
		ctx: AudioContext,
		frequency: number,
		duration: number,
		type: OscillatorType,
		volume: number,
	): void {
		// Double-check context is still valid and running
		if (ctx.state !== "running") {
			recordAudioPlaySkipped("not_running", ctx.state);
			return;
		}

		try {
			const oscillator = ctx.createOscillator();
			const gainNode = ctx.createGain();
			oscillator.connect(gainNode);
			gainNode.connect(ctx.destination);
			oscillator.frequency.value = frequency;
			oscillator.type = type;
			gainNode.gain.setValueAtTime(volume, ctx.currentTime);
			gainNode.gain.exponentialRampToValueAtTime(
				0.01,
				ctx.currentTime + duration,
			);
			oscillator.start(ctx.currentTime);
			oscillator.stop(ctx.currentTime + duration);
			recordAudioPlayed(frequency, ctx.state);
		} catch (error) {
			const errorMsg = error instanceof Error ? error.message : String(error);
			recordAudioError(errorMsg, frequency);
			// If playback fails, destroy context so it gets recreated
			this.destroyContext();
		}
	}

	/**
	 * Prime the audio context - call on app startup or first user interaction
	 * This ensures the context exists and unlock listeners are attached
	 */
	prime(): void {
		this.getContext();
	}

	/**
	 * Test sound - plays a recognizable beep and logs diagnostic info
	 * Useful for debugging audio issues on iOS
	 * Returns a promise that resolves when the sound has been played (or failed)
	 */
	async testSound(): Promise<{ state: string; played: boolean; error?: string }> {
		let ctx = this.getContext();
		const initialState = ctx.state;

		recordAudioEvent("audio:test_requested", {
			initialState,
			contextExists: !!this.context,
			resumeInProgress: this.resumeInProgress,
		});

		try {
			// Resume if needed and wait for it (with timeout - iOS can hang)
			if (ctx.state !== "running") {
				// If resume already in progress, wait for it instead of starting another
				if (this.unlockPromise) {
					await this.unlockPromise;
				} else {
					this.resumeInProgress = true;
					recordAudioResuming(ctx.state);
					try {
						await withTimeout(ctx.resume(), RESUME_TIMEOUT_MS, "Resume timeout (testSound)");
						recordAudioResumed(ctx.state);
					} finally {
						this.resumeInProgress = false;
					}
				}
				// Re-get context in case it was destroyed during resume
				ctx = this.getContext();
			}

			// Now try to play
			if (ctx.state === "running") {
				this.doPlayBeep(ctx, 440, 0.3, "sine", 0.8); // A4 note, 300ms
				recordAudioEvent("audio:test_played", { state: ctx.state });
				return { state: ctx.state, played: true };
			}

			recordAudioEvent("audio:test_failed", {
				reason: "not_running_after_resume",
				state: ctx.state
			});
			return { state: ctx.state, played: false, error: `Context state: ${ctx.state}` };
		} catch (error) {
			const errorMsg = error instanceof Error ? error.message : String(error);
			recordAudioEvent("audio:test_failed", {
				error: errorMsg,
				initialState
			});
			// If audio device failed, destroy context for recovery on next attempt
			if (errorMsg.includes("Failed to start") || errorMsg.includes("audio device")) {
				this.destroyContext();
			}
			return { state: initialState, played: false, error: errorMsg };
		}
	}

	/**
	 * Get current audio context state for diagnostics
	 */
	getState(): { contextExists: boolean; state: string | null; unlockListenersAttached: boolean } {
		return {
			contextExists: !!this.context,
			state: this.context?.state ?? null,
			unlockListenersAttached: this.unlockListenersAttached,
		};
	}
}

// Export singleton instance
export const audioService = new AudioService();
