import { useCallback, useRef } from "react";

export function useAudio() {
	const audioCtxRef = useRef<AudioContext | null>(null);

	const initAudio = useCallback(async () => {
		if (!audioCtxRef.current) {
			audioCtxRef.current = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
		}
		// Resume if suspended (needed for iOS) - must await!
		if (audioCtxRef.current.state === "suspended") {
			await audioCtxRef.current.resume();
		}
		return audioCtxRef.current;
	}, []);

	const playBeep = useCallback(async (frequency = 880, duration = 0.15, type: OscillatorType = "sine", volume = 0.7) => {
		const ctx = await initAudio();
		const oscillator = ctx.createOscillator();
		const gainNode = ctx.createGain();
		oscillator.connect(gainNode);
		gainNode.connect(ctx.destination);
		oscillator.frequency.value = frequency;
		oscillator.type = type;
		gainNode.gain.setValueAtTime(volume, ctx.currentTime);
		gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);
		oscillator.start(ctx.currentTime);
		oscillator.stop(ctx.currentTime + duration);
	}, [initAudio]);

	// "GO!" sound - ascending tone when work starts
	const playStartBeep = useCallback(async () => {
		await playBeep(800, 0.15, "sine", 0.8);
		// Subsequent beeps are fire-and-forget (context already resumed)
		setTimeout(() => void playBeep(1000, 0.15, "sine", 0.8), 100);
		setTimeout(() => void playBeep(1200, 0.25, "sine", 0.9), 200);
	}, [playBeep]);

	// Rest starting - descending double beep
	const playEndBeep = useCallback(async () => {
		await playBeep(800, 0.2, "sine", 0.7);
		setTimeout(() => void playBeep(600, 0.3, "sine", 0.7), 200);
	}, [playBeep]);

	// Countdown beeps - short ticks at 3, 2, 1
	const playCountdownBeep = useCallback(async () => {
		await playBeep(660, 0.08, "sine", 0.6);
	}, [playBeep]);

	// All done - victory fanfare
	const playFinishBeep = useCallback(async () => {
		await playBeep(523, 0.2, "sine", 0.8); // C
		setTimeout(() => void playBeep(659, 0.2, "sine", 0.8), 150); // E
		setTimeout(() => void playBeep(784, 0.2, "sine", 0.8), 300); // G
		setTimeout(() => void playBeep(1047, 0.4, "sine", 0.9), 450); // High C
	}, [playBeep]);

	return { initAudio, playStartBeep, playEndBeep, playCountdownBeep, playFinishBeep };
}
