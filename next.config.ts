import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Remote images configuration (replacement for deprecated images.domains)
    remotePatterns: [
      {
        protocol: "http",
        hostname: "127.0.0.1",
        port: "5000",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "daffa-e0870d98592a.herokuapp.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "img.youtube.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "i.ytimg.com",
        pathname: "/**",
      },
    ],
    // Allow using specific quality values in <Image quality={...} />
    // to avoid Next.js 16 warning about images.qualities
    qualities: [75, 85, 90],
  },
  eslint: {
    // Ignore ESLint errors/warnings during builds to bypass legacy issues in the codebase
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;