import type { NextConfig } from "next";

const supabaseHost = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname
  : "*.supabase.co";

const legacyHosts = [
  "www.fourthcanal.com",
  "dental-courses-piggy-cybers-projects.vercel.app",
  "dental-courses-piggy-cyber-piggy-cybers-projects.vercel.app",
];

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1"],
  poweredByHeader: false,
  turbopack: {
    root: process.cwd(),
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), payment=(), browsing-topics=()",
          },
        ],
      },
    ];
  },
  async redirects() {
    return legacyHosts.map((host) => ({
        source: "/:path*",
        has: [{ type: "host", value: host }],
        destination: "https://fourthcanal.com/:path*",
        permanent: true,
      }));
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: supabaseHost,
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
};

export default nextConfig;
