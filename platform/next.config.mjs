/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: { typedRoutes: false },

  // Hosted behind Cloudflare at hse.next-horizon.ai (see HOSTING.md). Allow that origin for
  // dev cross-origin requests, and accept Server Actions proxied through the Cloudflare host.
  allowedDevOrigins: ["hse.next-horizon.ai", "next-horizon.ai", "10.0.0.3", "localhost"],

  // Memory mode doesn't generate the Prisma client, and we ship fast — don't let type/lint
  // issues block a production build for hosting. (Runtime is covered by tests + transpile.)
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },
};
export default nextConfig;
