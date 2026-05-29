import { PassThrough, Writable } from "node:stream";
import { EventEmitter } from "node:events";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
	OfficialWrapperError,
	runOfficialWrapper,
	type ChildProcessLike,
} from "../../src/mercadopago-official-wrapper/index.js";

const AUTH_HEADER = "Bearer APP_USR-test-secret";

function writableBuffer() {
	let text = "";
	return {
		stream: new Writable({
			write(chunk, _encoding, callback) {
				text += chunk.toString();
				callback();
			},
		}),
		text: () => text,
	};
}

function child() {
	const process = new EventEmitter() as ChildProcessLike;
	process.stdin = new PassThrough();
	process.stdout = new PassThrough();
	process.stderr = new PassThrough();
	process.kill = vi.fn();
	return process;
}

describe("runOfficialWrapper", () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("validates auth before spawning", async () => {
		const spawn = vi.fn();
		await expect(runOfficialWrapper({ env: {}, spawn })).rejects.toMatchObject({
			code: "MissingAuth",
		});
		expect(spawn).not.toHaveBeenCalled();
	});

	it("spawns mcp-remote, bridges stdio, and redacts stderr", async () => {
		const fakeChild = child();
		const spawn = vi.fn(() => fakeChild);
		const input = new PassThrough();
		const output = writableBuffer();
		const err = writableBuffer();
		const run = runOfficialWrapper({
			env: { AUTH_HEADER },
			spawn,
			stdin: input,
			stdout: output.stream,
			stderr: err.stream,
		});

		expect(spawn).toHaveBeenCalledWith(
			"npx",
			expect.arrayContaining([
				"mcp-remote",
				"--header",
				`Authorization:${AUTH_HEADER}`,
			]),
			expect.objectContaining({ stdio: ["pipe", "pipe", "pipe"] }),
		);

		input.write("client-json");
		expect(fakeChild.stdin.read()?.toString()).toBe("client-json");
		fakeChild.stdout.write("server-json");
		fakeChild.stderr.write(`bad ${AUTH_HEADER}`);
		fakeChild.emit("close", 0);

		await expect(run).resolves.toEqual({ code: "BridgeClosed", exitCode: 0 });
		expect(output.text()).toBe("server-json");
		expect(err.text()).toBe("bad Bearer <redacted>");
	});

	it("maps spawn errors and non-zero child exits safely", async () => {
		const spawnErrorChild = child();
		const spawnRun = runOfficialWrapper({
			env: { AUTH_HEADER },
			spawn: vi.fn(() => spawnErrorChild),
		});
		spawnErrorChild.emit("error", new Error(`boom ${AUTH_HEADER}`));
		await expect(spawnRun).rejects.toMatchObject({
			code: "SpawnFailed",
			safeDetails: expect.not.stringContaining("APP_USR-test-secret"),
		});

		const exitChild = child();
		const exitRun = runOfficialWrapper({
			env: { AUTH_HEADER },
			spawn: vi.fn(() => exitChild),
		});
		exitChild.emit("close", 2);
		await expect(exitRun).rejects.toMatchObject({ code: "ChildExited" });
	});

	it("clears startup timeout when the child process spawns", async () => {
		const fakeChild = child();
		let timeout: (() => void) | undefined;
		let timeoutActive = true;
		const run = runOfficialWrapper({
			env: { AUTH_HEADER },
			spawn: vi.fn(() => fakeChild),
			startupTimeoutMs: 1,
			setTimeout: ((callback: () => void) => {
				timeout = () => {
					if (timeoutActive) callback();
				};
				return 1 as never;
			}) as typeof setTimeout,
			clearTimeout: vi.fn(() => {
				timeoutActive = false;
			}) as unknown as typeof clearTimeout,
		});
		fakeChild.emit("spawn");
		timeout?.();
		fakeChild.emit("close", 0);

		await expect(run).resolves.toEqual({ code: "BridgeClosed", exitCode: 0 });
		expect(fakeChild.kill).not.toHaveBeenCalled();
	});

	it("times out startup and kills the child once", async () => {
		const fakeChild = child();
		let timeout: (() => void) | undefined;
		const run = runOfficialWrapper({
			env: { AUTH_HEADER },
			spawn: vi.fn(() => fakeChild),
			startupTimeoutMs: 1,
			setTimeout: ((callback: () => void) => {
				timeout = callback;
				return 1 as never;
			}) as typeof setTimeout,
			clearTimeout: vi.fn() as unknown as typeof clearTimeout,
		});
		timeout?.();
		await expect(run).rejects.toMatchObject({ code: "StartupTimeout" });
		expect(fakeChild.kill).toHaveBeenCalledTimes(1);
		fakeChild.emit("close", 1);
		expect(fakeChild.kill).toHaveBeenCalledTimes(1);
	});

	it("handles process signals with idempotent child cleanup", async () => {
		const fakeChild = child();
		const originalOnce = process.once;
		const originalOff = process.off;
		const handlers = new Map<string, () => void>();
		vi.spyOn(process, "once").mockImplementation((event, handler) => {
			if (["SIGINT", "SIGTERM", "SIGHUP"].includes(String(event))) {
				handlers.set(String(event), handler as () => void);
				return process;
			}
			return originalOnce.call(process, event, handler);
		});
		vi.spyOn(process, "off").mockImplementation((event, handler) => {
			if (["SIGINT", "SIGTERM", "SIGHUP"].includes(String(event))) {
				if (handlers.get(String(event)) === handler)
					handlers.delete(String(event));
				return process;
			}
			return originalOff.call(process, event, handler);
		});
		let graceTimeout: (() => void) | undefined;
		const run = runOfficialWrapper({
			env: { AUTH_HEADER },
			spawn: vi.fn(() => fakeChild),
			setTimeout: ((callback: () => void, ms?: number) => {
				if (ms !== 10_000) graceTimeout = callback;
				return 1 as never;
			}) as typeof setTimeout,
			clearTimeout: vi.fn() as unknown as typeof clearTimeout,
		});

		handlers.get("SIGINT")?.();
		handlers.get("SIGTERM")?.();
		graceTimeout?.();
		fakeChild.emit("close", 0);

		await expect(run).resolves.toEqual({ code: "BridgeClosed", exitCode: 0 });
		expect(fakeChild.kill).toHaveBeenCalledWith("SIGTERM");
		expect(fakeChild.kill).toHaveBeenCalledWith("SIGKILL");
		expect(fakeChild.kill).toHaveBeenCalledTimes(2);
		expect(handlers.size).toBe(0);
	});
});
