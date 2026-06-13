"use client";

import { createContext, useContext, useEffect } from "react";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import type { Locale } from "@/lib/i18n/config";

interface I18nValue {
  dict: Dictionary;
  locale: Locale;
}

const I18nContext = createContext<I18nValue | null>(null);

// Seeds client components with the server-resolved dictionary + locale. Also
// syncs <html lang> on the client (the root layout stays statically "en" so
// SSG pages aren't forced dynamic; this corrects it for si/ta visitors).
export function I18nProvider({ dict, locale, children }: I18nValue & { children: React.ReactNode }) {
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  return <I18nContext.Provider value={{ dict, locale }}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
}

// Convenience: the dictionary for client components.
export function useT(): Dictionary {
  return useI18n().dict;
}
