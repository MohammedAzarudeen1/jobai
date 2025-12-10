/** @type {import('next').NextConfig} */
const nextConfig = {
  // Server Actions are stable in Next.js 15
  // Body size limit for API routes and Server Actions
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
}

module.exports = nextConfig

