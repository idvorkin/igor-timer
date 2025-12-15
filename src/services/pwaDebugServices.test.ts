/**
 * PWA Debug Services Tests
 *
 * Tests for session recorder integration and memorable session names.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the generated_version module
vi.mock("../generated_version", () => ({
	GIT_SHA: "abc1234567890",
	GIT_COMMIT_URL: "https://github.com/test/repo/commit/abc1234567890",
	GIT_CURRENT_URL: "https://github.com/test/repo/tree/main",
	GIT_BRANCH: "main",
	BUILD_TIMESTAMP: "2025-01-01T00:00:00Z",
}));

// Mock SessionRecorder
vi.mock("@idvorkin/pwa-utils/session-recorder", () => ({
	SessionRecorder: vi.fn().mockImplementation(() => ({
		start: vi.fn(),
		recordStateChange: vi.fn(),
		getRecording: vi.fn().mockReturnValue({
			version: "1.0.0",
			sessionId: "test-session",
			startTime: Date.now(),
			environment: {},
			interactions: [],
			stateChanges: [],
			memorySnapshots: [],
		}),
		getRecordingAsBlob: vi.fn().mockReturnValue(new Blob(['{}'], { type: 'application/json' })),
		getStats: vi.fn().mockReturnValue({
			duration: 5000,
			interactions: 10,
			errors: 0,
		}),
	})),
}));

// Mock BugReporterService
vi.mock("@idvorkin/pwa-utils/bug-reporter", () => ({
	BugReporterService: vi.fn().mockImplementation(() => ({
		shakeEnabled: false,
		submitReport: vi.fn().mockResolvedValue(undefined),
		getMetadata: vi.fn().mockReturnValue({}),
		getVersionInfo: vi.fn().mockReturnValue({
			shaShort: "abc1234",
			branch: "main",
		}),
	})),
	ShakeDetector: vi.fn().mockImplementation(() => ({
		setEnabled: vi.fn(),
		onShake: vi.fn().mockReturnValue(() => {}),
		onStateChange: vi.fn().mockReturnValue(() => {}),
		getState: vi.fn().mockReturnValue({ isSupported: false }),
		requestPermission: vi.fn().mockResolvedValue(false),
	})),
}));

// Mock VersionCheckService
vi.mock("@idvorkin/pwa-utils/version-check", () => ({
	VersionCheckService: vi.fn().mockImplementation(() => ({})),
}));

describe("PWA Debug Services", () => {
	beforeEach(() => {
		vi.resetModules();
	});

	describe("Session Recorder Integration", () => {
		it("should initialize session recorder with app name in dbName", async () => {
			const { SessionRecorder } = await import("@idvorkin/pwa-utils/session-recorder");
			await import("./pwaDebugServices");

			expect(SessionRecorder).toHaveBeenCalledWith(
				expect.objectContaining({
					dbName: "igor-timer-sessions",
				})
			);
		});

		it("should include app name in buildInfo version", async () => {
			const { SessionRecorder } = await import("@idvorkin/pwa-utils/session-recorder");
			await import("./pwaDebugServices");

			expect(SessionRecorder).toHaveBeenCalledWith(
				expect.objectContaining({
					buildInfo: expect.objectContaining({
						version: expect.stringContaining("igor-timer@"),
					}),
				})
			);
		});

		it("should record session_start state change with session name", async () => {
			const { sessionRecorder } = await import("./pwaDebugServices");

			expect(sessionRecorder.recordStateChange).toHaveBeenCalledWith(
				expect.objectContaining({
					type: "session_start",
					details: expect.objectContaining({
						sessionName: expect.stringMatching(/^igor-timer-\d+-\w+-\w+$/),
						app: "igor-timer",
					}),
				})
			);
		});
	});

	describe("Session Name Generation", () => {
		it("should generate session name with correct format", async () => {
			const { sessionRecorder } = await import("./pwaDebugServices");

			const call = (sessionRecorder.recordStateChange as ReturnType<typeof vi.fn>).mock.calls[0][0];
			const sessionName = call.details.sessionName;

			// Format: igor-timer-{timestamp}-{word}-{word}
			expect(sessionName).toMatch(/^igor-timer-\d+-\w+-\w+$/);
		});

		it("should include timestamp in session name", async () => {
			const beforeTime = Date.now();
			vi.resetModules();
			const { sessionRecorder } = await import("./pwaDebugServices");
			const afterTime = Date.now();

			const call = (sessionRecorder.recordStateChange as ReturnType<typeof vi.fn>).mock.calls[0][0];
			const sessionName = call.details.sessionName as string;

			// Extract timestamp from session name
			const parts = sessionName.split("-");
			const timestamp = parseInt(parts[2], 10);

			expect(timestamp).toBeGreaterThanOrEqual(beforeTime);
			expect(timestamp).toBeLessThanOrEqual(afterTime);
		});
	});

	describe("Bug Reporter Integration", () => {
		it("should initialize bug reporter with correct repository", async () => {
			const { BugReporterService } = await import("@idvorkin/pwa-utils/bug-reporter");
			await import("./pwaDebugServices");

			expect(BugReporterService).toHaveBeenCalledWith(
				expect.objectContaining({
					repository: "idvorkin/igor-timer",
				})
			);
		});
	});

	describe("openBugReportWithSession", () => {
		it("should include session stats in description", async () => {
			const { openBugReportWithSession, bugReporter } = await import("./pwaDebugServices");

			await openBugReportWithSession("Test Bug", "Test description");

			expect(bugReporter.submitReport).toHaveBeenCalledWith(
				expect.objectContaining({
					title: "Test Bug",
					description: expect.stringContaining("Session Info"),
				})
			);
		});
	});
});

describe("Session Recording Download", () => {
	it("should return valid JSON blob", async () => {
		const { sessionRecorder } = await import("./pwaDebugServices");
		const blob = sessionRecorder.getRecordingAsBlob();

		expect(blob).toBeInstanceOf(Blob);
		expect(blob.type).toBe("application/json");
	});

	it("should contain recording data", async () => {
		const { sessionRecorder } = await import("./pwaDebugServices");
		const recording = sessionRecorder.getRecording();

		expect(recording).toHaveProperty("sessionId");
		expect(recording).toHaveProperty("startTime");
		expect(recording).toHaveProperty("interactions");
		expect(recording).toHaveProperty("stateChanges");
	});
});
