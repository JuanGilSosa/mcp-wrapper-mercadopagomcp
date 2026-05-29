import { OfficialWrapperError } from "./errors.js";

export const OFFICIAL_MERCADO_PAGO_MCP_URL = "https://mcp.mercadopago.com/mcp";

export type OfficialWrapperConfigInput = {
	env?: NodeJS.ProcessEnv;
	startupTimeoutMs?: number;
	shutdownGraceMs?: number;
};

export type OfficialWrapperConfig = {
	authHeader: string;
	remoteUrl: string;
	command: "npx";
	args: string[];
	env: NodeJS.ProcessEnv;
	startupTimeoutMs: number;
	shutdownGraceMs: number;
};

export function parseOfficialWrapperConfig(
	input: OfficialWrapperConfigInput = {},
): OfficialWrapperConfig {
	const env = { ...(input.env ?? process.env) };
	const authHeader = env.AUTH_HEADER?.trim() ?? "";
	if (!authHeader) throw new OfficialWrapperError("MissingAuth");
	if (!authHeader.startsWith("Bearer "))
		throw new OfficialWrapperError("InvalidAuth");

	env.AUTH_HEADER = authHeader;
	const args = [
		"-y",
		"mcp-remote",
		OFFICIAL_MERCADO_PAGO_MCP_URL,
		"--header",
		`Authorization:${authHeader}`,
	];

	return {
		authHeader,
		remoteUrl: OFFICIAL_MERCADO_PAGO_MCP_URL,
		command: "npx",
		args,
		env,
		startupTimeoutMs: input.startupTimeoutMs ?? 10_000,
		shutdownGraceMs: input.shutdownGraceMs ?? 2_000,
	};
}
