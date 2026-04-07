/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  trailingSlash: false,
  webpack: (config, { dev }) => {
    if (dev) {
      // Windows/PowerShell stability: file polling helps avoid stale chunks/hydration glitches.
      config.watchOptions = {
        ...(config.watchOptions || {}),
        poll: 1000,
        aggregateTimeout: 300,
        ignored: ["**/node_modules/**", "**/.git/**"],
      };
    }
    return config;
  },
};

module.exports = nextConfig;

