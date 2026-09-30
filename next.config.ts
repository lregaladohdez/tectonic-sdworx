import type { NextConfig } from "next";

// The Content-Security-Policy is set per request in src/proxy.ts (it carries a
// script nonce). The static headers below apply to every response, assets included.
const securityHeaders = [
  // HSTS only in production: local dev runs over plain http.
  ...(process.env.NODE_ENV === "production"
    ? [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" }]
    : []),
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig: NextConfig = {
  // No "X-Powered-By: Next.js" fingerprint.
  poweredByHeader: false,
  // Remotion's renderer/bundler and the Tailwind webpack plugin run native code at
  // request time (only used by /api/render); keep them out of the server bundle.
  serverExternalPackages: [
    "@remotion/bundler",
    "@remotion/renderer",
    "@remotion/tailwind-v4",
    "@tailwindcss/webpack",
    "lightningcss",
  ],
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
};

export default nextConfig;
