import Link from "next/link";
import { generateMetadata } from "@/lib/seo/metadata";
import { Logomark } from "@/components/brand/Logomark";

export const metadata = generateMetadata({
  title: "CodeStreak",
  description:
    "Course-based accountability for programming students. Build the habit. Ship the code.",
  path: "/",
});

export default function Home() {
  return (
    <div className="min-h-screen bg-bg flex flex-col items-center justify-center gap-8 p-8">
      <div className="flex items-center gap-3">
        <Logomark className="w-9 h-9" />
        <span className="font-serif text-[2rem] text-text-primary tracking-[-0.01em]">
          CodeStreak
        </span>
      </div>

      <p className="text-text-muted text-center max-w-sm leading-relaxed">
        Course-based accountability for programming students. Four modules, one
        streak.
      </p>

      <div className="flex gap-4">
        <Link
          href="/login"
          className="px-6 py-3 rounded-xl border border-white/10 text-text-secondary hover:text-text-primary hover:border-white/20 transition-colors font-medium text-sm"
        >
          Log in
        </Link>
        <Link
          href="/signup"
          className="px-6 py-3 rounded-xl bg-gold text-bg font-semibold hover:brightness-110 transition-all text-sm"
        >
          Get started
        </Link>
      </div>
    </div>
  );
}
