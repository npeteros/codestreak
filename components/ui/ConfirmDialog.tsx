"use client";

import { useEffect, useRef } from "react";

interface Props {
  open: boolean;
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  danger = false,
  onConfirm,
  onCancel,
}: Props) {
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (open) cancelRef.current?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onCancel();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.55)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        className="bg-[#1A1A1F] border border-white/10 rounded-[16px] px-7 py-6 flex flex-col gap-5 w-full max-w-sm shadow-2xl"
        style={{ animation: "cdPop .18s ease" }}
      >
        <div className="flex flex-col gap-1.5">
          <p
            id="confirm-dialog-title"
            className="text-[15px] font-semibold text-[#E4E2DB]"
          >
            {title}
          </p>
          {message && (
            <p className="text-[13px] text-text-muted leading-[1.55]">{message}</p>
          )}
        </div>

        <div className="flex gap-2.5 justify-end">
          <button
            ref={cancelRef}
            onClick={onCancel}
            className="px-4 py-[9px] rounded-[9px] font-sans text-[13px] font-semibold border border-white/[0.18] text-[#D7D5CE] bg-transparent cursor-pointer hover:border-white/30 transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-[9px] rounded-[9px] font-sans text-[13px] font-semibold cursor-pointer transition-colors"
            style={
              danger
                ? {
                    background: "color-mix(in srgb, #E0795E 20%, transparent)",
                    color: "#E0795E",
                    border: "1px solid color-mix(in srgb, #E0795E 45%, transparent)",
                  }
                : {
                    background: "#F5C842",
                    color: "#0B0B0D",
                    border: "1px solid transparent",
                  }
            }
          >
            {confirmLabel}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes cdPop {
          from { opacity: 0; transform: scale(.95) translateY(6px); }
          to   { opacity: 1; transform: scale(1)  translateY(0); }
        }
      `}</style>
    </div>
  );
}
