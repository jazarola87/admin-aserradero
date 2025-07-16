/** @type {import('next').NextConfig} */

const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
  dynamicStartUrl: false, // Recommended to be false for App Router
  // No need to specify manifest here if you have a public/manifest.json
  // but if you want to generate it, you can do so. Let's remove the static one and generate.
  fallbacks: {
    document: '/_offline', // fallback for document pages
  },
  workboxOptions: {
    runtimeCaching: [
      {
        urlPattern: /^https?.*/,
        handler: 'NetworkFirst',
        options: {
          cacheName: 'offlineCache',
          expiration: {
            maxEntries: 200,
          },
        },
      },
    ],
  },
});

const nextConfig = {
  // Tu configuración de Next.js existente va aquí
};

module.exports = withPWA(nextConfig);