"use client";

import { useState } from "react";
import dynamic from "next/dynamic";

const Markdown = dynamic(() => import("@/components/ui/Markdown"));

interface Props {
  title: string;
  description: string;
}

export function ProjectDescriptionPanel({ title, description }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div className="flex items-center gap-3 bg-surface border border-white/[0.07] rounded-[12px] px-[14px] py-[10px]">
        <div className="markdown-body flex-1 min-w-0 text-[13.5px] text-[#C2C0B9] leading-[1.5] line-clamp-1">
          <Markdown>{description}</Markdown>
        </div>
        <button
          onClick={() => setOpen(true)}
          className="shrink-0 text-[12px] text-gold bg-transparent border-none cursor-pointer p-0"
        >
          Show more
        </button>
      </div>

      {open && (
        <div
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="bg-surface border border-white/[0.08] rounded-[15px] p-[22px] w-full max-w-[520px] flex flex-col gap-3"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-serif text-[1.3rem] text-text-primary font-normal m-0">
              {title}
            </h3>
            <div className="markdown-body text-[13.5px] text-[#C2C0B9] leading-[1.6] max-h-[400px] overflow-y-auto">
              <Markdown>{description}</Markdown>
            </div>
            <div className="flex justify-end mt-1">
              <button
                onClick={() => setOpen(false)}
                className="text-text-muted border border-white/10 rounded-[9px] px-4 py-[9px] font-sans text-[13.5px] cursor-pointer bg-transparent"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
