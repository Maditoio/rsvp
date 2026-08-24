import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep Prisma out of the bundler so model delegates match `prisma generate`.
  serverExternalPackages: ["@prisma/client", "prisma"],
};

export default nextConfig;
