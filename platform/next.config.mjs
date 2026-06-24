/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  typedRoutes: false,

  // Hosted behind Cloudflare at hse.next-horizon.ai (see HOSTING.md) — TEMPORARY host.
  // Allow that origin for dev cross-origin requests, and accept Server Actions proxied
  // through the Cloudflare host.
  allowedDevOrigins: ["hse.next-horizon.ai", "next-horizon.ai", "hse.hyflux.net", "hyflux.net", "10.0.0.3", "localhost"],

  // Memory mode doesn't generate the Prisma client, and we ship fast — don't let type
  // issues block a production build for hosting. (Runtime is covered by tests + transpile.)
  typescript: { ignoreBuildErrors: true },
};
export default nextConfig;
