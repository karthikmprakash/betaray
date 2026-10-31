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
  title: "Betaray — AI-Powered Test Management in Jira",
  description: "Bring QA and development together in Jira. Betaray designs, runs and automates tests where work happens — with every requirement traceable.",
  applicationName: "Betaray",
  manifest: "/manifest.webmanifest",
  openGraph: {
    title: "Betaray — Testing, where the work lives",
    description: "Test management natively inside Jira, with every requirement traceable.",
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
