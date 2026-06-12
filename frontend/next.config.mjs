import { fileURLToPath } from "node:url";
import path from "node:path";

/** @type {import('next').NextConfig} */

// Image hosts are allow-listed for next/image. Hero frames + product images
// are served from Cloudflare R2 (custom domain, set via NEXT_PUBLIC_ASSETS_HOST)
// and legacy/admin uploads may still come from Cloudinary.
const assetsHost = process.env.NEXT_PUBLIC_ASSETS_HOST; // e.g. "cdn.aranyaceylon.com"

const remotePatterns = [
  { protocol: "https", hostname: "res.cloudinary.com" },
];
if (assetsHost) {
  remotePatterns.push({ protocol: "https", hostname: assetsHost });
}

const nextConfig = {
  reactStrictMode: true,
  images: { remotePatterns },
  // Monorepo: point tracing at the repo root so Next picks the right lockfile
  // and traces standalone output correctly (silences the multi-lockfile warning).
  outputFileTracingRoot: path.join(path.dirname(fileURLToPath(import.meta.url)), ".."),
};

export default nextConfig;
