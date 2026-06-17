/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Hero frames + product photography are served from a CDN/R2 in production.
  // Add the host here when NEXT_PUBLIC_ASSETS_URL points off-origin.
  images: {
    remotePatterns: [],
  },
};

export default nextConfig;
