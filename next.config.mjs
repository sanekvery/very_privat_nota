/** @type {import('next').NextConfig} */
const nextConfig = {
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

  // Webpack configuration
  webpack: (config) => {
    config.externals.push({
      'utf-8-validate': 'commonjs utf-8-validate',
      bufferutil: 'commonjs bufferutil',
    })
    return config
  },

  // Environment variables available on client
  env: {
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  },

  // Disable x-powered-by header
  poweredByHeader: false,

  // Strict mode
  reactStrictMode: true,

  // Internationalization
  i18n: {
    locales: ['ru', 'en'],
    defaultLocale: 'ru',
  },
}

export default nextConfig
