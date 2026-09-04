"use client";

// ARCHIVED — no longer wired to any route. This was the marketing landing
// page previously rendered at "/" before that route became the course
// catalog (see app/page.tsx). Kept here, unreferenced, in case the
// marketing-style homepage is wanted again later. Not covered by routing
// tests; verify imports (e.g. LandingPageData, getLandingPageData) still
// resolve before reconnecting it.

import { useState } from "react";
import Link from "next/link";
import { Zap, CheckCircle2, ListChecks, BookOpen, Users } from "lucide-react";
import { SignUpGateModal } from "@/components/auth/SignUpGateModal";
import { PublicHeader } from "@/components/layout/PublicHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SampleHeatmap, SampleHeatmapLegend } from "@/components/marketing/SampleHeatmap";
import type { LandingPageData } from "@/lib/actions/publicCatalog";
import type { CurrentUser } from "@/lib/auth/session";

const MECHANICS = [
  {
    icon: Zap,
    title: "Daily Challenge",
    body: "One new problem a day, scoped to what you're studying right now. Solve it, keep the streak.",
  },
  {
    icon: CheckCircle2,
    title: "Check-ins",
    body: "A line about what you worked on, tied to your actual lab or project — five minutes, honest record.",
  },
  {
    icon: ListChecks,
    title: "Sprint Board",
    body: "Bigger assignments broken into tasks. Instructor milestones and your own tasks, same board.",
  },
] as const;

