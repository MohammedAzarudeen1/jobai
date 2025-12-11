/** @type {import('next').NextConfig} */
const nextConfig = {
  // Packages that should use the server runtime
  serverExternalPackages: ['tesseract.js', 'pdf2json'],

  // Body size limit for API routes and Server Actions
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
}

module.exports = nextConfig

