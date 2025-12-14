/**
 * AudioService Tests
 *
 * Tests for the global AudioContext service that handles iOS Safari audio unlock.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock AudioContext
class MockAudioContext {
	state: "suspended" | "running" | "closed" = "suspended";
	currentTime = 0;
	destination = {};

	resume = vi.fn().mockImplementation(() => {
		this.state = "running";
		return Promise.resolve();
	});

	close = vi.fn().mockImplementation(() => {
		this.state = "closed";
		return Promise.resolve();
	});

	createOscillator = vi.fn().mockReturnValue({
		connect: vi.fn(),
		frequency: { value: 0 },
		type: "sine",
		start: vi.fn(),
		stop: vi.fn(),
	});

	createGain = vi.fn().mockReturnValue({
		connect: vi.fn(),
		gain: {
			setValueAtTime: vi.fn(),
			exponentialRampToValueAtTime: vi.fn(),
		},
	});
}

// Store original
const originalAudioContext = globalThis.AudioContext;

describe("AudioService", () => {
	let mockAudioContext: MockAudioContext;

	beforeEach(() => {
		mockAudioContext = new MockAudioContext();
		// @ts-expect-error - mocking global
		globalThis.AudioContext = vi.fn(() => mockAudioContext);
		// Reset module to get fresh instance
		vi.resetModules();
	});

	afterEach(() => {
		globalThis.AudioContext = originalAudioContext;
		vi.restoreAllMocks();
	});

	describe("getState", () => {
		it("should return null state before any audio call", async () => {
			const { audioService } = await import("./audioService");
			const state = audioService.getState();
			// Context created lazily, so initially null
			expect(state.contextExists).toBe(false);
			expect(state.state).toBe(null);
		});

		it("should return context state after prime()", async () => {
			const { audioService } = await import("./audioService");
			audioService.prime();
			const state = audioService.getState();
			expect(state.contextExists).toBe(true);
			expect(state.state).toBe("suspended");
		});
	});

	describe("playBeep", () => {
		it("should call resume when context is suspended", async () => {
			const { audioService } = await import("./audioService");
			audioService.playBeep(440, 0.1);

			expect(mockAudioContext.resume).toHaveBeenCalled();
		});

		it("should create oscillator and gain nodes when context is running", async () => {
			mockAudioContext.state = "running";
			const { audioService } = await import("./audioService");
			audioService.playBeep(440, 0.1);

			expect(mockAudioContext.createOscillator).toHaveBeenCalled();
			expect(mockAudioContext.createGain).toHaveBeenCalled();
		});

		it("should use provided frequency and duration", async () => {
			mockAudioContext.state = "running";
			const { audioService } = await import("./audioService");
			audioService.playBeep(880, 0.2, "square", 0.5);

			const oscillator = mockAudioContext.createOscillator.mock.results[0].value;
			expect(oscillator.frequency.value).toBe(880);
			expect(oscillator.type).toBe("square");
		});
	});

	describe("testSound", () => {
		it("should return state information", async () => {
			const { audioService } = await import("./audioService");
			const result = audioService.testSound();

			expect(result).toHaveProperty("state");
			expect(result).toHaveProperty("played");
		});

		it("should play immediately when context is running", async () => {
			mockAudioContext.state = "running";
			const { audioService } = await import("./audioService");
			const result = audioService.testSound();

			expect(result.played).toBe(true);
			expect(mockAudioContext.createOscillator).toHaveBeenCalled();
		});

		it("should attempt resume when context is suspended", async () => {
			const { audioService } = await import("./audioService");
			const result = audioService.testSound();

			expect(result.played).toBe(false);
			expect(mockAudioContext.resume).toHaveBeenCalled();
		});
	});

	describe("ensureRunning", () => {
		it("should return immediately if context is running", async () => {
			mockAudioContext.state = "running";
			const { audioService } = await import("./audioService");
			const ctx = await audioService.ensureRunning();

			expect(ctx).toBeDefined();
			expect(mockAudioContext.resume).not.toHaveBeenCalled();
		});

		it("should call resume if context is suspended", async () => {
			const { audioService } = await import("./audioService");
			await audioService.ensureRunning();

			expect(mockAudioContext.resume).toHaveBeenCalled();
		});
	});
});
