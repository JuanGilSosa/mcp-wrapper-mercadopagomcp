import type { OfficialWrapperConfig } from "./config.js";
import { OFFICIAL_MERCADO_PAGO_MCP_URL } from "./config.js";
import { redactOfficialWrapperSecrets } from "./errors.js";

export type OfficialClientEvidence = {
	command: "npx";
	args: string[];
	env: { AUTH_HEADER: "Bearer <ACCESS_TOKEN>" };
};

export type OfficialRemoteCommand = {
	command: "npx";
	args: string[];
	env: NodeJS.ProcessEnv;
	redacted: { command: string; args: string[] };
};

export function buildOfficialClientEvidence(): OfficialClientEvidence {
	return {
		command: "npx",
		args: [
			"-y",
			"mcp-remote",
			OFFICIAL_MERCADO_PAGO_MCP_URL,
			"--header",
			"Authorization:${AUTH_HEADER}",
		],
		env: { AUTH_HEADER: "Bearer <ACCESS_TOKEN>" },
	};
}

export function buildOfficialRemoteCommand(
	config: OfficialWrapperConfig,
): OfficialRemoteCommand {
	return {
		command: config.command,
		args: [...config.args],
		env: { ...config.env, AUTH_HEADER: config.authHeader },
		redacted: {
			command: config.command,
			args: config.args.map((arg) =>
				redactOfficialWrapperSecrets(arg, config.authHeader),
			),
		},
	};
}
