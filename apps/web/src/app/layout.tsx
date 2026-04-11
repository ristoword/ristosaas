import type { Metadata, Viewport } from "next";
import { Fraunces, Lexend } from "next/font/google";
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
  title: {
    default: "RistoWord — Pannello",
    template: "%s · RistoWord",
  },
  description:
    "Il gestionale cloud pensato per chi lavora in sala: pochi tocchi, tutto chiaro.",
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
        {children}
      </body>
    </html>
  );
}
