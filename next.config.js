/** @type {import('next').NextConfig} */

const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
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
});

const nextConfig = {
  env: {
    NEXT_PUBLIC_FIREBASE_API_KEY: "AIzaSyD-NVeAE1XPsQxrQWvMo8XDfNDpvK4YT0o",
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: "aserradero-lhm-336e9.firebaseapp.com",
    NEXT_PUBLIC_FIREBASE_PROJECT_ID: "aserradero-lhm-336e9",
    NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: "aserradero-lhm-336e9.appspot.com",
    NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: "913382798289",
    NEXT_PUBLIC_FIREBASE_APP_ID: "1:913382798289:web:96e8e815e10398d5c41496",
    NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID: "G-RFR653K87N"
  },
};

module.exports = withPWA(nextConfig);
