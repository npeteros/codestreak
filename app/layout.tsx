import type { Metadata, Viewport } from "next";
import { DM_Serif_Display, DM_Mono, DM_Sans } from "next/font/google";
import "./globals.css";

const dmSerif = DM_Serif_Display({
  weight: "400",
  style: ["normal", "italic"],
  variable: "--font-dm-serif",
  subsets: ["latin"],
});

const dmMono = DM_Mono({
  weight: ["300", "400", "500"],
  variable: "--font-dm-mono",
  subsets: ["latin"],
});

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"
  ),
  title: {
    default: "CodeStreak",
    template: "%s | CodeStreak",
  },
  description:
    "Course-based accountability for programming students. Build the habit. Ship the code.",
  openGraph: {
    siteName: "CodeStreak",
    type: "website",
    locale: "en_US",
    images: [
      {
        url: "/og-1200x630.png",
        width: 1200,
        height: 630,
        alt: "CodeStreak — Build the habit. Ship the code.",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    images: ["/og-1200x630.png"],
  },
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  themeColor: "#F5C842",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${dmSerif.variable} ${dmMono.variable} ${dmSans.variable} h-full`}
    >
      <body className="min-h-full bg-bg text-text-primary font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
