import { gzip } from "node:zlib";
import { promisify } from "node:util";

const compress = promisify(gzip);
const PUBLIC_GET = /^\/(?:products|blog|recipes|gifts)(?:\/[a-z0-9-]+)?$|^\/categories$/;

export function acceptsGzip(header: string | null): boolean {
  if (!header) return false;
  const entries = header.toLowerCase().split(",").map(item => {
    const [coding, ...parameters] = item.trim().split(";");
    const q = parameters.find(parameter => /^\s*q\s*=/.test(parameter));
    const quality = q === undefined ? 1 : Number(q.split("=")[1].trim());
    return { coding: coding.trim(), quality: Number.isFinite(quality) && quality >= 0 && quality <= 1 ? quality : 0 };
  });
  const explicit = entries.filter(entry => entry.coding === "gzip");
  const matches = explicit.length ? explicit : entries.filter(entry => entry.coding === "*");
  return matches.length > 0 && matches.every(entry => entry.quality > 0);
}

export async function compressPublicResponse(
  body: ArrayBuffer,
  headers: Headers,
  request: { method: string; path: string; acceptEncoding: string | null; cacheControl?: string | null },
  status: number,
  hasSetCookie: boolean,
): Promise<ArrayBuffer> {
  const noTransform = /(?:^|,)\s*no-transform\s*(?:,|$)/i;
  if (request.method !== "GET" || !PUBLIC_GET.test(request.path) || (status !== 200 && status !== 304)
    || hasSetCookie || headers.has("set-cookie") || headers.has("content-encoding")
    || noTransform.test(headers.get("cache-control") ?? "") || noTransform.test(request.cacheControl ?? "")) return body;
  const type = headers.get("content-type")?.split(";")[0].trim().toLowerCase();
  if (status === 200 && (body.byteLength < 1024 || !type
    || !(type === "application/json" || /^application\/[a-z0-9.+-]+\+json$/.test(type)))) return body;

  const vary = (headers.get("vary") ?? "").split(",").map(value => value.trim()).filter(Boolean);
  if (!vary.some(value => value === "*" || value.toLowerCase() === "accept-encoding")) {
    vary.push("Accept-Encoding"); headers.set("vary", vary.join(", "));
  }
  // A 304 updates the cached representation's metadata. Keep the same Vary
  // and weak validator even though 304 commonly omits Content-Type and body.
  if (status === 304) {
    weakenEtag(headers);
    return body;
  }
  if (!acceptsGzip(request.acceptEncoding)) return body;
  const compressed = await compress(new Uint8Array(body));
  headers.set("content-encoding", "gzip");
  headers.delete("content-length");
  // Compression changes representation bytes; preserve conditional comparison
  // semantics by weakening any upstream strong validator.
  weakenEtag(headers);
  return new Uint8Array(compressed).buffer;
}

function weakenEtag(headers: Headers): void {
  const etag = headers.get("etag");
  if (etag && !etag.startsWith("W/")) headers.set("etag", `W/${etag}`);
}
