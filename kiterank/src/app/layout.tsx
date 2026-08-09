import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  // Canonicals and Open Graph URLs resolve against this — without it they
  // stay relative, which search engines treat as missing
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? 'https://kiterank.se'),
  title: 'Kiterank — Google marketing for local businesses',
  description: 'Connect your Google account and get a weekly action plan that helps local service businesses rank higher, earn more reviews, and get found first.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="sv"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body suppressHydrationWarning className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
