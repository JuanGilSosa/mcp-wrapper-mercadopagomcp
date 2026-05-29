import { describe, expect, it } from "vitest";
import { MercadoPagoDocsError } from "../../src/mercadopago-docs/errors";
import {
	parseSafeReadDocInput,
	readDocInputSchema,
	searchDocsInputSchema,
} from "../../src/mercadopago-docs/schemas";

describe("searchDocsInputSchema", () => {
	it("trims query and applies defaults", () => {
		expect(searchDocsInputSchema.parse({ query: " checkout pro " })).toEqual({
			query: "checkout pro",
			limit: 5,
		});
	});

	it("accepts supported locale, country, and bounded limit", () => {
		expect(
			searchDocsInputSchema.parse({
				query: "refund",
				locale: "en",
				country: "global",
				limit: 10,
			}),
		).toEqual({
			query: "refund",
			locale: "en",
			country: "global",
			limit: 10,
		});
	});

	it.each([
		{ query: "" },
		{ query: "   " },
		{ query: "x".repeat(201) },
		{ query: "ok", locale: "fr" },
		{ query: "ok", country: "ar" },
		{ query: "ok", limit: 0 },
		{ query: "ok", limit: 21 },
		{ query: "ok", limit: 1.5 },
	])("rejects invalid search input %#", (input) => {
		expect(() => searchDocsInputSchema.parse(input)).toThrow();
	});
});

describe("readDocInputSchema", () => {
	it("accepts exactly one doc_id or url", () => {
		expect(
			readDocInputSchema.parse({ doc_id: "checkout-pro-overview" }),
		).toEqual({ doc_id: "checkout-pro-overview" });
		expect(
			readDocInputSchema.parse({
				url: "https://www.mercadopago.com/developers/es/docs/checkout-pro/landing",
			}),
		).toEqual({
			url: "https://www.mercadopago.com/developers/es/docs/checkout-pro/landing",
		});
	});

	it.each([
		{},
		{ doc_id: "", url: undefined },
		{ doc_id: "../escape" },
		{ doc_id: "with spaces" },
		{ url: "not a url" },
		{
			doc_id: "checkout-pro",
			url: "https://www.mercadopago.com/developers/es/docs/checkout-pro/landing",
		},
	])("rejects invalid read input %#", (input) => {
		expect(() => readDocInputSchema.parse(input)).toThrow();
	});

	it("keeps the base schema shape-only for URL fields", () => {
		expect(readDocInputSchema.parse({ url: "https://example.com/" })).toEqual({
			url: "https://example.com/",
		});
	});
});

describe("parseSafeReadDocInput", () => {
	it("normalizes allowlisted read URLs before fetch boundaries", () => {
		expect(
			parseSafeReadDocInput({
				url: "https://WWW.MERCADOPAGO.COM:443/developers/es/docs/checkout-pro/landing?x=1#intro",
			}),
		).toEqual({
			url: "https://www.mercadopago.com/developers/es/docs/checkout-pro/landing?x=1#intro",
		});
	});

	it("returns doc_id inputs without URL allowlist validation", () => {
		expect(parseSafeReadDocInput({ doc_id: "checkout-pro/landing" })).toEqual({
			doc_id: "checkout-pro/landing",
		});
	});

	it.each([
		{ url: "https://example.com/" },
		{ url: "http://localhost/developers/es/docs/checkout-pro/landing" },
		{ url: "https://www.mercadopago.com/not-docs" },
	])("rejects URL-shaped but unsafe read inputs %#", (input) => {
		expect(() => parseSafeReadDocInput(input)).toThrow(MercadoPagoDocsError);
	});
});
