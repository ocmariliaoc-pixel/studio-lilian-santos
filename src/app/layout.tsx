import type { Metadata, Viewport } from "next";
import { Cinzel, Inter } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const sans = Inter({ variable: "--font-sans", subsets: ["latin"] });
// Fonte da marca (no estilo da logo): só no nome e no monograma
const brand = Cinzel({ variable: "--font-brand", subsets: ["latin"], weight: ["500", "600"] });

export const metadata: Metadata = {
  title: { default: "Lilian Santos Beauty Academy", template: "%s · Lilian Santos" },
  description: "Sistema administrativo — Lilian Santos Beauty Academy",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#f7f6f3",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body className={`${sans.variable} ${brand.variable}`}>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
