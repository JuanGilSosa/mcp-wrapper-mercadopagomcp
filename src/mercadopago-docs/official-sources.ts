export const SUPPORTED_LOCALES = ['es', 'en', 'pt'] as const;
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

export const PATH_FAMILIES = ['docs', 'reference'] as const;
export type PathFamily = (typeof PATH_FAMILIES)[number];

export type OfficialDocsSource = {
  host: string;
  country?: 'global';
  locales: readonly SupportedLocale[];
  pathFamilies: readonly PathFamily[];
  evidence: readonly string[];
};

// Preliminary verification from parent web search, 2026-05-26.
// Keep this conservative: do not add country-specific hosts until explicitly verified.
export const OFFICIAL_DOCS_SOURCES: readonly OfficialDocsSource[] = [
  {
    host: 'mercadopago.com',
    locales: SUPPORTED_LOCALES,
    pathFamilies: PATH_FAMILIES,
    evidence: [
      'https://mercadopago.com/developers/pt/docs',
      'https://mercadopago.com/developers/en/reference/online-payments/checkout-pro/create-refund/post',
    ],
  },
  {
    host: 'www.mercadopago.com',
    locales: SUPPORTED_LOCALES,
    pathFamilies: PATH_FAMILIES,
    evidence: [
      'https://www.mercadopago.com/developers/en/docs/',
      'https://www.mercadopago.com/developers/es/reference/',
      'https://www.mercadopago.com/developers/en/reference/online-payments/checkout-api-payments/addresses/create-address/post',
    ],
  },
] as const;
