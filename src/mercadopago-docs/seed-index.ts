import type { PathFamily, SupportedLocale } from "./official-sources.js";

export type SeedDocEntry = {
	doc_id: string;
	title: string;
	url: string;
	locale: SupportedLocale;
	country: "global";
	source_kind: PathFamily;
	snippet: string;
	headings?: readonly string[];
	keywords?: readonly string[];
};

export const SEED_INDEX: readonly SeedDocEntry[] = [
	{
		doc_id: "checkout-pro-overview-es",
		title: "Visión general de Checkout Pro",
		url: "https://www.mercadopago.com/developers/es/docs/checkout-pro/landing",
		locale: "es",
		country: "global",
		source_kind: "docs",
		snippet:
			"Checkout Pro permite crear preferencias y cobrar con Mercado Pago.",
		headings: ["Visión general", "Crear preferencia"],
		keywords: ["checkout", "checkout pro", "preferencia", "pagos", "cobrar"],
	},
	{
		doc_id: "checkout-pro-overview",
		title: "Checkout Pro overview",
		url: "https://www.mercadopago.com/developers/en/docs/checkout-pro/landing",
		locale: "en",
		country: "global",
		source_kind: "docs",
		snippet: "Checkout Pro helps sellers accept payments with Mercado Pago.",
		headings: ["Overview", "Create preference"],
		keywords: ["checkout", "checkout pro", "payments", "preference"],
	},
	{
		doc_id: "create-refund-reference",
		title: "Create refund",
		url: "https://www.mercadopago.com/developers/en/reference/online-payments/checkout-pro/create-refund/post",
		locale: "en",
		country: "global",
		source_kind: "reference",
		snippet: "API reference for creating a refund for an online payment.",
		headings: ["Create refund", "Endpoint"],
		keywords: ["refund", "api", "reference", "checkout"],
	},
] as const;
