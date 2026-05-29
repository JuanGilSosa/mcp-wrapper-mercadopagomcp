import { runOfficialWrapper } from "./runner.js";
import { OfficialWrapperError } from "./errors.js";

try {
	const result = await runOfficialWrapper({ env: process.env });
	process.exitCode = result.exitCode;
} catch (error) {
	if (error instanceof OfficialWrapperError) {
		console.error(
			error.safeDetails
				? `${error.message} ${error.safeDetails}`
				: error.message,
		);
	} else {
		console.error("Mercado Pago official MCP bridge failed.");
	}
	process.exitCode = 1;
}
