import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { createMemoryCache } from "../../src/mercadopago-docs/cache";
import { MercadoPagoDocsError } from "../../src/mercadopago-docs/errors";
import {
	MERCADO_PAGO_READ_DOC_TOOL,
	MERCADO_PAGO_SEARCH_DOCS_TOOL,
	createMercadoPagoDocsHandlers,
	registerMercadoPagoDocsTools,
} from "../../src/mercadopago-docs/mcp";

const fixtureDir = join(process.cwd(), "tests/fixtures/mercadopago-docs");
const docsHtml = readFileSync(join(fixtureDir, "docs-page.html"), "utf8");
const docsUrl =
	"https://www.mercadopago.com/developers/es/docs/checkout-pro/landing";

function htmlResponse(html = docsHtml) {
	return {
		status: 200,
		ok: true,
		headers: {
			get: (name: string) =>
				name.toLowerCase() === "content-type" ? "text/html" : null,
		},
		text: async () => html,
	};
}

describe("createMercadoPagoDocsHandlers", () => {
	it("returns source-only search results through the MCP tool handler", async () => {
		const handlers = createMercadoPagoDocsHandlers({
			fetch: vi.fn(),
			cache: createMemoryCache<string>({ ttlMs: 60_000, maxEntries: 5 }),
		});

		const result = await handlers.callTool(MERCADO_PAGO_SEARCH_DOCS_TOOL, {
			query: "checkout",
			locale: "es",
		});

		expect(result.structuredContent).toEqual({
			matches: [
				expect.objectContaining({
					doc_id: "checkout-pro-overview-es",
					url: docsUrl,
					source_kind: "docs",
				}),
			],
		});
		expect(result.content[0]).toEqual({
			type: "text",
			text: JSON.stringify(result.structuredContent, null, 2),
		});
		expect(JSON.stringify(result).toLowerCase()).not.toContain("you should");
	});

	it("reads by doc_id and by URL with mocked fetch/extract path", async () => {
		const fetch = vi.fn(async () => htmlResponse());
		const handlers = createMercadoPagoDocsHandlers({
			fetch,
			cache: createMemoryCache<string>({ ttlMs: 60_000, maxEntries: 5 }),
			now: () => new Date("2026-05-27T00:00:00.000Z"),
		});

		const byDocId = await handlers.callTool(MERCADO_PAGO_READ_DOC_TOOL, {
			doc_id: "checkout-pro-overview-es",
		});
		const byUrl = await handlers.callTool(MERCADO_PAGO_READ_DOC_TOOL, {
			url: docsUrl,
		});

		expect(byDocId.structuredContent).toEqual(
			expect.objectContaining({
				title: "Visión general",
				canonical_url: docsUrl,
				metadata: expect.objectContaining({
					cache: "miss",
					source_kind: "docs",
					locale: "es",
				}),
			}),
		);
		expect((byUrl.structuredContent.metadata as { cache: string }).cache).toBe(
			"hit",
		);
		expect(fetch).toHaveBeenCalledTimes(1);
	});

	it("rejects unsafe read inputs before fetch and maps stable errors", async () => {
		const fetch = vi.fn(async () => htmlResponse());
		const handlers = createMercadoPagoDocsHandlers({ fetch });

		const result = await handlers.callTool(MERCADO_PAGO_READ_DOC_TOOL, {
			url: "https://example.com/",
		});

		expect(result.isError).toBe(true);
		expect(result.structuredContent).toEqual(
			expect.objectContaining({
				error: expect.objectContaining({ code: "UrlNotAllowed" }),
			}),
		);
		expect(fetch).not.toHaveBeenCalled();
	});

	it("maps malformed tool inputs to InvalidInput instead of fetch errors", async () => {
		const fetch = vi.fn(async () => htmlResponse());
		const handlers = createMercadoPagoDocsHandlers({ fetch });

		const badSearch = await handlers.callTool(MERCADO_PAGO_SEARCH_DOCS_TOOL, {
			query: "",
		});
		const badRead = await handlers.callTool(MERCADO_PAGO_READ_DOC_TOOL, {
			url: "not a url",
		});

		expect(badSearch.structuredContent).toEqual(
			expect.objectContaining({
				error: expect.objectContaining({ code: "InvalidInput" }),
			}),
		);
		expect(badRead.structuredContent).toEqual(
			expect.objectContaining({
				error: expect.objectContaining({ code: "InvalidInput" }),
			}),
		);
		expect(fetch).not.toHaveBeenCalled();
	});

	it("maps unknown tool and domain errors without leaking internals", async () => {
		const handlers = createMercadoPagoDocsHandlers({
			fetch: vi.fn(async () => {
				throw new MercadoPagoDocsError("FetchFailed", "boom", {
					secret: "nope",
				} as never);
			}),
		});

		await expect(handlers.callTool("unknown", {})).rejects.toThrow(
			/unknown .* tool/i,
		);
		const result = await handlers.callTool(MERCADO_PAGO_READ_DOC_TOOL, {
			doc_id: "checkout-pro-overview-es",
		});
		expect(result.isError).toBe(true);
		expect(JSON.stringify(result)).not.toContain("secret");
	});
});

describe("registerMercadoPagoDocsTools", () => {
	it("registers search and read tools on an MCP-compatible server", () => {
		const registered: Record<string, unknown> = {};
		const server = {
			registerTool: vi.fn((name: string, config: unknown, handler: unknown) => {
				registered[name] = { config, handler };
			}),
		};
		const handlers = createMercadoPagoDocsHandlers({ fetch: vi.fn() });

		registerMercadoPagoDocsTools(server, handlers);

		expect(server.registerTool).toHaveBeenCalledTimes(2);
		expect(Object.keys(registered).sort()).toEqual([
			MERCADO_PAGO_READ_DOC_TOOL,
			MERCADO_PAGO_SEARCH_DOCS_TOOL,
		]);
		expect(registered[MERCADO_PAGO_SEARCH_DOCS_TOOL]).toEqual(
			expect.objectContaining({
				config: expect.objectContaining({
					description: expect.stringContaining("official Mercado Pago"),
				}),
			}),
		);
	});
});
