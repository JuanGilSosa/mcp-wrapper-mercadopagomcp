import { describe, expect, it } from "vitest";
import * as publicApi from "../../src/mercadopago-docs/index.js";

describe("mercadopago docs public surface", () => {
	it("exports only PR1, PR2, and PR3 MCP docs APIs", () => {
		expect(Object.keys(publicApi).sort()).toEqual([
			"ERROR_CODES",
			"MERCADO_PAGO_READ_DOC_TOOL",
			"MERCADO_PAGO_SEARCH_DOCS_TOOL",
			"MercadoPagoDocsError",
			"OFFICIAL_DOCS_SOURCES",
			"SUPPORTED_LOCALES",
			"createMemoryCache",
			"createMercadoPagoDocsHandlers",
			"createMercadoPagoDocsMcpServer",
			"extractDocumentation",
			"fetchOfficialDoc",
			"normalizeCacheKey",
			"normalizeOfficialDocsUrl",
			"parseSafeReadDocInput",
			"rankIndexedDocs",
			"readDocInputSchema",
			"registerMercadoPagoDocsTools",
			"resolveDocById",
			"resolveRedirectLocation",
			"searchDocs",
			"searchDocsInputSchema",
			"toMcpError",
			"validateOfficialDocsUrl",
			"validateRedirectChain",
			"validateRedirectHop",
		]);
	});
});
