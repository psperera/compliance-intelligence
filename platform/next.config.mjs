/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Vitest/Playwright live alongside the app; exclude test dirs from the build trace.
  experimental: { typedRoutes: false },
};
export default nextConfig;
