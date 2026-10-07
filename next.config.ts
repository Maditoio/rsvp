import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep Prisma out of the bundler so model delegates match `prisma generate`.
  serverExternalPackages: ["@prisma/client", "prisma"],
  // Invite-hero sharp SVG text needs Inter TTFs on the serverless filesystem.
  outputFileTracingIncludes: {
    "/**/*": ["./assets/fonts/invite-hero/**/*"],
  },
  // Event logo / badge background uploads allow ≤2 MB files; multipart overhead
  // needs headroom above that. Client still compresses large rasters.
  experimental: {
    serverActions: {
      bodySizeLimit: "2.5mb",
    },
  },
};

export default nextConfig;
