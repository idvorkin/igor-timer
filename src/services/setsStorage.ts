const DB_NAME = "igor-timer";
const STORE_NAME = "sets";
const KEY = "current";
const THIRTY_MINUTES_MS = 30 * 60 * 1000;

interface SetsData {
	count: number;
	lastUpdated: number;
}

function openDB(): Promise<IDBDatabase> {
	return new Promise((resolve, reject) => {
		const request = indexedDB.open(DB_NAME, 1);

		request.onerror = () => reject(request.error);
		request.onsuccess = () => resolve(request.result);

		request.onupgradeneeded = (event) => {
			const db = (event.target as IDBOpenDBRequest).result;
			if (!db.objectStoreNames.contains(STORE_NAME)) {
				db.createObjectStore(STORE_NAME);
			}
		};
	});
}

export async function loadSetsCount(): Promise<number> {
	try {
		const db = await openDB();
		return new Promise((resolve) => {
			const transaction = db.transaction(STORE_NAME, "readonly");
			const store = transaction.objectStore(STORE_NAME);
			const request = store.get(KEY);

			request.onsuccess = () => {
				const data = request.result as SetsData | undefined;
				if (!data) {
					resolve(0);
					return;
				}

				// Check if more than 30 minutes have passed
				const now = Date.now();
				if (now - data.lastUpdated > THIRTY_MINUTES_MS) {
					// Auto-reset after 30 minutes of inactivity
					resolve(0);
				} else {
					resolve(data.count);
				}
			};

			request.onerror = () => resolve(0);
		});
	} catch {
		return 0;
	}
}

export async function saveSetsCount(count: number): Promise<void> {
	try {
		const db = await openDB();
		return new Promise((resolve, reject) => {
			const transaction = db.transaction(STORE_NAME, "readwrite");
			const store = transaction.objectStore(STORE_NAME);

			const data: SetsData = {
				count,
				lastUpdated: Date.now(),
			};

			const request = store.put(data, KEY);
			request.onsuccess = () => resolve();
			request.onerror = () => reject(request.error);
		});
	} catch {
		// Silently fail - storage is best-effort
	}
}

export async function clearSetsCount(): Promise<void> {
	try {
		const db = await openDB();
		return new Promise((resolve, reject) => {
			const transaction = db.transaction(STORE_NAME, "readwrite");
			const store = transaction.objectStore(STORE_NAME);
			const request = store.delete(KEY);
			request.onsuccess = () => resolve();
			request.onerror = () => reject(request.error);
		});
	} catch {
		// Silently fail
	}
}
