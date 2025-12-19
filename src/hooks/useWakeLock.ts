import { useCallback, useEffect, useRef } from "react";

// Base64-encoded tiny silent webm video (for iOS Safari workaround)
// iOS doesn't support the Wake Lock API, so we play a silent video in loop
const SILENT_VIDEO_BASE64 =
	"data:video/webm;base64,GkXfowEAAAAAAAAfQoaBAUL3gQFC8oEEQvOBCEKChHdlYm1Ch4EEQoWBAhhTgGcBAAAAAAAH4xFNm3RALE27i1OrhBVJqWZTrIHfTbuMU6uEFlSua1OsggEwTbuMU6uEHFO7a1OsggHL";

// Detect iOS synchronously (before any effects run)
const getIsIOS = () =>
	typeof navigator !== "undefined" &&
	(/iPad|iPhone|iPod/.test(navigator.userAgent) ||
		(navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1));

export function useWakeLock() {
	const wakeLockRef = useRef<WakeLockSentinel | null>(null);
	const videoRef = useRef<HTMLVideoElement | null>(null);
	const isIOS = useRef<boolean>(getIsIOS());

	// Create video element for iOS fallback
	const createVideoElement = useCallback(() => {
		if (videoRef.current) return videoRef.current;

		const video = document.createElement("video");
		video.setAttribute("playsinline", "");
		video.setAttribute("muted", "");
		video.setAttribute("loop", "");
		video.setAttribute("title", "Wake Lock");
		video.style.position = "absolute";
		video.style.left = "-9999px";
		video.style.width = "1px";
		video.style.height = "1px";
		video.muted = true;
		video.src = SILENT_VIDEO_BASE64;
		document.body.appendChild(video);
		videoRef.current = video;
		return video;
	}, []);

	const requestWakeLock = useCallback(async () => {
		// Try native Wake Lock API first (Chrome, Edge, Android)
		if ("wakeLock" in navigator) {
			// Release existing lock before requesting new one (prevents leaks on rapid calls)
			if (wakeLockRef.current) {
				try {
					await wakeLockRef.current.release();
				} catch {
					// Ignore release errors
				}
				wakeLockRef.current = null;
			}

			try {
				const wakeLock = await navigator.wakeLock.request("screen");
				wakeLockRef.current = wakeLock;
				console.log("Wake Lock acquired (native API)");

				// Use a named handler to avoid listener accumulation
				const handleRelease = () => {
					console.log("Wake Lock released");
					// Clean up ref when released externally
					if (wakeLockRef.current === wakeLock) {
						wakeLockRef.current = null;
					}
				};
				wakeLock.addEventListener("release", handleRelease, { once: true });
				return;
			} catch (err) {
				console.log("Wake Lock request failed:", err);
				// Fall through to video fallback
			}
		}

		// iOS Safari fallback: play silent video in loop
		if (isIOS.current || !("wakeLock" in navigator)) {
			try {
				const video = createVideoElement();
				await video.play();
				console.log("Wake Lock acquired (iOS video fallback)");
			} catch (err) {
				console.log("iOS video wake lock failed:", err);
			}
		}
	}, [createVideoElement]);

	const releaseWakeLock = useCallback(async () => {
		// Release native wake lock
		if (wakeLockRef.current) {
			try {
				await wakeLockRef.current.release();
			} catch {
				// Ignore release errors
			}
			wakeLockRef.current = null;
		}

		// Stop iOS video fallback
		if (videoRef.current) {
			videoRef.current.pause();
			console.log("Wake Lock released (iOS video fallback)");
		}
	}, []);

	// Request wake lock on mount
	useEffect(() => {
		requestWakeLock();

		// Re-acquire wake lock when page becomes visible again
		const handleVisibilityChange = () => {
			if (document.visibilityState === "visible") {
				requestWakeLock();
			}
		};

		document.addEventListener("visibilitychange", handleVisibilityChange);

		return () => {
			releaseWakeLock();
			document.removeEventListener("visibilitychange", handleVisibilityChange);

			// Clean up video element
			if (videoRef.current) {
				videoRef.current.remove();
				videoRef.current = null;
			}
		};
	}, [requestWakeLock, releaseWakeLock]);

	return { requestWakeLock, releaseWakeLock };
}
