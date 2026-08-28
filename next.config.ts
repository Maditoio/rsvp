import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep Prisma out of the bundler so model delegates match `prisma generate`.
  serverExternalPackages: ["@prisma/client", "prisma"],
  // Event logo / badge background uploads allow ≤2 MB files; multipart overhead
  // needs headroom above that. Client still compresses large rasters.
  experimental: {
    serverActions: {
      bodySizeLimit: "2.5mb",
    },
  },
};

export default nextConfig;
