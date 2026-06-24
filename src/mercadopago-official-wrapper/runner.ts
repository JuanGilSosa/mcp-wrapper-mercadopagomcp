import { spawn as nodeSpawn } from "node:child_process";
import type { Readable, Writable } from "node:stream";
import { buildOfficialRemoteCommand } from "./command.js";
import {
	type OfficialWrapperConfig,
	type OfficialWrapperConfigInput,
	parseOfficialWrapperConfig,
} from "./config.js";
import {
	OfficialWrapperError,
	redactOfficialWrapperSecrets,
	toOfficialWrapperError,
} from "./errors.js";

export type ChildProcessLike = NodeJS.EventEmitter & {
	stdin: Writable;
	stdout: Readable;
	stderr: Readable;
	kill: (signal?: NodeJS.Signals | number) => boolean | void;
};

export type SpawnLike = (
	command: string,
	args: readonly string[],
	options: { env: NodeJS.ProcessEnv; stdio: ["pipe", "pipe", "pipe"] },
) => ChildProcessLike;

export type OfficialWrapperRunnerOptions = OfficialWrapperConfigInput & {
	config?: OfficialWrapperConfig;
	spawn?: SpawnLike;
	stdin?: Readable;
	stdout?: Writable;
	stderr?: Writable;
	setTimeout?: typeof globalThis.setTimeout;
	clearTimeout?: typeof globalThis.clearTimeout;
};

export type OfficialWrapperRunResult = {
	code: "BridgeClosed";
	exitCode: number;
};

function defaultSpawn(...args: Parameters<SpawnLike>): ChildProcessLike {
	if (process.platform === "win32") {
		return nodeSpawn(
			"cmd.exe",
			["/d", "/c", args[0], ...args[1]],
			args[2],
		) as ChildProcessLike;
	}

	return nodeSpawn(args[0], args[1], args[2]) as ChildProcessLike;
}

export async function runOfficialWrapper(
	options: OfficialWrapperRunnerOptions = {},
): Promise<OfficialWrapperRunResult> {
	const config =
		options.config ??
		parseOfficialWrapperConfig({
			env: options.env,
			startupTimeoutMs: options.startupTimeoutMs,
			shutdownGraceMs: options.shutdownGraceMs,
		});
	const command = buildOfficialRemoteCommand(config);
	const child = (options.spawn ?? defaultSpawn)(command.command, command.args, {
		env: command.env,
		stdio: ["pipe", "pipe", "pipe"],
	});
	const stdin = options.stdin ?? process.stdin;
	const stdout = options.stdout ?? process.stdout;
	const stderr = options.stderr ?? process.stderr;
	const setTimer = options.setTimeout ?? globalThis.setTimeout;
	const clearTimer = options.clearTimeout ?? globalThis.clearTimeout;

	let settled = false;
	let killed = false;
	let cleanupStarted = false;
	let startupTimer: ReturnType<typeof setTimeout> | undefined;
	let graceTimer: ReturnType<typeof setTimeout> | undefined;
	const signalHandlers: Array<readonly [NodeJS.Signals, () => void]> = [];

	const clearStartupTimer = () => {
		if (!startupTimer) return;
		clearTimer(startupTimer);
		startupTimer = undefined;
	};
	const killOnce = () => {
		if (killed) return;
		killed = true;
		child.kill("SIGTERM");
	};
	const cleanup = () => {
		clearStartupTimer();
		if (graceTimer) clearTimer(graceTimer);
		stdin.unpipe(child.stdin);
		child.stdout.unpipe(stdout);
		child.stderr.removeAllListeners("data");
		for (const [signal, handler] of signalHandlers) {
			process.off(signal, handler);
		}
	};

	return new Promise((resolve, reject) => {
		const fail = (error: OfficialWrapperError) => {
			if (settled) return;
			settled = true;
			cleanup();
			reject(error);
		};
		const pass = (exitCode: number) => {
			if (settled) return;
			settled = true;
			cleanup();
			resolve({ code: "BridgeClosed", exitCode });
		};

		stdin.pipe(child.stdin);
		child.stdout.pipe(stdout);
		child.stderr.on("data", (chunk: Buffer | string) => {
			clearStartupTimer();
			stderr.write(
				redactOfficialWrapperSecrets(chunk.toString(), config.authHeader),
			);
		});

		startupTimer = setTimer(() => {
			killOnce();
			fail(new OfficialWrapperError("StartupTimeout"));
		}, config.startupTimeoutMs);
		child.once("spawn", clearStartupTimer);
		child.stdout.once("data", clearStartupTimer);

		child.once("error", (error) => {
			fail(toOfficialWrapperError("SpawnFailed", error, config.authHeader));
		});
		child.once("close", (code) => {
			const exitCode = typeof code === "number" ? code : 1;
			if (exitCode === 0) pass(0);
			else
				fail(new OfficialWrapperError("ChildExited", `exit code ${exitCode}`));
		});

		for (const signal of ["SIGINT", "SIGTERM", "SIGHUP"] as const) {
			const handler = () => {
				if (cleanupStarted) return;
				cleanupStarted = true;
				killOnce();
				graceTimer = setTimer(
					() => child.kill("SIGKILL"),
					config.shutdownGraceMs,
				);
			};
			signalHandlers.push([signal, handler]);
			process.once(signal, handler);
		}
	});
}
