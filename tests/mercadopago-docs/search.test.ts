import { describe, expect, it } from "vitest";
import { MercadoPagoDocsError } from "../../src/mercadopago-docs/errors";
import { rankIndexedDocs } from "../../src/mercadopago-docs/rank";
import {
	resolveDocById,
	searchDocs,
	type IndexedDoc,
} from "../../src/mercadopago-docs/search";

const unsafeIndex: IndexedDoc[] = [
	{
		doc_id: "safe-checkout-pro",
		title: "Checkout Pro overview",
		url: "https://www.mercadopago.com/developers/en/docs/checkout-pro/landing",
		locale: "en",
		country: "global",
		source_kind: "docs",
		snippet: "Accept payments with Checkout Pro.",
		keywords: ["checkout", "payments"],
	},
	{
		doc_id: "duplicate-checkout-pro",
		title: "Checkout Pro duplicate",
		url: "https://WWW.MERCADOPAGO.COM:443/developers/en/docs/checkout-pro/landing#ignored",
		locale: "en",
		country: "global",
		source_kind: "docs",
		snippet: "Duplicate URL should be ignored.",
	},
	{
		doc_id: "unsafe-external",
		title: "External fake docs",
		url: "https://example.com/developers/en/docs/checkout-pro/landing",
		locale: "en",
		country: "global",
		source_kind: "docs",
		snippet: "This must never be returned.",
	},
];

describe("searchDocs", () => {
	it("returns ranked official docs/reference matches only", () => {
		const result = searchDocs({ query: "checkout", locale: "en", limit: 3 });

		expect(result.matches.map((match) => match.doc_id)).toEqual([
			"checkout-pro-overview",
			"create-refund-reference",
		]);
		expect(result.matches).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					title: "Checkout Pro overview",
					url: "https://www.mercadopago.com/developers/en/docs/checkout-pro/landing",
					source_kind: "docs",
					locale: "en",
					country: "global",
				}),
			]),
		);
		for (const match of result.matches) {
			expect(match).not.toHaveProperty("answer");
			expect(match).not.toHaveProperty("recommendation");
		}
	});

	it("applies schema validation, filters, bounded limits, de-duplication, and URL revalidation", () => {
		expect(
			searchDocs({ query: "checkout", limit: 20 }, { index: unsafeIndex })
				.matches,
		).toHaveLength(1);
		expect(
			searchDocs({ query: "checkout", locale: "es" }, { index: unsafeIndex })
				.matches,
		).toEqual([]);
		expect(
			searchDocs(
				{ query: "checkout", country: "global" },
				{ index: unsafeIndex },
			).matches[0]?.url,
		).toBe(
			"https://www.mercadopago.com/developers/en/docs/checkout-pro/landing",
		);
		expect(() => searchDocs({ query: "" }, { index: unsafeIndex })).toThrow();
	});

	it("returns empty source-result output for no matches", () => {
		expect(searchDocs({ query: "nonexistent-token" }).matches).toEqual([]);
	});

	it("does not synthesize answers for explanation-style queries", () => {
		const result = searchDocs({
			query: "explain how to create a refund recommendation",
			limit: 5,
		});

		expect(result).toEqual({ matches: expect.any(Array) });
		expect(JSON.stringify(result).toLowerCase()).not.toContain("you should");
		expect(JSON.stringify(result).toLowerCase()).not.toContain("recommend");
	});
});

describe("rankIndexedDocs", () => {
	it("scores exact title and keyword matches before weaker snippet matches", () => {
		const ranked = rankIndexedDocs("checkout payments", unsafeIndex);

		expect(ranked[0]?.doc.doc_id).toBe("safe-checkout-pro");
		expect(ranked[0]?.score).toBeGreaterThan(ranked[1]?.score ?? 0);
	});
});

describe("resolveDocById", () => {
	it("resolves only known safe indexed docs", () => {
		expect(resolveDocById("checkout-pro-overview")?.url).toBe(
			"https://www.mercadopago.com/developers/en/docs/checkout-pro/landing",
		);
		expect(resolveDocById("missing-doc")).toBeUndefined();
		expect(() => resolveDocById("unsafe-external", unsafeIndex)).toThrow(
			MercadoPagoDocsError,
		);
	});
});
