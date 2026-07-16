"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { MoreHorizontal, X } from "lucide-react";

type MoreItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
};

type Props = {
  items: MoreItem[];
  active: boolean;
  children?: React.ReactNode;
};

export function MobileMoreSheet({ items, active, children }: Props) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={[
          "flex flex-1 flex-col items-center gap-1 py-4 px-1 transition-colors",
          active ? "text-gold" : "text-text-secondary",
        ].join(" ")}
      >
        <MoreHorizontal size={20} className="shrink-0" />
        <span className="text-[10px] font-medium leading-none text-center">More</span>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end"
          style={{ background: "rgba(0,0,0,0.55)" }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="More navigation"
            className="w-full bg-sidebar border-t border-white/[0.07] rounded-t-[20px] px-3 pt-3 pb-[calc(env(safe-area-inset-bottom)+12px)] flex flex-col gap-1"
            style={{ animation: "moreSheetUp .18s ease" }}
          >
            <div className="flex items-center justify-between px-2 pb-2">
              <span className="font-mono text-[10px] tracking-[.16em] text-text-faint">MORE</span>
              <button
                onClick={() => setOpen(false)}
                className="p-1.5 text-text-secondary hover:text-text-primary transition-colors"
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </div>

            {items.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                onClick={() => setOpen(false)}
                className="flex items-center gap-2.75 px-3 py-2.5 rounded-[10px] text-sm text-text-secondary hover:text-text-primary transition-colors"
              >
                <Icon size={18} className="shrink-0" />
                <span>{label}</span>
              </Link>
            ))}

            {children && (
              <div className="pt-1 mt-1 border-t border-white/[0.06]">{children}</div>
            )}
          </div>

          <style>{`
            @keyframes moreSheetUp {
              from { opacity: 0; transform: translateY(16px); }
              to   { opacity: 1; transform: translateY(0); }
            }
          `}</style>
        </div>
      )}
    </>
  );
}
