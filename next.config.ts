import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // Trailing slashes are the client site's business; normalizing them here would
  // fight the proxy's "/slug" -> "/slug/" redirect for root-static demos.
  skipTrailingSlashRedirect: true,
  async headers() {
    return [
      {
        source: "/",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Robots-Tag", value: "noindex, nofollow" },
        ],
      },
    ];
  },
};

export default nextConfig;
