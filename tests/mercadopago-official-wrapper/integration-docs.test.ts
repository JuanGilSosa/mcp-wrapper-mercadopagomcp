import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import * as docsApi from "../../src/mercadopago-docs/index.js";
import * as rootApi from "../../src/index.js";
import * as wrapperApi from "../../src/mercadopago-official-wrapper/index.js";

describe("official wrapper preserves docs MCP", () => {
	it("keeps existing docs exports and default start script stable", () => {
		expect(docsApi.createMercadoPagoDocsMcpServer).toBeTypeOf("function");
		expect(rootApi.createMercadoPagoDocsMcpServer).toBe(
			docsApi.createMercadoPagoDocsMcpServer,
		);
		expect(wrapperApi.runOfficialWrapper).toBeTypeOf("function");

		const packageJson = JSON.parse(readFileSync("package.json", "utf8")) as {
			scripts: Record<string, string>;
		};
		expect(packageJson.scripts.start).toBe("node dist/server.js");
		expect(packageJson.scripts["start:official"]).toBe(
			"node dist/mercadopago-official-wrapper/server.js",
		);
	});

	it("documents Pi/OpenCode wrapper setup without real tokens", () => {
		const docs = readFileSync("docs/mercadopago-official-wrapper.md", "utf8");
		const readme = readFileSync("README.md", "utf8");

		expect(readme).toContain("docs/mercadopago-official-wrapper.md");
		expect(docs).toContain("Pi");
		expect(docs).toContain("OpenCode");
		expect(docs).toContain("dist/mercadopago-official-wrapper/server.js");
		expect(docs).toContain('"AUTH_HEADER": "Bearer <ACCESS_TOKEN>"');
		expect(docs).toContain("mercado-pago-docs");
		expect(docs).toContain("pnpm install --ignore-scripts");
		expect(docs).toContain("pnpm build");
		expect(docs).toContain("pnpm test");
		expect(docs).toContain("missing `npx`");
		expect(docs).toContain("missing or invalid `AUTH_HEADER`");
		expect(docs).toContain("startup latency");
		expect(docs).toContain("upstream official MCP errors");
		expect(docs).not.toMatch(/APP_USR-[A-Za-z0-9]/);
	});
});
