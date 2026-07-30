"use client";

import Link from "next/link";

interface Props {
  open: boolean;
  onClose: () => void;
  message?: string;
  next?: string;
}

// Inline modal shown when a guest triggers a mutating action (join, submit)
// on a public page, instead of redirecting away or letting the action fail.
export function SignUpGateModal({
  open,
  onClose,
  message = "Create a free account to continue.",
  next,
}: Props) {
  if (!open) return null;

  const suffix = next ? `?next=${encodeURIComponent(next)}` : "";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-6"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm bg-[#1A1A1F] border border-white/[0.1] rounded-[15px] p-6 flex flex-col gap-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-col gap-1.5">
          <h2 className="font-serif text-[1.4rem] text-text-primary font-normal m-0">
            Sign up to continue
          </h2>
          <p className="text-sm text-text-muted m-0">{message}</p>
        </div>

        <div className="flex flex-col gap-2.5">
          <Link
            href={`/signup${suffix}`}
            className="block w-full text-center bg-gold text-bg rounded-[9px] px-5 py-[11px] font-sans text-[14px] font-semibold hover:brightness-105 transition-all"
          >
            Create account
          </Link>
          <Link
            href={`/login${suffix}`}
            className="block w-full text-center bg-transparent border border-white/[0.18] text-text-primary rounded-[9px] px-5 py-[11px] font-sans text-[14px] font-semibold hover:border-white/30 transition-all"
          >
            Sign in
          </Link>
          <button
            onClick={onClose}
            className="w-full bg-transparent border-none text-text-muted text-[13px] py-1 cursor-pointer hover:text-text-secondary transition-colors"
          >
            Not now
          </button>
        </div>
      </div>
    </div>
  );
}
