import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
	MERCADO_PAGO_READ_DOC_TOOL,
	MERCADO_PAGO_SEARCH_DOCS_TOOL,
	createMercadoPagoDocsMcpServer,
} from "../../src/mercadopago-docs/index.js";

describe("createMercadoPagoDocsMcpServer", () => {
	it("builds an SDK server with Mercado Pago docs tools without connecting stdio", () => {
		const server = createMercadoPagoDocsMcpServer({
			fetch: async () => {
				throw new Error("test fetch should not run during registration");
			},
			name: "test-mercado-pago-docs",
			version: "0.0.0-test",
		});

		const registeredTools = Object.keys(
			(server as unknown as { _registeredTools: Record<string, unknown> })
				._registeredTools,
		).sort();

		expect(registeredTools).toEqual([
			MERCADO_PAGO_READ_DOC_TOOL,
			MERCADO_PAGO_SEARCH_DOCS_TOOL,
		]);
	});
});

describe("stdio package entrypoint", () => {
	it("builds the documented standalone server path", () => {
		const packageJson = JSON.parse(readFileSync("package.json", "utf8")) as {
			scripts: { start: string };
		};
		expect(packageJson.scripts.start).toBe("node dist/server.js");
		const serverSource = readFileSync("src/server.ts", "utf8");

		expect(serverSource).toContain("StdioServerTransport");
		expect(serverSource).toContain("createMercadoPagoDocsMcpServer");
		expect(serverSource).toContain("globalThis.fetch");
	});
});
