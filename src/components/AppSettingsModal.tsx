import { useBugReporter } from "../contexts/BugReporterContext";
import { audioService } from "../services/audioService";
import { sessionRecorder } from "../services/pwaDebugServices";
import { AboutSection } from "./AboutSection";
import styles from "./SettingsModal.module.css";

interface AppSettingsModalProps {
	isOpen: boolean;
	onClose: () => void;
}

export function AppSettingsModal({ isOpen, onClose }: AppSettingsModalProps) {
	const {
		shakeEnabled,
		setShakeEnabled,
		isShakeSupported,
		requestShakePermission,
		showDialog,
	} = useBugReporter();

	if (!isOpen) return null;

	const handleOverlayClick = (e: React.MouseEvent) => {
		if (e.target === e.currentTarget) {
			onClose();
		}
	};

	const handleShakeToggle = async () => {
		if (!shakeEnabled) {
			// Request permission when enabling
			const granted = await requestShakePermission();
			if (granted) {
				setShakeEnabled(true);
			}
		} else {
			setShakeEnabled(false);
		}
	};

	return (
		<div className={styles.modalOverlay} onClick={handleOverlayClick}>
			<div className={styles.modal}>
				<div className={styles.modalHeader}>
					<h2 className={styles.modalTitle}>SETTINGS</h2>
					<button type="button" className={styles.modalClose} onClick={onClose}>
						&times;
					</button>
				</div>
				<div className={styles.modalBody}>
					{/* Bug Report Section */}
					<div className={styles.section}>
						<h3 className={styles.sectionTitle}>Bug Reporting</h3>

						{isShakeSupported && (
							<div className={styles.settingRow}>
								<span className={styles.settingLabel}>Shake to report bug</span>
								<button
									type="button"
									className={`${styles.toggle} ${shakeEnabled ? styles.toggleOn : ""}`}
									onClick={handleShakeToggle}
								>
									{shakeEnabled ? "ON" : "OFF"}
								</button>
							</div>
						)}

						<button
							type="button"
							className={styles.reportBtn}
							onClick={() => {
								onClose();
								showDialog();
							}}
						>
							Report a Bug
						</button>
					</div>

					{/* Debug Section */}
					<div className={styles.section}>
						<h3 className={styles.sectionTitle}>Debug</h3>

						<div className={styles.settingRow}>
							<span className={styles.settingLabel}>Audio: {audioService.getState().state ?? "not initialized"}</span>
							<button
								type="button"
								className={styles.toggle}
								onClick={() => audioService.testSound()}
							>
								Test
							</button>
						</div>

						<button
							type="button"
							className={styles.reportBtn}
							onClick={() => {
								try {
									const blob = sessionRecorder.getRecordingAsBlob();
									const url = URL.createObjectURL(blob);
									const a = document.createElement("a");
									a.href = url;
									a.download = `session-${Date.now()}.json`;
									a.click();
									URL.revokeObjectURL(url);
								} catch (error) {
									console.error("Failed to download session recording:", error);
								}
							}}
						>
							Download Session Recording
						</button>
					</div>

					<AboutSection />
				</div>
			</div>
		</div>
	);
}
