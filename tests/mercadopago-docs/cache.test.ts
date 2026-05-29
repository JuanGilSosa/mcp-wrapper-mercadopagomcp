import { describe, expect, it } from "vitest";
import {
	createMemoryCache,
	normalizeCacheKey,
} from "../../src/mercadopago-docs/cache";

describe("createMemoryCache", () => {
	it("returns deterministic miss and hit metadata", () => {
		let now = 1_000;
		const cache = createMemoryCache<string>({
			ttlMs: 500,
			maxEntries: 2,
			now: () => now,
		});

		expect(
			cache.get("https://WWW.MERCADOPAGO.COM:443/developers/es/docs/a#frag"),
		).toEqual({ cache: "miss" });

		cache.set(
			"https://WWW.MERCADOPAGO.COM:443/developers/es/docs/a#frag",
			"body",
			{
				etag: "abc",
				lastModified: "Mon, 01 Jan 2024 00:00:00 GMT",
			},
		);

		expect(
			cache.get("https://www.mercadopago.com/developers/es/docs/a"),
		).toEqual({
			cache: "hit",
			value: "body",
			metadata: {
				etag: "abc",
				lastModified: "Mon, 01 Jan 2024 00:00:00 GMT",
				storedAt: 1_000,
			},
		});

		now = 1_501;
		expect(
			cache.get("https://www.mercadopago.com/developers/es/docs/a"),
		).toEqual({ cache: "miss" });
	});

	it("bounds entries by evicting the oldest normalized key", () => {
		let now = 10;
		const cache = createMemoryCache<string>({
			ttlMs: 10_000,
			maxEntries: 2,
			now: () => now,
		});

		cache.set("https://www.mercadopago.com/developers/es/docs/a", "a");
		now = 20;
		cache.set("https://www.mercadopago.com/developers/es/docs/b", "b");
		now = 30;
		cache.set("https://www.mercadopago.com/developers/es/docs/c", "c");

		expect(
			cache.get("https://www.mercadopago.com/developers/es/docs/a"),
		).toEqual({ cache: "miss" });
		expect(
			cache.get("https://www.mercadopago.com/developers/es/docs/b").cache,
		).toBe("hit");
		expect(
			cache.get("https://www.mercadopago.com/developers/es/docs/c").cache,
		).toBe("hit");
	});
});

describe("normalizeCacheKey", () => {
	it("normalizes official URLs and strips fragments", () => {
		expect(
			normalizeCacheKey(
				"https://WWW.MERCADOPAGO.COM:443/developers/es/docs/a?x=1#intro",
			),
		).toBe("https://www.mercadopago.com/developers/es/docs/a?x=1");
	});
});
