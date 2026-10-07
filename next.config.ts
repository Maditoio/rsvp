import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep Prisma / native image tools out of the bundler so runtime matches Node.
  serverExternalPackages: ["@prisma/client", "prisma", "opentype.js", "sharp"],
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
