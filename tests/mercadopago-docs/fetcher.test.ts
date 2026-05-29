import { describe, expect, it, vi } from "vitest";
import { createMemoryCache } from "../../src/mercadopago-docs/cache";
import { MercadoPagoDocsError } from "../../src/mercadopago-docs/errors";
import {
	fetchOfficialDoc,
	type FetchLike,
} from "../../src/mercadopago-docs/fetcher";

const okUrl =
	"https://www.mercadopago.com/developers/es/docs/checkout-pro/landing";

function response(
	status: number,
	body = "<main>ok</main>",
	headers: Record<string, string> = {},
) {
	const normalizedHeaders = new Map(
		Object.entries(headers).map(([key, value]) => [key.toLowerCase(), value]),
	);
	return {
		status,
		ok: status >= 200 && status < 300,
		headers: {
			get: (name: string) => normalizedHeaders.get(name.toLowerCase()) ?? null,
		},
		text: async () => body,
	};
}

describe("fetchOfficialDoc", () => {
	it("fetches validated official HTML with safe metadata", async () => {
		const fetch = vi.fn(async () =>
			response(200, "<main>hello</main>", {
				"content-type": "text/html; charset=utf-8",
				etag: "abc",
				"last-modified": "Mon, 01 Jan 2024 00:00:00 GMT",
			}),
		) satisfies FetchLike;
		const cache = createMemoryCache<string>({
			ttlMs: 60_000,
			maxEntries: 5,
			now: () => 1_700_000_000_000,
		});

		await expect(
			fetchOfficialDoc(okUrl, {
				fetch,
				cache,
				now: () => new Date("2024-01-01T00:00:00Z"),
			}),
		).resolves.toEqual({
			body: "<main>hello</main>",
			url: okUrl,
			metadata: {
				cache: "miss",
				contentType: "text/html; charset=utf-8",
				etag: "abc",
				lastModified: "Mon, 01 Jan 2024 00:00:00 GMT",
				fetchedAt: "2024-01-01T00:00:00.000Z",
			},
		});
		expect(fetch).toHaveBeenCalledWith(okUrl, { redirect: "manual" });

		await expect(
			fetchOfficialDoc(okUrl, { fetch, cache }),
		).resolves.toMatchObject({
			body: "<main>hello</main>",
			metadata: { cache: "hit", etag: "abc" },
		});
		expect(fetch).toHaveBeenCalledTimes(1);
	});

	it("follows only allowlisted manual redirects including relative locations", async () => {
		const redirected =
			"https://www.mercadopago.com/developers/es/reference/checkout-pro/create-refund/post";
		const fetch = vi
			.fn()
			.mockResolvedValueOnce(
				response(302, "", {
					location: "/developers/es/reference/checkout-pro/create-refund/post",
				}),
			)
			.mockResolvedValueOnce(
				response(200, "<main>redirected</main>", {
					"content-type": "text/html",
				}),
			) satisfies FetchLike;

		await expect(fetchOfficialDoc(okUrl, { fetch })).resolves.toMatchObject({
			url: redirected,
			body: "<main>redirected</main>",
		});
		expect(fetch).toHaveBeenNthCalledWith(2, redirected, {
			redirect: "manual",
		});
	});

	it.each([
		["https://example.com/", "UrlNotAllowed"],
		["http://localhost/developers/es/docs/a", "InvalidUrl"],
	])("rejects unsafe initial URLs before fetch %#", async (url, code) => {
		const fetch = vi.fn() satisfies FetchLike;
		await expect(fetchOfficialDoc(url, { fetch })).rejects.toMatchObject({
			code,
		});
		expect(fetch).not.toHaveBeenCalled();
	});

	it("rejects redirect chains that leave the allowlist", async () => {
		const fetch = vi.fn(async () =>
			response(302, "", { location: "https://example.com/evil" }),
		) satisfies FetchLike;
		await expect(fetchOfficialDoc(okUrl, { fetch })).rejects.toMatchObject({
			code: "UrlNotAllowed",
		});
	});

	it("rejects redirect chains that exceed max redirects", async () => {
		const fetch = vi.fn(async () =>
			response(302, "", { location: okUrl }),
		) satisfies FetchLike;
		await expect(
			fetchOfficialDoc(okUrl, { fetch, maxRedirects: 1 }),
		).rejects.toMatchObject({ code: "UrlNotAllowed" });
		expect(fetch).toHaveBeenCalledTimes(2);
	});

	it.each([
		[404, "NotFound"],
		[429, "RateLimited"],
		[500, "FetchFailed"],
	])("maps HTTP %s to %s", async (status, code) => {
		const fetch = vi.fn(async () =>
			response(status, "nope"),
		) satisfies FetchLike;
		await expect(fetchOfficialDoc(okUrl, { fetch })).rejects.toMatchObject({
			code,
		});
	});

	it("maps network failures and unsupported content type", async () => {
		await expect(
			fetchOfficialDoc(okUrl, {
				fetch: vi.fn(async () => {
					throw new Error("boom");
				}) satisfies FetchLike,
			}),
		).rejects.toBeInstanceOf(MercadoPagoDocsError);
		await expect(
			fetchOfficialDoc(okUrl, {
				fetch: vi.fn(async () =>
					response(200, "{}", { "content-type": "application/json" }),
				) satisfies FetchLike,
			}),
		).rejects.toMatchObject({ code: "UnsupportedContentType" });
	});
});
