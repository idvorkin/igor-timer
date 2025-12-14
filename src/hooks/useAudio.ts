import { useCallback } from "react";
import { audioService } from "../services/audioService";

/**
 * Audio hook for timer sounds
 *
 * Uses the global audioService which handles all iOS Safari
 * AudioContext unlock requirements automatically.
 */
export function useAudio() {
	const playBeep = useCallback(
		(
			frequency = 880,
			duration = 0.15,
			type: OscillatorType = "sine",
			volume = 0.7,
		) => {
			audioService.playBeep(frequency, duration, type, volume);
		},
		[],
	);

	// "GO!" sound - ascending tone when work starts
	const playStartBeep = useCallback(() => {
		playBeep(800, 0.15, "sine", 0.8);
		setTimeout(() => playBeep(1000, 0.15, "sine", 0.8), 100);
		setTimeout(() => playBeep(1200, 0.25, "sine", 0.9), 200);
	}, [playBeep]);

	// Rest starting - descending double beep
	const playEndBeep = useCallback(() => {
		playBeep(800, 0.2, "sine", 0.7);
		setTimeout(() => playBeep(600, 0.3, "sine", 0.7), 200);
	}, [playBeep]);

	// Countdown beeps - short ticks at 3, 2, 1
	const playCountdownBeep = useCallback(
		() => playBeep(660, 0.08, "sine", 0.6),
		[playBeep],
	);

	// All done - victory fanfare
	const playFinishBeep = useCallback(() => {
		playBeep(523, 0.2, "sine", 0.8); // C
		setTimeout(() => playBeep(659, 0.2, "sine", 0.8), 150); // E
		setTimeout(() => playBeep(784, 0.2, "sine", 0.8), 300); // G
		setTimeout(() => playBeep(1047, 0.4, "sine", 0.9), 450); // High C
	}, [playBeep]);

	return { playStartBeep, playEndBeep, playCountdownBeep, playFinishBeep };
}
