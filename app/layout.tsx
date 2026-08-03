import type { Metadata } from "next";
import { Manrope, Syne } from "next/font/google";
import Script from "next/script";
import { FaviconLinks } from "@/components/FaviconLinks";
import { getCanonicalSiteUrl, getSiteName } from "@/lib/siteConfig";
import "./globals.css";

const siteName = getSiteName();
const siteUrl = getCanonicalSiteUrl();

const syne = Syne({
  subsets: ["latin"],
  variable: "--font-syne",
  weight: ["600", "700", "800"],
});

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  metadataBase: siteUrl ?? undefined,
  title: siteName,
  description: `Landing immersive 360° — ${siteName}`,
  icons: {
    icon: "/favicon.ico",
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className={`${syne.variable} ${manrope.variable}`}>
      <head>
        <FaviconLinks />
      </head>
      <body style={{ background: "#0A0A0A" }}>
        <Script
          src="https://cdn.jsdelivr.net/npm/pannellum@2.5.6/build/pannellum.js"
          strategy="lazyOnload"
        />
        {children}
      </body>
    </html>
  );
}
