"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { locales, localeNames, type Locale } from "@/lib/i18n/config";

// Compact language picker. Posts the choice to /api/locale (sets the cookie),
// then refreshes so the server re-renders chrome in the chosen language.
export function LanguageSwitcher({ current }: { current: Locale }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const change = (locale: Locale) => {
    if (locale === current) return;
    startTransition(async () => {
      await fetch("/api/locale", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locale }),
      });
      router.refresh();
    });
  };

  return (
    <select
      value={current}
      onChange={(e) => change(e.target.value as Locale)}
      disabled={pending}
      aria-label="Language"
      style={{
        fontFamily: "var(--font-ui), sans-serif",
        fontSize: 13,
        fontWeight: 500,
        color: "#FDFAF5",
        background: "transparent",
        border: "1px solid rgba(255,255,255,0.22)",
        borderRadius: 999,
        padding: "5px 10px",
        cursor: pending ? "default" : "pointer",
        opacity: pending ? 0.6 : 1,
      }}
    >
      {locales.map((l) => (
        // option list renders in the browser's native menu (dark on white)
        <option key={l} value={l} style={{ color: "var(--ink)" }}>
          {localeNames[l]}
        </option>
      ))}
    </select>
  );
}
