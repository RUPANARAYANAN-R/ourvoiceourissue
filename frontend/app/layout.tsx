import type { Metadata, Viewport } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";

const outfit = Outfit({ subsets: ["latin"], weight: ['300', '400', '500', '600', '700', '800'] });

export const metadata: Metadata = {
  title: "Our voice",
  description: "AI-powered Tamil Voice Governance Intelligence Platform. Our voice. Our issues. Towards the right solution.",
  keywords: ["Our voice", "Tamil", "Governance", "AI", "Voice", "Grievance"],
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ta">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Tamil:wght@300;400;500;600;700&family=Noto+Sans+Devanagari:wght@300;400;500;600;700&family=Noto+Sans+Kannada:wght@300;400;500;600;700&family=Noto+Sans+Malayalam:wght@300;400;500;600;700&family=Noto+Sans+Telugu:wght@300;400;500;600;700&family=Noto+Sans+Bengali:wght@300;400;500;600;700&family=Noto+Nastaliq+Urdu:wght@400;700&display=swap" rel="stylesheet" />
      </head>
      <body className={`${outfit.className} antialiased selection:bg-amber-500/30 selection:text-amber-900`}>
        {children}
      </body>
    </html>
  );
}
