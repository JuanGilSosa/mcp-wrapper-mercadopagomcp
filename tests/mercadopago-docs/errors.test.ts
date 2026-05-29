import { z } from "zod";
import { describe, expect, it } from "vitest";
import {
	ERROR_CODES,
	MercadoPagoDocsError,
	toMcpError,
} from "../../src/mercadopago-docs/errors";

describe("domain errors", () => {
	it("defines stable MCP-facing error codes", () => {
		expect(ERROR_CODES).toEqual([
			"InvalidInput",
			"InvalidUrl",
			"UrlNotAllowed",
			"NotFound",
			"FetchFailed",
			"UnsupportedContentType",
			"ExtractionFailed",
			"RateLimited",
		]);
	});

	it("maps errors to safe MCP-visible payloads", () => {
		const error = new MercadoPagoDocsError(
			"UrlNotAllowed",
			"URL is outside official Mercado Pago docs",
			{
				host: "example.com",
				secret: "must-not-leak",
				stack: "must-not-leak",
			},
		);

		expect(toMcpError(error)).toEqual({
			code: "UrlNotAllowed",
			message: "URL is outside official Mercado Pago docs",
			context: { host: "example.com" },
		});
	});

	it("maps schema validation errors to InvalidInput", () => {
		const schema = z.object({ query: z.string().min(1) });

		expect(toMcpError(schema.safeParse({ query: "" }).error)).toEqual({
			code: "InvalidInput",
			message: "Tool input validation failed",
			context: { issues: 1 },
		});
	});

	it("maps unknown errors to FetchFailed without leaking internals", () => {
		expect(toMcpError(new Error("socket hang up"))).toEqual({
			code: "FetchFailed",
			message: "Unexpected Mercado Pago docs failure",
		});
	});
});
