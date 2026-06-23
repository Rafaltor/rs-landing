import type { NextConfig } from "next";

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
    return [
      // Domaine canonique = apex (recrutestagiaire.eu). On force www → apex pour
      // garder une seule origine : évite les textures WebGL "CORS-tainted" et le
      // mélange de cookies/domaines (cause de texImage2D "no image").
      {
        source: "/:path*",
        has: [{ type: "host", value: "www.recrutestagiaire.eu" }],
        destination: "https://recrutestagiaire.eu/:path*",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
