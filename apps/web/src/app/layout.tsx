import type { Metadata, Viewport } from "next";
import { Fraunces, Lexend } from "next/font/google";
import { I18nProvider } from "@/core/i18n/provider";
import "./globals.css";

const lexend = Lexend({
  subsets: ["latin"],
  variable: "--font-lexend",
  display: "swap",
});

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL?.trim() || "https://ristosimply.com"),
  title: {
    default: "RistoSimply — Restaurant & Hotel Management",
    template: "%s · RistoSimply",
  },
  description:
    "Software gestionale per ristorante e hotel: ordini, cucina, camere e magazzino in un unico sistema.",
};

export const viewport: Viewport = {
  themeColor: "#0e1117",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="it" className={`${lexend.variable} ${fraunces.variable}`}>
      <body className="min-h-dvh font-sans text-[15px] leading-relaxed">
        <I18nProvider>{children}</I18nProvider>
      </body>
    </html>
  );
}
