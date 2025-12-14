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
					console.error("AudioContext unlock attempt failed:", error);
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
				console.error("AudioContext resume failed:", error);
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
		const ctx = this.getContext();
		const state = ctx.state as AudioContextState;

		// If context needs resuming, await it before playing
		// This is critical - resume() is async and we must wait for it
		if (state === "suspended" || state === "interrupted") {
			ctx.resume()
				.then(() => this.doPlayBeep(ctx, frequency, duration, type, volume))
				.catch((error) => {
					console.error("AudioContext resume failed in playBeep:", error);
				});
			return;
		}

		// Context already running - play immediately
		if (ctx.state === "running") {
			this.doPlayBeep(ctx, frequency, duration, type, volume);
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
			console.error("Audio playback failed:", error);
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

	/**
	 * Test sound - plays a recognizable beep and logs diagnostic info
	 * Useful for debugging audio issues on iOS
	 */
	testSound(): { state: string; played: boolean; error?: string } {
		const ctx = this.getContext();
		const initialState = ctx.state;

		console.log("[AudioService] Test sound requested", {
			contextState: initialState,
			contextExists: !!this.context,
		});

		try {
			// Try to play immediately if running
			if (ctx.state === "running") {
				this.doPlayBeep(ctx, 440, 0.3, "sine", 0.8); // A4 note, 300ms
				console.log("[AudioService] Test sound played successfully");
				return { state: initialState, played: true };
			}

			// Try to resume and play
			ctx.resume()
				.then(() => {
					console.log("[AudioService] Context resumed, state:", ctx.state);
					if (ctx.state === "running") {
						this.doPlayBeep(ctx, 440, 0.3, "sine", 0.8);
						console.log("[AudioService] Test sound played after resume");
					} else {
						console.error("[AudioService] Context not running after resume:", ctx.state);
					}
				})
				.catch((error) => {
					console.error("[AudioService] Resume failed during test:", error);
				});

			return { state: initialState, played: false, error: "Resuming context..." };
		} catch (error) {
			const errorMsg = error instanceof Error ? error.message : String(error);
			console.error("[AudioService] Test sound failed:", errorMsg);
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
