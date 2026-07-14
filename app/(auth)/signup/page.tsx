import { redirect } from "next/navigation";
import { generateMetadata } from "@/lib/seo/metadata";
import { getCurrentUser } from "@/lib/auth/session";
import { SignupForm } from "./SignupForm";

export const metadata = generateMetadata({
  title: "Sign Up",
  description: "Create your CodeStreak account and start building your streak.",
  path: "/signup",
});

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const user = await getCurrentUser();
  if (user) {
    redirect(
      user.role === "INSTRUCTOR" ? "/dashboard/instructor" : "/dashboard/student"
    );
  }

  const { next } = await searchParams;
  const nextUrl = typeof next === "string" && next.startsWith("/") ? next : undefined;
  return <SignupForm next={nextUrl} />;
}
