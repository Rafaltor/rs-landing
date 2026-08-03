import type { NextConfig } from "next";
import { getApexHostname, getCanonicalSiteUrl } from "./lib/siteConfig";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "cdn.shopify.com",
        pathname: "/**",
      },
    ],
  },
  async redirects() {
    const site = getCanonicalSiteUrl();
    const apex = getApexHostname();
    if (!site || !apex || site.hostname === `www.${apex}`) {
      return [];
    }

    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: `www.${apex}` }],
        destination: `${site.origin}/:path*`,
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
