import { describe, expect, it } from "vitest";
import {
	normalizeOfficialDocsUrl,
	validateOfficialDocsUrl,
} from "../../src/mercadopago-docs/allowlist";

describe("official docs URL allowlist", () => {
	it.each([
		["https://mercadopago.com/developers/pt/docs", "docs", "pt"],
		["https://www.mercadopago.com/developers/es/reference/", "reference", "es"],
		[
			"https://www.mercadopago.com/developers/en/reference/online-payments/checkout-api-payments/addresses/create-address/post",
			"reference",
			"en",
		],
	])("accepts verified official URL %s", (url, sourceKind, locale) => {
		expect(validateOfficialDocsUrl(url)).toMatchObject({
			ok: true,
			normalizedUrl: expect.stringContaining("/developers/"),
			sourceKind,
			locale,
		});
	});

	it.each([
		"http://mercadopago.com/developers/pt/docs",
		"https://localhost/developers/es/docs",
		"https://127.0.0.1/developers/es/docs",
		"https://10.0.0.1/developers/es/docs",
		"https://[::1]/developers/es/docs",
		"https://user:pass@mercadopago.com/developers/es/docs",
		"https://mercadopago.com:444/developers/es/docs",
		"https://example.com/developers/es/docs",
		"https://www.mercadopago.com/not-developers/es/docs",
		"https://www.mercadopago.com/developers/fr/docs",
		"https://www.mercadopago.com/developers/es/sdk",
		"https://www.mercadopago.com/developers/es/docs/%2e%2e/private",
	])("rejects unsafe or unofficial URL %s", (url) => {
		expect(validateOfficialDocsUrl(url)).toMatchObject({ ok: false });
	});

	it("normalizes mixed-case hosts, explicit 443, query strings, and fragments", () => {
		expect(
			normalizeOfficialDocsUrl(
				"https://WWW.MERCADOPAGO.COM:443/developers/es/docs/checkout-pro?utm=x#intro",
			),
		).toBe(
			"https://www.mercadopago.com/developers/es/docs/checkout-pro?utm=x#intro",
		);
	});
});
