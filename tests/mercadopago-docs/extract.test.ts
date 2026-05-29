import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { MercadoPagoDocsError } from "../../src/mercadopago-docs/errors";
import { extractDocumentation } from "../../src/mercadopago-docs/extract";

const fixtureDir = join(process.cwd(), "tests/fixtures/mercadopago-docs");
const docsUrl =
	"https://www.mercadopago.com/developers/es/docs/checkout-pro/landing";
const referenceUrl =
	"https://www.mercadopago.com/developers/en/reference/online-payments/checkout-pro/create-refund/post";

function fixture(name: string) {
	return readFileSync(join(fixtureDir, name), "utf8");
}

describe("extractDocumentation", () => {
	it("preserves useful docs content as deterministic Markdown-ish text", () => {
		const result = extractDocumentation(fixture("docs-page.html"), {
			url: docsUrl,
		});

		expect(result).toEqual({
			title: "Visión general",
			canonical_url: docsUrl,
			headings: [
				{ level: 1, text: "Visión general" },
				{ level: 2, text: "Crear preferencia" },
			],
			content: expect.stringContaining("# Visión general"),
			links: [
				"https://www.mercadopago.com/developers/es/docs/checkout-pro/payment-methods",
			],
		});
		expect(result.content).toContain(
			"Checkout Pro te permite cobrar con Mercado Pago.",
		);
		expect(result.content).toContain("`POST /checkout/preferences`");
		expect(result.content).toContain(
			"```\ncurl -X POST https://api.mercadopago.com/checkout/preferences\n```",
		);
		expect(result.content).toContain("| Campo | Descripción |");
		expect(result.content).toContain(
			"[Medios de pago](https://www.mercadopago.com/developers/es/docs/checkout-pro/payment-methods)",
		);
		expect(
			result.content.match(
				/\[Medios de pago\]\(https:\/\/www\.mercadopago\.com\/developers\/es\/docs\/checkout-pro\/payment-methods\)/g,
			),
		).toHaveLength(1);
	});

	it("removes layout, script, cookie, footer, tracking, and unofficial-link noise", () => {
		const result = extractDocumentation(fixture("docs-page.html"), {
			url: docsUrl,
		});

		expect(result.content).not.toContain(
			"Documentation API reference SDK library",
		);
		expect(result.content).not.toContain("Acepta cookies");
		expect(result.content).not.toContain("window.tracker");
		expect(result.content).not.toContain("Mercado Pago footer links");
		expect(result.content).not.toContain("https://example.com/unofficial");
	});

	it("handles reference-like article fixtures", () => {
		const result = extractDocumentation(fixture("reference-page.html"), {
			url: referenceUrl,
		});

		expect(result.title).toBe("Create refund");
		expect(result.headings).toContainEqual({ level: 2, text: "Endpoint" });
		expect(result.content).toContain("POST /v1/payments/{id}/refunds");
		expect(result.content).toContain("`amount`: refund amount.");
		expect(result.links).toEqual([referenceUrl]);
		expect(result.content).not.toContain("tracking noise");
	});

	it("fails with ExtractionFailed when no main documentation content exists", () => {
		expect(() =>
			extractDocumentation("<html><body><nav>Only nav</nav></body></html>", {
				url: docsUrl,
			}),
		).toThrow(MercadoPagoDocsError);
		expect(() =>
			extractDocumentation("<html><body><nav>Only nav</nav></body></html>", {
				url: docsUrl,
			}),
		).toThrow(/main documentation content/i);
	});
});
