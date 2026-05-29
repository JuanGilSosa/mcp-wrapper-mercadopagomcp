import { ZodError } from "zod";

export const ERROR_CODES = [
	"InvalidInput",
	"InvalidUrl",
	"UrlNotAllowed",
	"NotFound",
	"FetchFailed",
	"UnsupportedContentType",
	"ExtractionFailed",
	"RateLimited",
] as const;

export type ErrorCode = (typeof ERROR_CODES)[number];

export type SafeErrorContext = Record<
	string,
	string | number | boolean | undefined
>;

const SAFE_CONTEXT_KEYS = new Set([
	"host",
	"path",
	"status",
	"reason",
	"locale",
	"sourceKind",
	"url",
	"issues",
]);

export class MercadoPagoDocsError extends Error {
	readonly code: ErrorCode;
	readonly context?: SafeErrorContext;

	constructor(code: ErrorCode, message: string, context?: SafeErrorContext) {
		super(message);
		this.name = "MercadoPagoDocsError";
		this.code = code;
		this.context = context;
	}
}

export type McpErrorPayload = {
	code: ErrorCode;
	message: string;
	context?: SafeErrorContext;
};

function safeContext(context?: SafeErrorContext): SafeErrorContext | undefined {
	if (!context) return undefined;
	const entries = Object.entries(context).filter(
		([key, value]) => SAFE_CONTEXT_KEYS.has(key) && value !== undefined,
	);
	return entries.length === 0 ? undefined : Object.fromEntries(entries);
}

export function toMcpError(error: unknown): McpErrorPayload {
	if (error instanceof MercadoPagoDocsError) {
		const context = safeContext(error.context);
		return context
			? { code: error.code, message: error.message, context }
			: { code: error.code, message: error.message };
	}

	if (error instanceof ZodError) {
		return {
			code: "InvalidInput",
			message: "Tool input validation failed",
			context: { issues: error.issues.length },
		};
	}

	return {
		code: "FetchFailed",
		message: "Unexpected Mercado Pago docs failure",
	};
}
