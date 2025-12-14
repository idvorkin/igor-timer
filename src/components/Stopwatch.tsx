import { formatStopwatchTime, useStopwatch } from "../hooks/useStopwatch";
import styles from "./Stopwatch.module.css";

export function Stopwatch() {
	const { state, toggle, reset, lap } = useStopwatch();
	const time = formatStopwatchTime(state.elapsedMs);

	return (
		<>
			<div className={styles.stopwatchDisplay}>
				<div className={styles.stopwatchTime}>
					{time.main}
					<span className={styles.stopwatchMs}>{time.fraction}</span>
				</div>

				{state.laps.length > 0 && (
					<div className={styles.lapList}>
						{state.laps.map((lapTime, i) => {
							const lapFormatted = formatStopwatchTime(lapTime);
							return (
								<div key={i} className={styles.lapItem}>
									<span className={styles.lapNumber}>Lap {state.laps.length - i}</span>
									<span className={styles.lapTime}>
										{lapFormatted.main}{lapFormatted.fraction}
									</span>
								</div>
							);
						})}
					</div>
				)}
			</div>

			<section className={styles.controlsSection}>
				<div className={styles.statsRow}>
					<button className={styles.roundBtn} onClick={lap} disabled={!state.isRunning}>
						LAP
					</button>
					<div className={styles.centerControl}>
						<button className={styles.playBtn} onClick={toggle}>
							{state.isRunning ? (
								<div className={styles.stopIcon} />
							) : (
								<svg className={styles.playIcon} viewBox="0 0 24 24">
									<polygon points="5,3 19,12 5,21" />
								</svg>
							)}
						</button>
						<div className={styles.btnLabel}>
							{state.isRunning ? "STOP" : "START"}
						</div>
					</div>
					<button className={`${styles.roundBtn} ${styles.reset}`} onClick={reset}>
						RESET
					</button>
				</div>
			</section>
		</>
	);
}
