import type { Metadata } from "next";

if (!process.env.NEXT_PUBLIC_APP_URL) {
  throw new Error("NEXT_PUBLIC_APP_URL is not set in .env.local");
}

const APP_URL = process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");

export function generateMetadata({
  title,
  description,
  path,
  ogImage = "/og-1200x630.png",
}: {
  title: string;
  description: string;
  path: string;
  ogImage?: string;
}): Metadata {
  const url = `${APP_URL}${path}`;
  return {
    title,
    description,
    openGraph: {
      siteName: "CodeStreak",
      type: "website",
      locale: "en_US",
      title,
      description,
      url,
      images: [{ url: ogImage, width: 1200, height: 630, alt: title }],
    },
    twitter: {
      title,
      description,
      images: [ogImage],
    },
  };
}
