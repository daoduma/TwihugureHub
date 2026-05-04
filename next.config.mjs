// next.config.mjs
import withPWAInit from "next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === "development",

  // Serve /offline when a navigation fetch fails completely
  fallbacks: {
    document: "/offline",
  },

  runtimeCaching: [
    // ── Fonts ────────────────────────────────────────────────────────────────
    {
      urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/i,
      handler: "CacheFirst",
      options: {
        cacheName: "google-fonts",
        expiration: { maxEntries: 10, maxAgeSeconds: 365 * 24 * 60 * 60 },
      },
    },

    // ── Static assets (Next.js build output) ─────────────────────────────────
    {
      urlPattern: /^\/_next\/static\/.*/i,
      handler: "CacheFirst",
      options: {
        cacheName: "next-static",
        expiration: { maxEntries: 300, maxAgeSeconds: 30 * 24 * 60 * 60 },
      },
    },

    // ── Next.js image optimisation ────────────────────────────────────────────
    {
      urlPattern: /^\/_next\/image\?.*/i,
      handler: "StaleWhileRevalidate",
      options: {
        cacheName: "next-images",
        expiration: { maxEntries: 100, maxAgeSeconds: 7 * 24 * 60 * 60 },
      },
    },

    // ── App icons & manifest ──────────────────────────────────────────────────
    {
      urlPattern: /^\/(icons|manifest\.json|favicon\.svg).*/i,
      handler: "CacheFirst",
      options: {
        cacheName: "pwa-shell",
        expiration: { maxEntries: 20, maxAgeSeconds: 30 * 24 * 60 * 60 },
      },
    },

    // ── Locale JSON files (i18n) ──────────────────────────────────────────────
    {
      urlPattern: /^\/locales\/.*/i,
      handler: "StaleWhileRevalidate",
      options: {
        cacheName: "locales-cache",
        expiration: { maxEntries: 20, maxAgeSeconds: 7 * 24 * 60 * 60 },
      },
    },

    // ── Media: images, audio ──────────────────────────────────────────────────
    {
      urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp|ico|mp3|ogg|wav)$/i,
      handler: "CacheFirst",
      options: {
        cacheName: "media-cache",
        expiration: { maxEntries: 200, maxAgeSeconds: 30 * 24 * 60 * 60 },
      },
    },

    // ── Lesson API — NetworkFirst so offline falls through to cache ───────────
    // We give a generous cache life so farmers can re-read lesson *metadata*
    // (title, quiz link, etc.) offline. The body HTML is stored in IndexedDB.
    {
      urlPattern: /^\/api\/farmer\/lessons\/.*/i,
      handler: "NetworkFirst",
      options: {
        cacheName: "lesson-api",
        networkTimeoutSeconds: 8,
        expiration: { maxEntries: 100, maxAgeSeconds: 7 * 24 * 60 * 60 },
        cacheableResponse: { statuses: [0, 200] },
      },
    },

    // ── Course API ────────────────────────────────────────────────────────────
    {
      urlPattern: /^\/api\/farmer\/courses\/.*/i,
      handler: "NetworkFirst",
      options: {
        cacheName: "course-api",
        networkTimeoutSeconds: 8,
        expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 },
        cacheableResponse: { statuses: [0, 200] },
      },
    },

    // ── Lesson viewer pages ───────────────────────────────────────────────────
    {
      urlPattern: /^\/farmer\/courses\/.*\/lessons\/.*/i,
      handler: "StaleWhileRevalidate",
      options: {
        cacheName: "lesson-pages",
        expiration: { maxEntries: 50, maxAgeSeconds: 7 * 24 * 60 * 60 },
      },
    },

    // ── All other API routes — NetworkFirst, short cache ─────────────────────
    {
      urlPattern: /^\/api\/.*/i,
      handler: "NetworkFirst",
      options: {
        cacheName: "api-cache",
        networkTimeoutSeconds: 10,
        expiration: { maxEntries: 50, maxAgeSeconds: 60 },
        cacheableResponse: { statuses: [0, 200] },
      },
    },
  ],
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ["bcryptjs", "@react-pdf/renderer"],
  images: {
    dangerouslyAllowSVG: true,
    remotePatterns: [
      { protocol: "https", hostname: "**" },
      { protocol: "http",  hostname: "**" },
    ],
  },
};

export default withPWA(nextConfig);
