import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Vinext checks multipart requests against this limit before API routing.
  // Allow a 10 MiB image plus multipart form overhead.
  experimental: { serverActions: { bodySizeLimit: '12mb' } },
};

export default nextConfig;
