import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { OfflineProvider } from "@/components/OfflineProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"]
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"]
});

export const metadata: Metadata = {
  title: "SINAPVE",
  description: "Plataforma Nacional del Agente Preventivo de Violencia Escolar"
};

export const viewport: Viewport = {
  colorScheme: "light",
  themeColor: "#34208C"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        <OfflineProvider />
        {children}
      </body>
    </html>
  );
}
