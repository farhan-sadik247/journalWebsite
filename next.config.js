/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    domains: ['res.cloudinary.com', 'lh3.googleusercontent.com', 'gjadt.vercel.app'],
  },
  // Handle dynamic routes properly for App Router
  experimental: {
    // Skip build-time static generation for pages with dynamic content
    missingSuspenseWithCSRBailout: false,
  },
  // Optimize CSS loading
  optimizeFonts: true,
  // Ensure proper environment variable exposure
  env: {
    MONGODB_URI: process.env.MONGODB_URI,
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
    NEXTAUTH_URL: process.env.NEXTAUTH_URL,
    DOMAIN_BASE_URL: process.env.DOMAIN_BASE_URL,
    UPLOADS_DIR: process.env.UPLOADS_DIR,
  },
}

module.exports = nextConfig
