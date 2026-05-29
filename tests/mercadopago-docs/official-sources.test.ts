import { describe, expect, it } from "vitest";
import {
	OFFICIAL_DOCS_SOURCES,
	SUPPORTED_LOCALES,
} from "../../src/mercadopago-docs/official-sources";

describe("official Mercado Pago source matrix", () => {
	it("records only conservatively verified hosts and docs/reference path families", () => {
		expect(SUPPORTED_LOCALES).toEqual(["es", "en", "pt"]);
		expect(OFFICIAL_DOCS_SOURCES).toEqual([
			{
				host: "mercadopago.com",
				locales: ["es", "en", "pt"],
				pathFamilies: ["docs", "reference"],
				evidence: expect.arrayContaining([
					"https://mercadopago.com/developers/pt/docs",
					"https://mercadopago.com/developers/en/reference/online-payments/checkout-pro/create-refund/post",
				]),
			},
			{
				host: "www.mercadopago.com",
				locales: ["es", "en", "pt"],
				pathFamilies: ["docs", "reference"],
				evidence: expect.arrayContaining([
					"https://www.mercadopago.com/developers/en/docs/",
					"https://www.mercadopago.com/developers/es/reference/",
				]),
			},
		]);
	});

	it("does not guess country-specific hosts before explicit verification", () => {
		expect(OFFICIAL_DOCS_SOURCES.map((source) => source.host)).not.toContain(
			"www.mercadopago.com.ar",
		);
		expect(OFFICIAL_DOCS_SOURCES.map((source) => source.host)).not.toContain(
			"www.mercadopago.com.br",
		);
		expect(OFFICIAL_DOCS_SOURCES.map((source) => source.host)).not.toContain(
			"www.mercadopago.com.mx",
		);
	});
});
