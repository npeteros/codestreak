import { generateMetadata } from "@/lib/seo/metadata";
import { LoginForm } from "./LoginForm";

export const metadata = generateMetadata({
  title: "Log In",
  description: "Log in to your CodeStreak account and continue your streak.",
  path: "/login",
});

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { next } = await searchParams;
  const nextUrl = typeof next === "string" && next.startsWith("/") ? next : undefined;
  return <LoginForm next={nextUrl} />;
}
