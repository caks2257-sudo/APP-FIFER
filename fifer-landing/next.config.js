const withPWA = require("@ducanh2912/next-pwa").default({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
  skipWaiting: true,
  cacheOnFrontEndNav: true,
  reloadOnOnline: true,
  fallbacks: {
    document: "/offline",
  },
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  trailingSlash: false,
  /** Permite importar `src/core/*` del monorepo desde `fifer-landing` (EventBus, CircuitBreaker, DataWeaver). */
  experimental: {
    externalDir: true,
  },
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

module.exports = withPWA(nextConfig);

