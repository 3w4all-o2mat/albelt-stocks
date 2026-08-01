/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  experimental: {
    serverComponentsExternalPackages: ["pg"],
  },
  webpack: (config) => {
    // Konva references the `canvas` (node-canvas) package for SSR, but it is
    // not needed in the browser bundle and is not installed. Treat it as empty.
    config.resolve.fallback = {
      ...config.resolve.fallback,
      canvas: false,
    };
    return config;
  },
};

module.exports = nextConfig;
