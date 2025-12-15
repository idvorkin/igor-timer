import { useCallback, useEffect, useState } from "react";
import { AppSettingsModal } from "./components/AppSettingsModal";
import { BottomNav, type Mode } from "./components/BottomNav";
import { BugReportDialog } from "./components/BugReportDialog";
import { Controls } from "./components/Controls";
import { ModeHeader } from "./components/ModeHeader";
import { PresetSelector, type Preset } from "./components/PresetSelector";
import { Sets } from "./components/Sets";
import { TimerSettingsModal } from "./components/SettingsModal";
import { Stopwatch } from "./components/Stopwatch";
import { TimerDisplay } from "./components/TimerDisplay";
import { TimerHeader } from "./components/TimerHeader";
import { UpdateBanner } from "./components/UpdateBanner";
import { type TimerProfile, useTimer } from "./hooks/useTimer";
import { useWakeLock } from "./hooks/useWakeLock";

const PRESETS: Preset[] = [
	{ id: "30sec", name: "30 SEC", workTime: 30, restTime: 5, rounds: 6 },
	{ id: "1min", name: "1 MIN", workTime: 60, restTime: 10, rounds: 5 },
	{ id: "5-1", name: "5-1", workTime: 300, restTime: 60, rounds: 3 },
];

function formatTime(seconds: number): string {
	const mins = Math.floor(seconds / 60);
	const secs = seconds % 60;
	return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

export default function App() {
	const [mode, setMode] = useState<Mode>("rounds");
	const [activePreset, setActivePreset] = useState("30sec");
	const [isAppSettingsOpen, setIsAppSettingsOpen] = useState(false);
	const [isTimerSettingsOpen, setIsTimerSettingsOpen] = useState(false);
	const [profile, setProfile] = useState<TimerProfile>(() => {
		const preset = PRESETS.find((p) => p.id === "30sec")!;
		return {
			name: preset.name,
			workTime: preset.workTime,
			restTime: preset.restTime,
			rounds: preset.rounds,
			cycles: 1,
			prepTime: 5,
		};
	});

	const { state, toggle, reset, calculateTotalTime } = useTimer(profile);

	// Keep screen awake while app is open
	useWakeLock();

	const handlePresetSelect = useCallback((presetId: string) => {
		const preset = PRESETS.find((p) => p.id === presetId);
		if (preset) {
			setActivePreset(presetId);
			setProfile((prev) => ({
				...prev,
				name: preset.name,
				workTime: preset.workTime,
				restTime: preset.restTime,
				rounds: preset.rounds,
			}));
		}
	}, []);

	const handleReset = useCallback(() => {
		reset();
	}, [reset]);

	const handleSettingsSave = useCallback((newProfile: TimerProfile) => {
		setProfile(newProfile);
		setActivePreset("custom");
	}, []);

	// Keyboard shortcuts
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.code === "Space") {
				e.preventDefault();
				toggle();
			} else if (e.code === "KeyR") {
				handleReset();
			}
		};

		document.addEventListener("keydown", handleKeyDown);
		return () => document.removeEventListener("keydown", handleKeyDown);
	}, [toggle, handleReset]);

	// Calculate display values
	const totalTime = calculateTotalTime();
	const remainingTime = state.isRunning || state.isPaused
		? totalTime - state.totalElapsed
		: totalTime;

	const mainTime = state.isRunning || state.isPaused
		? formatTime(state.timeLeft)
		: formatTime(profile.workTime);

	const previewLabel = state.phase === "rest" ? "WORK" : "REST";
	const previewTime = state.phase === "rest"
		? formatTime(profile.workTime)
		: formatTime(profile.restTime);

	return (
		<>
			<UpdateBanner />
			<BugReportDialog />

			{mode === "rounds" && (
				<>
					<TimerHeader
						profileName={profile.name}
						totalTime={formatTime(remainingTime)}
						onSettingsClick={() => setIsTimerSettingsOpen(true)}
						onResetClick={handleReset}
					/>

					<PresetSelector
						presets={PRESETS}
						activePreset={activePreset}
						onSelect={handlePresetSelect}
						onSettingsClick={() => setIsAppSettingsOpen(true)}
					/>

					<TimerDisplay
						phase={state.phase}
						mainTime={mainTime}
						previewTime={previewTime}
						previewLabel={previewLabel}
					/>

					<Controls
						currentRound={state.currentRound}
						totalRounds={state.totalRounds}
						isRunning={state.isRunning}
						isPaused={state.isPaused}
						onToggle={toggle}
					/>
				</>
			)}
			{mode === "stopwatch" && (
				<>
					<ModeHeader title="STOPWATCH" onSettingsClick={() => setIsAppSettingsOpen(true)} />
					<Stopwatch />
				</>
			)}
			{mode === "sets" && (
				<>
					<ModeHeader title="SET COUNTER" onSettingsClick={() => setIsAppSettingsOpen(true)} />
					<Sets />
				</>
			)}

			<BottomNav activeMode={mode} onModeChange={setMode} />

			<AppSettingsModal
				isOpen={isAppSettingsOpen}
				onClose={() => setIsAppSettingsOpen(false)}
			/>

			<TimerSettingsModal
				isOpen={isTimerSettingsOpen}
				profile={profile}
				onClose={() => setIsTimerSettingsOpen(false)}
				onSave={handleSettingsSave}
			/>
		</>
	);
}
