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
 *
 * Usage:
 *   import { audioService } from './services/audioService';
 *   audioService.playBeep(440, 0.2);  // Play 440Hz for 200ms
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Best_practices
 * @see https://www.mattmontag.com/web/unlock-web-audio-in-safari-for-ios-and-macos
 */

type AudioContextState = "suspended" | "running" | "closed" | "interrupted";

class AudioService {
	private context: AudioContext | null = null;
	private unlockPromise: Promise<void> | null = null;
	private unlockListenersAttached = false;

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

			// Set up auto-unlock listeners on creation
			this.setupUnlockListeners();
		}
		return this.context;
	}

	/**
	 * Set up event listeners to unlock audio on first user gesture
	 * Listeners remove themselves after successful unlock
	 */
	private setupUnlockListeners(): void {
		if (this.unlockListenersAttached) return;
		this.unlockListenersAttached = true;

		const events = ["touchstart", "touchend", "mousedown", "keydown", "click"];

		const attemptUnlock = async () => {
			const ctx = this.context;
			if (!ctx) return;

			const state = ctx.state as AudioContextState;
			if (state === "running") {
				cleanup();
				return;
			}

			if (state === "suspended" || state === "interrupted") {
				try {
					await ctx.resume();
					if (ctx.state === "running") {
						cleanup();
					}
				} catch (error) {
					console.warn("AudioContext unlock attempt failed:", error);
				}
			}
		};

		const cleanup = () => {
			events.forEach((event) =>
				document.body.removeEventListener(event, attemptUnlock),
			);
			this.unlockListenersAttached = false;
		};

		events.forEach((event) =>
			document.body.addEventListener(event, attemptUnlock, { passive: true }),
		);
	}

	/**
	 * Ensure AudioContext is running before playing audio
	 * Safe to call multiple times - will reuse existing unlock promise
	 */
	async ensureRunning(): Promise<AudioContext> {
		const ctx = this.getContext();
		const state = ctx.state as AudioContextState;

		if (state === "running") {
			return ctx;
		}

		// Handle suspended or interrupted states
		if (state === "suspended" || state === "interrupted") {
			// Reuse existing unlock promise if one is in progress
			if (!this.unlockPromise) {
				this.unlockPromise = ctx.resume().finally(() => {
					this.unlockPromise = null;
				});
			}

			try {
				await this.unlockPromise;
			} catch (error) {
				console.warn("AudioContext resume failed:", error);
			}
		}

		return ctx;
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
		// Fire-and-forget pattern - we try to ensure running but don't block
		// This works because the first beep is always triggered by user gesture
		const ctx = this.getContext();
		const state = ctx.state as AudioContextState;

		// Try to resume if needed (within user gesture context)
		if (state === "suspended" || state === "interrupted") {
			ctx.resume().catch(() => {
				// Silent fail - will retry on next beep
			});
		}

		// Only play if context is running
		if (ctx.state !== "running") {
			// Context not ready - this can happen on very first load
			// The unlock listeners will handle it, and next beep will work
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
		} catch (error) {
			console.warn("Audio playback failed:", error);
			// If playback fails, destroy context so it gets recreated
			if (this.context) {
				try {
					this.context.close();
				} catch {
					// Ignore close errors
				}
				this.context = null;
			}
		}
	}

	/**
	 * Prime the audio context - call on app startup or first user interaction
	 * This ensures the context exists and unlock listeners are attached
	 */
	prime(): void {
		this.getContext();
	}
}

// Export singleton instance
export const audioService = new AudioService();
