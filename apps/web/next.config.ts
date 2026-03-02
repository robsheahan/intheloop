import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@tmw/shared"],
  typescript: {
    // Pre-existing Shadcn/radix-ui type errors with React 19.1.0
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
