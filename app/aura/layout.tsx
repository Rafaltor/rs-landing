import type { Metadata, Viewport } from "next";
import { Anton, Archivo } from "next/font/google";
import "./aura.css";

const anton = Anton({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-display",
});

const archivo = Archivo({
  weight: ["400", "600", "800"],
  subsets: ["latin"],
  variable: "--font-body",
});

export const metadata: Metadata = {
  title: "Aura Dance · LowTaper67",
  description: "Just Dance version aura. Reproduis les mouvements du roi du mog. Rien n'est enregistré.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function AuraLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`aura-root ${anton.variable} ${archivo.variable}`}>
      {children}
    </div>
  );
}
