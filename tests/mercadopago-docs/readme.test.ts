import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("README", () => {
	it("documents first-scope boundaries and safe pnpm commands", () => {
		const readme = readFileSync("README.md", "utf8");

		expect(readme).toContain("official Mercado Pago documentation only");
		expect(readme).toContain("No Q&A synthesis");
		expect(readme).toContain("mocked fetch");
		expect(readme).toContain("pnpm install --ignore-scripts");
		expect(readme).toContain(
			"pnpm add @modelcontextprotocol/sdk zod cheerio --ignore-scripts",
		);
		expect(readme).toContain(
			"pnpm add -D typescript vitest @types/node --ignore-scripts",
		);
		expect(readme).toContain("pnpm test");

		for (const command of readme.match(/pnpm (?:add|install)[^`\n]*/g) ?? []) {
			expect(command).toContain("--ignore-scripts");
		}
	});
});
