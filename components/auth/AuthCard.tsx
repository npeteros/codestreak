import { Logomark } from "@/components/brand/Logomark";

export function AuthCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#0F0F0F] flex items-center justify-center p-8">
      <div className="w-full max-w-sm space-y-8">
        <div className="flex items-center gap-3">
          <Logomark className="w-8 h-8" />
          <span className="font-serif text-2xl text-text-primary">
            CodeStreak
          </span>
        </div>
        {children}
      </div>
    </div>
  );
}
