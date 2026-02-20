import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // OGP画像は外部ドメインから取得するため最適化を無効化
    unoptimized: true,
  },
};

export default nextConfig;
