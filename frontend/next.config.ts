import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  /* config options here */
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.amazonaws.com",
      },
    ],
  },

  async rewrites() {
    return [
      {
        source: "/institution/create-student",
        destination: `${process.env.NEXT_PUBLIC_API_URL}/student/create-student`,
      },
    ];
  },
 
};

export default nextConfig;
