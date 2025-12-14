/**
 * Dialog shown when shake-to-report is triggered or Report Bug clicked
 */

import { useState } from "react";
import { useBugReporter } from "../contexts/BugReporterContext";
import styles from "./BugReportDialog.module.css";

export function BugReportDialog() {
	const { showBugDialog, dismissBugDialog, submitBugReport, getMetadata } = useBugReporter();
	const [title, setTitle] = useState("");
	const [description, setDescription] = useState("");

	if (!showBugDialog) {
		return null;
	}

	const metadata = getMetadata();

	const handleSubmit = async () => {
		try {
			await submitBugReport(title.trim() || "Bug Report", description.trim());
			setTitle("");
			setDescription("");
		} catch (error) {
			console.error("Failed to submit bug report:", error);
		}
	};

	const handleCancel = () => {
		dismissBugDialog();
		setTitle("");
		setDescription("");
	};

	return (
		<div className={styles.overlay} onClick={handleCancel}>
			<div className={styles.dialog} onClick={(e) => e.stopPropagation()}>
				<h2 className={styles.title}>Report a Bug</h2>

				<input
					type="text"
					className={styles.input}
					placeholder="Brief title..."
					value={title}
					onChange={(e) => setTitle(e.target.value)}
					autoFocus
				/>

				<textarea
					className={styles.textarea}
					placeholder="What went wrong? (optional)"
					value={description}
					onChange={(e) => setDescription(e.target.value)}
					rows={3}
				/>

				{/* Metadata Preview */}
				<div className={styles.metadataSection}>
					<div className={styles.metadataHeader}>Auto-included data:</div>
					<div className={styles.metadataGrid}>
						<div className={styles.metaItem}>
							<span className={styles.metaLabel}>Device</span>
							<span className={styles.metaValue}>{metadata.device}</span>
						</div>
						<div className={styles.metaItem}>
							<span className={styles.metaLabel}>Screen</span>
							<span className={styles.metaValue}>{metadata.screen}</span>
						</div>
						<div className={styles.metaItem}>
							<span className={styles.metaLabel}>Browser</span>
							<span className={styles.metaValue}>{metadata.browser}</span>
						</div>
						<div className={styles.metaItem}>
							<span className={styles.metaLabel}>Build</span>
							<span className={styles.metaValue}>
								{metadata.commitUrl ? (
									<a href={metadata.commitUrl} target="_blank" rel="noopener noreferrer" className={styles.metaLink}>
										{metadata.version}
									</a>
								) : (
									metadata.version
								)}
							</span>
						</div>
						<div className={styles.metaItem}>
							<span className={styles.metaLabel}>Branch</span>
							<span className={styles.metaValue}>
								{metadata.repoUrl ? (
									<a href={metadata.repoUrl} target="_blank" rel="noopener noreferrer" className={styles.metaLink}>
										{metadata.branch}
									</a>
								) : (
									metadata.branch
								)}
							</span>
						</div>
						<div className={styles.metaItem}>
							<span className={styles.metaLabel}>Built</span>
							<span className={styles.metaValue}>{metadata.buildTime}</span>
						</div>
						<div className={styles.metaItem}>
							<span className={styles.metaLabel}>Session</span>
							<span className={styles.metaValue}>{metadata.sessionDuration}</span>
						</div>
						<div className={styles.metaItem}>
							<span className={styles.metaLabel}>Clicks</span>
							<span className={styles.metaValue}>{metadata.interactions}</span>
						</div>
					</div>
					{metadata.errors > 0 && (
						<div className={styles.errorBadge}>
							{metadata.errors} error{metadata.errors > 1 ? "s" : ""} logged
						</div>
					)}
				</div>

				<div className={styles.actions}>
					<button type="button" className={styles.cancelBtn} onClick={handleCancel}>
						Cancel
					</button>
					<button type="button" className={styles.submitBtn} onClick={handleSubmit}>
						Report on GitHub
					</button>
				</div>
			</div>
		</div>
	);
}
