import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-bricolage",
  weight: ["400","500","600","700","800"],
  display: "swap",
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
  weight: ["400","500"],
});

export const metadata: Metadata = {
  title: "Betaray — See beyond the surface. Test management with clarity.",
  description:
    "Test management that brings clarity to complexity. Plan, organize, and execute software tests with confidence — with Jira Cloud integration, traceability, and an open-source, self-hosted core.",
  applicationName: "Betaray",
  manifest: "/manifest.webmanifest",
  openGraph: {
    title: "Betaray — See beyond the surface.",
    description:
      "Test management that brings clarity to complexity. Inspired by the manta ray.",
    siteName: "Betaray",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#526E69",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${bricolage.variable} ${mono.variable} antialiased`}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
      </head>
      <body className="min-h-screen flex flex-col">{children}</body>
    </html>
  );
}
