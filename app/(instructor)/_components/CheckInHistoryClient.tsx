"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { getStudentCheckInHistory } from "@/lib/actions/instructor";
import type { CheckInHistoryItem } from "@/lib/actions/instructor";
import { formatShortDate } from "@/lib/format";

interface Props {
  courseId: string;
  studentId: string;
  studentName: string;
  initialItems: CheckInHistoryItem[];
  initialCursor: string | null;
}

export function CheckInHistoryClient({
  courseId,
  studentId,
  studentName,
  initialItems,
  initialCursor,
}: Props) {
  const [items, setItems] = useState(initialItems);
  const [cursor, setCursor] = useState(initialCursor);
  const [isPending, startTransition] = useTransition();

  function loadMore() {
    startTransition(async () => {
      const res = await getStudentCheckInHistory(courseId, studentId, cursor);
      if (res.success) {
        setItems((prev) => [...prev, ...res.items]);
        setCursor(res.nextCursor);
      }
    });
  }

  return (
    <div className="flex flex-col gap-5" style={{ animation: "chFade .25s ease" }}>
      <div className="flex flex-col gap-1">
        <Link
          href={`/dashboard/instructor/${courseId}/students`}
          className="font-mono text-[11px] text-text-muted hover:text-text-primary transition-colors w-fit"
        >
          ← Back to students
        </Link>
        <h2 className="font-serif font-normal text-[1.7rem] text-text-primary">
          {studentName}&rsquo;s check-ins
        </h2>
        <p className="text-sm text-text-muted">
          {items.length} loaded{cursor ? " · more available" : ""}
        </p>
      </div>

      {items.length === 0 ? (
        <div className="text-center py-14 text-text-faint font-mono text-[12px]">
          No check-ins yet.
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {items.map((c) => (
            <div
              key={c.id}
              className="bg-surface border border-white/[0.07] rounded-[12px] px-4 py-[14px] flex flex-col gap-[7px]"
            >
              <span className="font-mono text-[11px] text-text-faint">
                {formatShortDate(c.createdAt)}
              </span>
              <div className="text-[13.5px] text-[#C2C0B9] leading-[1.6]">{c.note}</div>
            </div>
          ))}
        </div>
      )}

      {cursor && (
        <button
          onClick={loadMore}
          disabled={isPending}
          className="self-center bg-transparent text-gold border border-gold/35 rounded-[9px] px-5 py-[9px] font-sans text-[13px] font-semibold cursor-pointer hover:bg-gold/10 transition-colors disabled:opacity-50"
        >
          {isPending ? "Loading…" : "Load more"}
        </button>
      )}

      <style>{`@keyframes chFade { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:none; } }`}</style>
    </div>
  );
}