export function LandingClient({
  data,
  user,
}: {
  data: LandingPageData;
  user: CurrentUser | null;
}) {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <div className="min-h-screen bg-bg text-text-primary font-sans">
      <PublicHeader user={user} />

      <main>
        {/* HERO */}
        <section className="max-w-[1180px] mx-auto grid grid-cols-1 lg:grid-cols-[1.05fr_1fr] gap-14 items-center px-6 pt-[76px] pb-16">
          <div className="flex flex-col gap-6">
            <div className="flex items-center gap-2.5 font-mono text-[11px] tracking-[0.2em] text-gold uppercase">
              <span className="w-[7px] h-[7px] rounded-full bg-gold inline-block" />
              Built by a student, for students
            </div>
            <h1 className="m-0 font-serif font-normal text-[52px] leading-[1.08] text-text-primary tracking-[-0.01em]">
              Building the habit of coding every day.
            </h1>
            <p className="m-0 max-w-[460px] text-[16.5px] leading-relaxed text-text-secondary">
              Free courses in the languages you&rsquo;re already taking. Daily
              challenges, check-ins, and sprint work all feed one streak — same
              pull that keeps a fitness habit alive, pointed at your coursework.
            </p>
            <div className="flex items-center gap-3.5 flex-wrap">
              <button
                onClick={() => setModalOpen(true)}
                className="bg-gold text-bg border-none rounded-[10px] px-6 py-[13px] text-[15px] font-semibold cursor-pointer hover:brightness-110 transition-all"
              >
                Start your streak
              </button>
              <Link
                href="/courses"
                className="border border-white/[0.14] rounded-[10px] px-[22px] py-3 text-[15px] text-text-secondary no-underline hover:text-text-primary hover:border-white/25 transition-colors"
              >
                Browse courses →
              </Link>
            </div>
            <div className="flex gap-8 mt-2 flex-wrap">
              <div className="flex flex-col gap-0.5">
                <span className="font-mono text-2xl text-text-primary font-medium">
                  {data.stats.courseCount}
                </span>
                <span className="font-mono text-[11px] text-text-faint tracking-wide">
                  COURSES
                </span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="font-mono text-2xl text-text-primary font-medium">
                  {data.stats.studentCount}
                </span>
                <span className="font-mono text-[11px] text-text-faint tracking-wide">
                  STUDENTS ENROLLED
                </span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="font-mono text-2xl text-gold font-medium">0</span>
                <span className="font-mono text-[11px] text-text-faint tracking-wide">
                  COST TO ENROLL
                </span>
              </div>
            </div>
          </div>

          <div className="bg-surface border border-white/[0.07] rounded-[18px] px-[26px] py-6 flex flex-col gap-4">
            <div className="flex items-baseline justify-between gap-2.5">
              <div className="flex items-baseline gap-2.5">
                <span className="font-mono text-[44px] leading-[0.9] text-gold font-medium tracking-[-0.02em]">
                  47
                </span>
                <span className="font-mono text-[11.5px] tracking-wide uppercase text-text-secondary leading-tight">
                  day
                  <br />
                  streak
                </span>
              </div>
              <span className="font-mono text-[11px] text-text-muted">SAMPLE STUDENT</span>
            </div>
            <SampleHeatmap />
            <div className="flex items-center gap-2 font-mono text-[10.5px] text-text-faint pt-0.5 border-t border-white/[0.06] mt-1">
              <span>Less</span>
              <SampleHeatmapLegend />
              <span>More</span>
              <span className="ml-auto text-text-muted">
                Every square = a check-in, challenge, or sprint task.
              </span>
            </div>
          </div>
        </section>

        {/* STREAK MECHANIC */}
        <section className="max-w-[1180px] mx-auto flex flex-col gap-8 px-6 py-14">
          <div className="flex flex-col gap-2.5 max-w-[640px]">
            <span className="font-mono text-[11px] tracking-[0.16em] text-gold">
              HOW IT WORKS
            </span>
            <h2 className="m-0 font-serif font-normal text-[32px] text-text-primary tracking-[-0.01em]">
              One streak, lit up by everything you do
            </h2>
            <p className="m-0 text-[15px] leading-relaxed text-text-muted">
              Practice that only happens the night before an exam doesn&rsquo;t
              stick. Three small habits feed the same graph, so momentum never
              fully resets.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-[18px]">
            {MECHANICS.map((m) => (
              <div
                key={m.title}
                className="bg-surface border border-white/[0.07] rounded-[15px] p-[22px] flex flex-col gap-[13px]"
              >
                <span className="inline-flex w-[34px] h-[34px] rounded-[10px] bg-gold/[0.14] items-center justify-center text-gold flex-none">
                  <m.icon size={18} />
                </span>
                <span className="text-[15px] font-semibold text-[#E4E2DB]">{m.title}</span>
                <span className="text-[13.5px] leading-relaxed text-text-muted">{m.body}</span>
              </div>
            ))}
          </div>
        </section>

        {/* COURSE BREADTH */}
        <section className="max-w-[1180px] mx-auto flex flex-col gap-7 px-6 py-14">
          <div className="flex items-end justify-between gap-4 flex-wrap">
            <div className="flex flex-col gap-2.5">
              <span className="font-mono text-[11px] tracking-[0.16em] text-gold">
                COURSES FOR EVERY STACK
              </span>
              <h2 className="m-0 font-serif font-normal text-[32px] text-text-primary tracking-[-0.01em]">
                Whatever you&rsquo;re taking, there&rsquo;s a streak for it
              </h2>
            </div>
            <Link href="/courses" className="text-sm text-gold no-underline whitespace-nowrap">
              Browse all {data.stats.courseCount} courses →
            </Link>
          </div>

          {data.languageChips.length > 0 && (
            <div className="flex gap-2 flex-wrap">
              {data.languageChips.map((lang) => (
                <span
                  key={lang}
                  className="font-mono text-[11.5px] text-text-secondary border border-white/10 rounded-full px-[13px] py-[5px]"
                >
                  {lang}
                </span>
              ))}
            </div>
          )}

          {data.previewCourses.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {data.previewCourses.map((c) => (
                <Link
                  key={c.id}
                  href={c.href}
                  className="bg-surface border border-white/[0.07] rounded-[15px] p-[18px] flex flex-col gap-3 no-underline hover:border-gold/45 hover:-translate-y-0.5 transition-all"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10.5px] text-gold border border-gold/40 rounded-full px-[9px] py-0.5">
                      {c.languageTag}
                    </span>
                  </div>
                  <div className="font-serif text-lg text-text-primary leading-tight">
                    {c.name}
                  </div>
                  {c.description && (
                    <div className="text-[13px] text-text-muted leading-[1.55] flex-1 line-clamp-2">
                      {c.description}
                    </div>
                  )}
                  <div className="flex items-center justify-between gap-2 font-mono text-[11px] text-text-faint mt-auto pt-2 border-t border-white/[0.06]">
                    <span>{c.instructorName}</span>
                    <span className="flex items-center gap-1">
                      <Users size={12} />
                      {c.enrolledCount}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="border border-dashed border-white/15 rounded-[15px] px-6 py-12 flex flex-col items-center gap-1.5 text-center">
              <BookOpen size={20} className="text-text-faint" />
              <span className="text-[13.5px] text-text-muted">
                New courses are on the way — check back soon.
              </span>
            </div>
          )}
        </section>

        {/* INSTRUCTORS */}
        {data.instructorCards.length > 0 && (
          <section className="max-w-[1180px] mx-auto flex flex-col gap-7 px-6 py-14">
            <div className="flex flex-col gap-2.5 max-w-[640px]">
              <span className="font-mono text-[11px] tracking-[0.16em] text-gold">
                TAUGHT BY PEOPLE WHO STILL SHIP
              </span>
              <h2 className="m-0 font-serif font-normal text-[32px] text-text-primary tracking-[-0.01em]">
                Real instructors, a whole class of peers
              </h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              {data.instructorCards.map((inst) => (
                <div
                  key={inst.name}
                  className="bg-surface border border-white/[0.07] rounded-[15px] p-[18px] flex items-center gap-[11px]"
                >
                  <span className="w-[38px] h-[38px] rounded-[10px] bg-gold/[0.16] flex items-center justify-center font-mono text-sm text-gold flex-none">
                    {inst.initial}
                  </span>
                  <div className="flex flex-col gap-0.5 min-w-0">
                    <span className="text-sm font-semibold text-[#E4E2DB] truncate">
                      {inst.name}
                    </span>
                    <span className="font-mono text-[10.5px] text-text-muted">{inst.title}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* FINAL CTA */}
        <section className="max-w-[1180px] mx-auto px-6 pt-4 pb-[72px]">
          <div className="bg-gradient-to-br from-gold/10 to-surface border border-gold/30 rounded-[18px] px-10 py-11 flex flex-wrap items-center justify-between gap-6">
            <div className="flex flex-col gap-2">
              <h2 className="m-0 font-serif font-normal text-[28px] text-text-primary tracking-[-0.01em]">
                Start day one today.
              </h2>
              <p className="m-0 text-[14.5px] text-text-secondary">
                Free forever. No credit card, just a streak worth keeping.
              </p>
            </div>
            <button
              onClick={() => setModalOpen(true)}
              className="bg-gold text-bg border-none rounded-[10px] px-[26px] py-[13px] text-[15px] font-semibold cursor-pointer hover:brightness-110 transition-all flex-none"
            >
              Get started — it&rsquo;s free
            </button>
          </div>
        </section>
      </main>

      <SiteFooter />

      <SignUpGateModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        message="Create a free account to start your streak."
        next="/"
      />
    </div>
  );
}
