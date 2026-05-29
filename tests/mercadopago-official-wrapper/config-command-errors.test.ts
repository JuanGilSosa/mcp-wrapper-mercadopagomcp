import { describe, expect, it } from "vitest";
import {
	OFFICIAL_MERCADO_PAGO_MCP_URL,
	buildOfficialClientEvidence,
	buildOfficialRemoteCommand,
	parseOfficialWrapperConfig,
} from "../../src/mercadopago-official-wrapper/index.js";
import {
	OfficialWrapperError,
	redactOfficialWrapperSecrets,
	toOfficialWrapperError,
} from "../../src/mercadopago-official-wrapper/errors.js";

const token = "Bearer APP_USR-test-secret";

describe("official wrapper config and command", () => {
	it("keeps the documented mcp-remote evidence shape with env placeholder", () => {
		expect(buildOfficialClientEvidence()).toEqual({
			command: "npx",
			args: [
				"-y",
				"mcp-remote",
				OFFICIAL_MERCADO_PAGO_MCP_URL,
				"--header",
				"Authorization:${AUTH_HEADER}",
			],
			env: { AUTH_HEADER: "Bearer <ACCESS_TOKEN>" },
		});
	});

	it("builds effective spawn args with the parsed bearer token", () => {
		const config = parseOfficialWrapperConfig({
			env: { AUTH_HEADER: `  ${token}  `, KEEP_ME: "yes" },
		});
		const command = buildOfficialRemoteCommand(config);

		expect(config.authHeader).toBe(token);
		expect(command.command).toBe("npx");
		expect(command.args).toEqual([
			"-y",
			"mcp-remote",
			OFFICIAL_MERCADO_PAGO_MCP_URL,
			"--header",
			`Authorization:${token}`,
		]);
		expect(command.env).toMatchObject({ AUTH_HEADER: token, KEEP_ME: "yes" });
		expect(command.redacted.args.join(" ")).not.toContain(
			"APP_USR-test-secret",
		);
		expect(command.redacted.args).toContain("Authorization:Bearer <redacted>");
	});

	it.each([
		[{}, "MissingAuth"],
		[{ AUTH_HEADER: "   " }, "MissingAuth"],
		[{ AUTH_HEADER: "APP_USR-no-bearer" }, "InvalidAuth"],
	])("rejects invalid AUTH_HEADER %#", (env, code) => {
		expect(() => parseOfficialWrapperConfig({ env })).toThrow(
			OfficialWrapperError,
		);
		expect(() => parseOfficialWrapperConfig({ env })).toThrow(
			expect.objectContaining({ code }),
		);
	});
});

describe("official wrapper errors and redaction", () => {
	it("redacts auth values in strings and mapped errors", () => {
		const text = `failed with ${token} and Authorization:${token}`;
		expect(redactOfficialWrapperSecrets(text, token)).toBe(
			"failed with Bearer <redacted> and Authorization:Bearer <redacted>",
		);

		const error = toOfficialWrapperError("SpawnFailed", new Error(text), token);
		expect(error).toMatchObject({ code: "SpawnFailed" });
		expect(error.message).toBe(
			"Failed to start Mercado Pago official MCP bridge.",
		);
		expect(error.safeDetails).not.toContain("APP_USR-test-secret");
	});
});
