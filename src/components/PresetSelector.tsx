import styles from "./PresetSelector.module.css";

export interface Preset {
	id: string;
	name: string;
	workTime: number;
	restTime: number;
	rounds: number;
}

interface PresetSelectorProps {
	presets: Preset[];
	activePreset: string;
	onSelect: (presetId: string) => void;
	onSettingsClick?: () => void;
}

export function PresetSelector({ presets, activePreset, onSelect, onSettingsClick }: PresetSelectorProps) {
	return (
		<div className={styles.presetRow}>
			<div className={styles.presetBubbles}>
				{presets.map((preset) => (
					<button
						key={preset.id}
						className={`${styles.presetBtn} ${activePreset === preset.id ? styles.active : ""}`}
						onClick={() => onSelect(preset.id)}
					>
						{preset.name}
					</button>
				))}
			</div>
			{onSettingsClick && (
				<button className={styles.settingsBtn} onClick={onSettingsClick} aria-label="App Settings">
					<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
						<path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
						<circle cx="12" cy="12" r="3" />
					</svg>
				</button>
			)}
		</div>
	);
}
