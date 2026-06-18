// Supported locales. Per the port plan: English (international + default),
// Sinhala and Tamil (local market). Locale is carried in a non-HttpOnly
// `locale` cookie — it's presentational, not a security boundary.
export const locales = ["en", "si", "ta"] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "en";

// Endonyms — each language's own name, shown in the switcher.
export const localeNames: Record<Locale, string> = {
  en: "English",
  si: "සිංහල",
  ta: "தமிழ்",
};

export const LOCALE_COOKIE = "locale";

export function isLocale(value: string | undefined | null): value is Locale {
  return value != null && (locales as readonly string[]).includes(value);
}
