import { makeError } from "./http";
import { RequestFailure, requestTimeoutMs, withRequestDeadline } from "./request-deadline";

export interface PublicRequestOptions {
  revalidate?: number | false;
  timeoutMs?: number;
  signal?: AbortSignal | null;
}

// Explicit allowlist: private or admin routes cannot opt into shared caching.
export function publicResource(path: string): { path: string; tags: string[]; ttl: number } {
  if (!path.startsWith("/") || path.startsWith("//") || path.includes("#")) throw new Error("Invalid public API path.");
  const url = new URL(path, "http://public.invalid");
  if (url.pathname === "/search") {
    url.searchParams.sort();
    return { path: `${url.pathname}${url.search}`, tags: ["products", "blog"], ttl: 300 };
  }
  const match = /^\/(products|categories|blog|recipes|gifts)(?:\/([^/]+))?$/.exec(url.pathname);
  if (!match || (match[1] === "categories" && match[2])) throw new Error("This API route is not a public cache resource.");
  const [, resource, identity] = match;
  const tags = [resource];
  const detail = identity && !(resource === "products" && ["featured", "bestsellers", "search"].includes(identity));
  if (detail) tags.push(`${({ products: "product", blog: "blog", recipes: "recipe", gifts: "gift" } as Record<string, string>)[resource]}:${decodeURIComponent(identity)}`);
  if (["categories", "recipes", "gifts"].includes(resource)) tags.push("products");
  url.searchParams.sort();
  return { path: `${url.pathname}${url.search}`, tags, ttl: resource === "categories" ? 600 : ["recipes", "gifts"].includes(resource) ? 3600 : 300 };
}

export async function publicApiFetch<T>(path: string, options: PublicRequestOptions = {}): Promise<T> {
  const resource = publicResource(path);
  // Next replaces typeof window per compilation target, keeping server secrets
  // and node:crypto out of browser modules. Client reads continue through BFF.
  if (typeof window === "undefined") {
    const { fetchPublicServer } = await import("./public-cache.server");
    return fetchPublicServer<T>(resource, options);
  }
  return withRequestDeadline(options.timeoutMs ?? requestTimeoutMs(resource.path), options.signal, async signal => {
    try {
      // Revalidate the visitor's own representation every time. The API/BFF
      // sends private,no-cache + Vary Cookie/Authorization for market isolation.
      const response = await fetch(`/api${resource.path}`, { credentials: "include", cache: "no-cache", signal });
      const text = await response.text();
      let data: unknown = null;
      if (text) { try { data = JSON.parse(text); } catch { data = text; } }
      if (!response.ok) throw makeError(response.status, data);
      return data as T;
    } catch (error) {
      if (signal.aborted) throw signal.reason;
      if (error instanceof TypeError) throw new RequestFailure("The service is unavailable. Please try again.", 502, "api_unreachable");
      throw error;
    }
  });
}
