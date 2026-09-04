"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logomark } from "@/components/brand/Logomark";
import { SignUpGateModal } from "@/components/auth/SignUpGateModal";
import type { CurrentUser } from "@/lib/auth/session";

interface Props {
  user: Pick<CurrentUser, "role"> | null;
}

// Shared sticky header for every public (anonymous-reachable) page: the
// course catalog homepage ("/") and everything under app/(public)/courses/**.
export function PublicHeader({ user }: Props) {
  const [modalOpen, setModalOpen] = useState(false);
  const pathname = usePathname();
  const onCourses = pathname === "/" || (pathname?.startsWith("/courses") ?? false);
  const dashboardHref = user?.role === "INSTRUCTOR" ? "/dashboard/instructor" : "/dashboard/student";

  return (
    <header className="sticky top-0 z-40 bg-bg/92 backdrop-blur-sm border-b border-white/[0.07]">
      <div className="max-w-[1180px] mx-auto flex items-center justify-between gap-5 px-6 py-3.5">
        <Link href="/" className="flex items-center gap-2.5 no-underline">
          <Logomark className="w-7 h-7" />
          <span className="font-serif text-[19px] text-text-primary tracking-[-0.01em]">
            Code<span className="font-mono font-medium">Streak</span>
          </span>
        </Link>
        <div className="flex items-center gap-3.5 flex-none">
          {user ? (
            <Link
              href={dashboardHref}
              className="bg-gold text-bg rounded-[9px] px-4 py-2 text-[13.5px] font-semibold no-underline hover:brightness-105 transition-all"
            >
              Go to dashboard
            </Link>
          ) : (
            <>
              <Link
                href="/login"
                className="bg-transparent border-none text-text-secondary text-sm cursor-pointer px-1 py-2 hover:text-text-primary transition-colors"
              >
                Sign in
              </Link>
              <Link
                href="/signup"
                className="bg-gold text-bg border-none rounded-[9px] px-[18px] py-[9px] text-sm font-semibold cursor-pointer hover:brightness-110 transition-all"
              >
                Get started
              </Link>
            </>
          )}
        </div>
      </div>

      <SignUpGateModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        message="Create a free account to start your streak."
      />
    </header>
  );
}
