/// <reference types="node" />

import { readFileSync } from "fs";
import { describe, expect, it } from "vitest";
import * as rootApi from "../../src/index.js";
import * as wrapperApi from "../../src/mercadopago-official-wrapper/index.js";

const packageJson = JSON.parse(readFileSync("package.json", "utf8"));
const readme = readFileSync("README.md", "utf8");

describe("wrapper-only package surface", () => {
	it("uses the official wrapper as the default package entrypoint", () => {
		expect(rootApi.runOfficialWrapper).toBe(wrapperApi.runOfficialWrapper);
		expect(rootApi.buildOfficialRemoteCommand).toBe(
			wrapperApi.buildOfficialRemoteCommand,
		);
	});

	it("starts the wrapper with the default start script", () => {
		expect(packageJson.scripts).toEqual({
			build: "tsc -p tsconfig.json",
			start: "node dist/server.js",
			test: "vitest run",
		});
	});

	it("does not document the removed curated docs MCP tools", () => {
		const removedSurface = [
			"mercado_pago_search_docs",
			"mercado_pago_read_doc",
			"createMercadoPagoDocsMcpServer",
			"mercadopago-docs",
		];
		for (const removed of removedSurface) {
			expect(readme).not.toContain(removed);
		}
	});
});
