/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: { typedRoutes: false },

  // Hosted behind Cloudflare at hse.next-horizon.ai (see HOSTING.md). Allow that origin for
  // dev cross-origin requests, and accept Server Actions proxied through the Cloudflare host.
  allowedDevOrigins: ["hse.next-horizon.ai", "next-horizon.ai"],
};
export default nextConfig;
