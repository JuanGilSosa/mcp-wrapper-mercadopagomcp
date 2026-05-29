export const OFFICIAL_WRAPPER_ERROR_CODES = [
	"MissingAuth",
	"InvalidAuth",
	"SpawnFailed",
	"StartupTimeout",
	"ChildExited",
	"BridgeClosed",
] as const;

export type OfficialWrapperErrorCode =
	(typeof OFFICIAL_WRAPPER_ERROR_CODES)[number];

const ERROR_MESSAGES: Record<OfficialWrapperErrorCode, string> = {
	MissingAuth:
		"AUTH_HEADER is required and must be set to Bearer <ACCESS_TOKEN>.",
	InvalidAuth: "AUTH_HEADER must use the Bearer scheme.",
	SpawnFailed: "Failed to start Mercado Pago official MCP bridge.",
	StartupTimeout: "Mercado Pago official MCP bridge did not start in time.",
	ChildExited: "Mercado Pago official MCP bridge exited unexpectedly.",
	BridgeClosed: "Mercado Pago official MCP bridge closed.",
};

export class OfficialWrapperError extends Error {
	readonly code: OfficialWrapperErrorCode;
	readonly safeDetails?: string;

	constructor(code: OfficialWrapperErrorCode, safeDetails?: string) {
		super(ERROR_MESSAGES[code]);
		this.name = "OfficialWrapperError";
		this.code = code;
		this.safeDetails = safeDetails;
	}
}

function escapeRegExp(value: string): string {
	return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function redactOfficialWrapperSecrets(
	value: string,
	authHeader?: string,
): string {
	let redacted = value;
	const trimmed = authHeader?.trim();
	if (trimmed) {
		redacted = redacted.replaceAll(
			`Authorization:${trimmed}`,
			"Authorization:Bearer <redacted>",
		);
		redacted = redacted.replaceAll(trimmed, "Bearer <redacted>");
	}
	return redacted
		.replace(
			/Authorization:Bearer\s+[^\s"']+/g,
			"Authorization:Bearer <redacted>",
		)
		.replace(/Bearer\s+(?!<redacted>)[^\s"']+/g, "Bearer <redacted>");
}

export function toOfficialWrapperError(
	code: OfficialWrapperErrorCode,
	cause?: unknown,
	authHeader?: string,
): OfficialWrapperError {
	const details =
		cause instanceof Error
			? cause.message
			: typeof cause === "string"
				? cause
				: undefined;
	return new OfficialWrapperError(
		code,
		details ? redactOfficialWrapperSecrets(details, authHeader) : undefined,
	);
}
