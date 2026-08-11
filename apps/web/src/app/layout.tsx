import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { OfflineProvider } from "@/components/OfflineProvider";
import { getLocale } from "@/i18n/server";

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
  description: "Sistema Nacional Preventivo de Violencia Escolar"
};

export const viewport: Viewport = {
  colorScheme: "light",
  themeColor: "#34208C"
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const locale = await getLocale();
  return (
    <html lang={locale}>
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        <OfflineProvider />
        {children}
      </body>
    </html>
  );
}
