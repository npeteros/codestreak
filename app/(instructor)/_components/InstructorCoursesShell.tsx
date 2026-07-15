import { LogoutButton } from "@/components/auth/LogoutButton";

export function InstructorCoursesShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-bg flex flex-col">
      {/* Minimal top bar */}
      <header className="flex items-center justify-between px-8 py-5 border-b border-white/6">
        <div className="flex items-center gap-2.75">
          <div className="w-7 h-7 rounded-lg bg-gold flex items-center justify-center">
            <div className="w-2.25 h-2.25 rounded-xs bg-bg" />
          </div>
          <span className="font-serif text-xl text-text-primary tracking-[-0.01em]">
            CodeStreak
          </span>
          <span className="font-mono text-[9px] tracking-[.12em] text-gold border border-gold/40 rounded px-1.5 py-0.5">
            INSTR
          </span>
        </div>
        <LogoutButton />
      </header>

      <main className="flex-1 flex flex-col items-center px-6 py-12 max-w-180 mx-auto w-full">
        {children}
      </main>
    </div>
  );
}
