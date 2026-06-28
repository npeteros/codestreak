"use client";

import { Loader2 } from "lucide-react";

interface SubmitButtonProps {
  loading: boolean;
  children: React.ReactNode;
}

export function SubmitButton({ loading, children }: SubmitButtonProps) {
  return (
    <button
      type="submit"
      disabled={loading}
      className="w-full bg-gold text-bg font-semibold py-3 rounded-xl hover:brightness-110 transition-all text-sm disabled:opacity-60 flex items-center justify-center gap-2"
    >
      {loading && <Loader2 size={14} className="animate-spin" />}
      {children}
    </button>
  );
}
