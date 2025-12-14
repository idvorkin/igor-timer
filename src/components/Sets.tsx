import { useSets } from "../hooks/useSets";
import styles from "./Sets.module.css";

interface TallyMarkProps {
	index: number;
}

function TallyMark({ index }: TallyMarkProps) {
	// Create slight variations for scratchy hand-drawn look
	const seed = index * 17;
	const rotation = -5 + (seed % 10);
	const offsetX = (seed % 7) - 3;
	const offsetY = (seed % 5) - 2;

	// Scratchy path with slight wobble
	const wobble1 = ((seed * 3) % 6) - 3;
	const wobble2 = ((seed * 7) % 6) - 3;

	// Vertical tally mark
	return (
		<svg
			className={styles.tallyMark}
			viewBox="0 0 20 80"
			style={{
				transform: `rotate(${rotation}deg) translate(${offsetX}px, ${offsetY}px)`,
			}}
		>
			<path
				d={`M ${10 + wobble1},5
					Q ${8 + wobble2},25 ${11 + wobble1},40
					T ${10 + wobble2},75`}
				stroke="currentColor"
				strokeWidth="4"
				strokeLinecap="round"
				fill="none"
				className={styles.scratchyLine}
			/>
			{/* Extra scratch for texture */}
			<path
				d={`M ${9},10 Q ${11},30 ${9},50`}
				stroke="currentColor"
				strokeWidth="1.5"
				strokeLinecap="round"
				fill="none"
				opacity="0.3"
			/>
		</svg>
	);
}

function StrikeMark({ index }: { index: number }) {
	const seed = index * 17;
	const wobble1 = ((seed * 3) % 4) - 2;
	const wobble2 = ((seed * 7) % 4) - 2;

	// Diagonal strike-through line that goes from bottom-left to top-right
	return (
		<svg
			className={styles.strikeThrough}
			viewBox="0 0 100 100"
			preserveAspectRatio="none"
		>
			<path
				d={`M ${-10 + wobble1},${110 + wobble2}
					Q ${25},${75 + wobble1} ${50},${50 + wobble2}
					T ${110 + wobble2},${-10 + wobble1}`}
				stroke="currentColor"
				strokeWidth="5"
				strokeLinecap="round"
				fill="none"
				className={styles.scratchyLine}
			/>
			{/* Extra scratch marks for texture */}
			<path
				d={`M -5,${105} Q 30,${70} 55,${45}`}
				stroke="currentColor"
				strokeWidth="2"
				strokeLinecap="round"
				fill="none"
				opacity="0.4"
			/>
		</svg>
	);
}

interface TallyGroupProps {
	count: number;
	groupIndex: number;
}

function TallyGroup({ count, groupIndex }: TallyGroupProps) {
	const marks = [];
	const hasStrike = count === 5;

	// Render vertical marks (up to 4)
	for (let i = 0; i < Math.min(count, 4); i++) {
		marks.push(
			<TallyMark key={i} index={groupIndex * 5 + i} />
		);
	}

	return (
		<div className={styles.tallyGroup}>
			<div className={styles.verticalMarks}>{marks}</div>
			{hasStrike && <StrikeMark index={groupIndex} />}
		</div>
	);
}

export function Sets() {
	const { state, increment, undo, reset } = useSets(15);
	const { count, maxCount } = state;

	// Split count into groups of 5
	const fullGroups = Math.floor(count / 5);
	const remainder = count % 5;

	const groups = [];
	for (let i = 0; i < fullGroups; i++) {
		groups.push(<TallyGroup key={i} count={5} groupIndex={i} />);
	}
	if (remainder > 0) {
		groups.push(<TallyGroup key={fullGroups} count={remainder} groupIndex={fullGroups} />);
	}

	const isMaxed = count >= maxCount;

	return (
		<>
			<div
				className={styles.setsDisplay}
				onClick={!isMaxed ? increment : undefined}
				role="button"
				tabIndex={0}
				onKeyDown={(e) => {
					if (e.code === "Space" || e.code === "Enter") {
						if (!isMaxed) increment();
					}
				}}
			>
				{count === 0 ? (
					<div className={styles.placeholder}>TAP TO COUNT</div>
				) : (
					<div className={styles.tallyMarks}>{groups}</div>
				)}
				{isMaxed && (
					<div className={styles.maxedOut}>MAX REACHED!</div>
				)}
			</div>

			<section className={styles.controlsSection}>
				<div className={styles.controlsRow}>
					<button
						className={styles.controlBtn}
						onClick={undo}
						disabled={count === 0}
					>
						UNDO
					</button>
					<button
						className={`${styles.controlBtn} ${styles.addBtn}`}
						onClick={increment}
						disabled={isMaxed}
					>
						+1
					</button>
					<button
						className={`${styles.controlBtn} ${styles.resetBtn}`}
						onClick={reset}
						disabled={count === 0}
					>
						RESET
					</button>
				</div>
			</section>
		</>
	);
}
