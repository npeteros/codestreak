import type { Metadata } from "next";

const APP_URL = (process.env.NEXT_PUBLIC_APP_URL ?? "https://codestreak.dcism.org").replace(/\/$/, "");

export function generateMetadata({
  title,
  description,
  path,
  ogImage = "/og-1200x630.png",
}: {
  title: string;
  description: string;
  path: string;
  // Pass null for routes with their own opengraph-image.tsx file convention
  // sibling — Next.js auto-attaches those tags, and also setting
  // openGraph.images here would produce duplicate/conflicting og:image tags.
  ogImage?: string | null;
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
      ...(ogImage && { images: [{ url: ogImage, width: 1200, height: 630, alt: title }] }),
    },
    twitter: {
      title,
      description,
      ...(ogImage && { images: [ogImage] }),
    },
  };
}
