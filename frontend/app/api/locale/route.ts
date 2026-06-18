import { cookies } from "next/headers";
import { isLocale, LOCALE_COOKIE } from "@/lib/i18n/config";

// Set the display locale. Not HttpOnly — locale is presentational, not a
// security boundary — but set server-side so SSR reads it on the next render.
export async function POST(req: Request) {
  let locale: unknown;
  try {
    ({ locale } = await req.json());
  } catch {
    return Response.json({ error: "Invalid body" }, { status: 400 });
  }
  if (!isLocale(typeof locale === "string" ? locale : undefined)) {
    return Response.json({ error: "Unsupported locale" }, { status: 400 });
  }

  (await cookies()).set(LOCALE_COOKIE, locale as string, {
    sameSite: "lax",
    path: "/",
    maxAge: 365 * 24 * 60 * 60,
    secure: process.env.NODE_ENV === "production",
  });

  return Response.json({ locale });
}
