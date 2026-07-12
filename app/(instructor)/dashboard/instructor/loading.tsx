import { Skeleton } from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <div className="min-h-screen bg-bg flex flex-col">
      <header className="flex items-center justify-between px-8 py-5 border-b border-white/6">
        <div className="flex items-center gap-2.75">
          <div className="w-7 h-7 rounded-lg bg-gold/40 animate-pulse" />
          <span className="font-serif text-xl text-text-primary tracking-[-0.01em] opacity-40">
            CodeStreak
          </span>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center px-6 py-12 max-w-180 mx-auto w-full gap-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </main>
    </div>
  );
}
