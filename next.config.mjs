/** @type {import('next').NextConfig} */
const nextConfig = {
  // Docker deployment - creates .next/standalone folder
  output: 'standalone',

  // Experimental features
  experimental: {
    // Enable server actions
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },

  // Images configuration
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },

  // Webpack configuration (for webpack builds)
  webpack: (config) => {
    config.externals.push({
      'utf-8-validate': 'commonjs utf-8-validate',
      bufferutil: 'commonjs bufferutil',
    })
    return config
  },

  // Turbopack configuration (for turbopack builds)
  turbopack: {
    // Empty config to acknowledge Turbopack usage
    // The webpack externals above are handled automatically by Turbopack
  },

  // Environment variables available on client
  env: {
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  },

  // Disable x-powered-by header
  poweredByHeader: false,

  // Strict mode
  reactStrictMode: true,
}

export default nextConfig
