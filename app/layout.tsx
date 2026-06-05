import type { Metadata } from "next";
import Script from "next/script";
import { FaviconLinks } from "@/components/FaviconLinks";
import "./globals.css";

export const metadata: Metadata = {
  title: "Recrute Stagiaire",
  description: "Landing immersive 360° Recrute Stagiaire",
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
    <html lang="fr">
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
