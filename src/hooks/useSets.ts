import { useCallback, useEffect, useState } from "react";
import { clearSetsCount, loadSetsCount, saveSetsCount } from "../services/setsStorage";

export interface SetsState {
	count: number;
	maxCount: number;
	isLoaded: boolean;
}

export function useSets(maxCount = 15) {
	const [count, setCount] = useState(0);
	const [isLoaded, setIsLoaded] = useState(false);

	// Load persisted count on mount
	useEffect(() => {
		loadSetsCount().then((savedCount) => {
			setCount(Math.min(savedCount, maxCount));
			setIsLoaded(true);
		});
	}, [maxCount]);

	// Save count whenever it changes (after initial load)
	useEffect(() => {
		if (isLoaded) {
			saveSetsCount(count);
		}
	}, [count, isLoaded]);

	const increment = useCallback(() => {
		setCount((prev) => Math.min(prev + 1, maxCount));
	}, [maxCount]);

	const undo = useCallback(() => {
		setCount((prev) => Math.max(prev - 1, 0));
	}, []);

	const reset = useCallback(() => {
		setCount(0);
		clearSetsCount();
	}, []);

	return {
		state: { count, maxCount, isLoaded },
		increment,
		undo,
		reset,
	};
}
