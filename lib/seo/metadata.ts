import type { Metadata } from "next";

if (!process.env.NEXT_PUBLIC_APP_URL) {
  throw new Error("NEXT_PUBLIC_APP_URL is not set in .env.local");
}

const APP_URL = process.env.NEXT_PUBLIC_APP_URL;

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
      title,
      description,
      url,
      images: [{ url: ogImage }],
    },
    twitter: {
      title,
      description,
      images: [ogImage],
    },
  };
}
