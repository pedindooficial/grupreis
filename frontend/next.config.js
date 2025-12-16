/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    typedRoutes: true
  },
  images: {
    unoptimized: true
  }
};

module.exports = nextConfig;

