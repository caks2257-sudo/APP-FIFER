/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config) => {
    // Google Drive / algunos FS no soportan bien el caché empaquetado de webpack.
    config.cache = false;
    return config;
  },
};

export default nextConfig;
