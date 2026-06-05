import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";

export const metadata: Metadata = {
  title: "Recrute Stagiaire — Landing 360",
  description: "Landing immersive 360° Recrute Stagiaire",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
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
