"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { getStreakData, type StreakData } from "@/lib/actions/streak";
import { StreakHeader } from "./StreakHeader";

function StreakHeaderSkeleton() {
  return (
    <div className="bg-surface border border-white/[0.07] rounded-[18px] h-[132px] animate-pulse" />
  );
}

export function StreakHeaderLoader() {
  const searchParams = useSearchParams();
  const courseId = searchParams.get("courseId") ?? undefined;
  const [data, setData] = useState<StreakData | null>(null);

  useEffect(() => {
    // Prevents a stale fetch (e.g. from a previous courseId) resolving after
    // cleanup from overwriting state with out-of-order data.
    let cancelled = false;
    getStreakData(courseId).then((result) => {
      if (!cancelled) setData(result.success ? result.data : null);
    });
    return () => {
      cancelled = true;
    };
  }, [courseId]);

  if (!data) return <StreakHeaderSkeleton />;
  return <StreakHeader {...data} courseId={courseId} />;
}
