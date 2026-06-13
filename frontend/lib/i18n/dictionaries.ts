import type { Locale } from "./config";
import en from "./dictionaries/en.json";
import si from "./dictionaries/si.json";
import ta from "./dictionaries/ta.json";

// English is the canonical shape; si/ta are partial scaffolds that fall back.
export type Dictionary = typeof en;

const RAW: Record<Locale, unknown> = { en, si, ta };

// Deep-merge `override` onto `base`. Empty strings, null and undefined in the
// override are treated as "not translated yet" and fall back to the base —
// so a scaffold dictionary full of "" renders entirely in English until filled.
function deepMerge<T>(base: T, override: unknown): T {
  if (override == null || typeof override !== "object" || Array.isArray(override)) return base;
  const out: Record<string, unknown> = { ...(base as Record<string, unknown>) };
  for (const [key, oVal] of Object.entries(override as Record<string, unknown>)) {
    const bVal = (base as Record<string, unknown>)[key];
    if (typeof oVal === "string") {
      if (oVal !== "") out[key] = oVal; // non-empty override wins; "" → keep base
    } else if (oVal && typeof oVal === "object" && bVal && typeof bVal === "object") {
      out[key] = deepMerge(bVal, oVal);
    }
    // keys not present in the English base (e.g. "_status") are ignored
  }
  return out as T;
}

// Locale dictionary with English fallback for any untranslated key.
export function getDictionary(locale: Locale): Dictionary {
  return deepMerge(en, RAW[locale]);
}
