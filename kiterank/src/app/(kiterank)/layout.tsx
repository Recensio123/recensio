import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Geist_Mono } from 'next/font/google'
import "../globals.css";

/*
 * Produktens typsnitt.
 *
 * Plus Jakarta Sans i allt som är text, Geist Mono där siffror ska stå i
 * kolumn. Variabelnamnen är avsiktligt leverantörsneutrala — de hette
 * --font-geist-sans, vilket blev en lögn i trettiotvå filer den dag typsnittet
 * byttes.
 */
const brandSans = Plus_Jakarta_Sans({
  variable: "--font-brand-sans",
  subsets: ["latin"],
});

const brandMono = Geist_Mono({
  variable: "--font-brand-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  // Canonicals and Open Graph URLs resolve against this — without it they
  // stay relative, which search engines treat as missing
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? 'https://kiterank.se'),
  title: 'Hemsida & marknadsföring för salonger — fler kunder från Google | Kiterank',
  description: 'Kiterank bygger din salongs hemsida färdig på fem minuter och sköter marknadsföringen som ger fler kunder — Google-profil, omdömen, synlighet och en att göra-lista varje vecka.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="sv"
      className={`${brandSans.variable} ${brandMono.variable} h-full antialiased`}
    >
      <body suppressHydrationWarning className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
