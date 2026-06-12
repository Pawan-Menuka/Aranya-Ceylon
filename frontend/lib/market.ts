import { cookies } from "next/headers";

export type Market = "LOCAL" | "INTERNATIONAL";

// Decode the `x-market` JWT payload WITHOUT verifying it — display only.
// The backend re-verifies the signature on every request, so this is purely
// to show which market is active (e.g. highlight the right switcher button).
// Defaults to INTERNATIONAL, mirroring the backend's resolveMarket fallback.
export async function getMarket(): Promise<Market> {
  const cookie = (await cookies()).get("x-market");
  if (!cookie) return "INTERNATIONAL";
  try {
    const payloadSeg = cookie.value.split(".")[1] ?? "";
    const b64 = payloadSeg.replace(/-/g, "+").replace(/_/g, "/");
    const json = Buffer.from(b64, "base64").toString("utf8");
    const payload = JSON.parse(json) as { market?: string };
    return payload.market === "local" ? "LOCAL" : "INTERNATIONAL";
  } catch {
    return "INTERNATIONAL";
  }
}

export const currencyForMarket = (m: Market): "LKR" | "USD" =>
  m === "LOCAL" ? "LKR" : "USD";
