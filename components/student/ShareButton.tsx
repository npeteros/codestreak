"use client";

import { useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { Share2, ChevronDown, Loader2, RectangleVertical, Sticker } from "lucide-react";
import { getStoryCardData, type StoryCardData } from "@/lib/actions/storyCard";
import type { StreakEntry } from "@/lib/actions/streak";
import { StoryCard } from "@/components/story-card/StoryCard";
import { StreakSticker } from "@/components/story-card/StreakSticker";
import { StoryCardStage, OffscreenStage } from "@/components/story-card/story-card-stage";
import { exportCardAsPng } from "@/components/story-card/export-story-card";

interface Props {
  courseId?: string;
  streak: number;
  longest: number;
  activeDays: number;
  entries: StreakEntry[];
}

const STORY_WIDTH = 1080;
const STORY_HEIGHT = 1920;
const STICKER_WIDTH = 760;
const STICKER_HEIGHT = 340;

export function ShareButton({ courseId, streak, longest, activeDays, entries }: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [storyData, setStoryData] = useState<StoryCardData | null>(null);
  const [isLoadingStory, setIsLoadingStory] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const storyRef = useRef<HTMLDivElement>(null);
  const stickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    function onPointerDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setMenuOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  async function handleStoryClick() {
    setMenuOpen(false);
    setIsLoadingStory(true);
    const result = await getStoryCardData(courseId);
    setIsLoadingStory(false);
    if (!result.success) return;

    // Force the <StoryCard> to commit to the DOM now (rather than waiting on
    // an effect after this render) so storyRef.current is populated before capture.
    flushSync(() => setStoryData(result.data));

    setIsExporting(true);
    try {
      if (storyRef.current) {
        await exportCardAsPng(storyRef.current, {
          width: STORY_WIDTH,
          height: STORY_HEIGHT,
          fileName: `codestreak-day-${streak}.png`,
        });
      }
    } finally {
      setStoryData(null);
      setIsExporting(false);
    }
  }

  async function handleStickerClick() {
    setMenuOpen(false);
    if (!stickerRef.current) return;
    setIsExporting(true);
    try {
      await exportCardAsPng(stickerRef.current, {
        width: STICKER_WIDTH,
        height: STICKER_HEIGHT,
        pixelRatio: 3,
        fileName: `codestreak-sticker-day-${streak}.png`,
      });
    } finally {
      setIsExporting(false);
    }
  }

  const busy = isLoadingStory || isExporting;

  return (
    <div className="relative" ref={containerRef}>
      {storyData && (
        <StoryCardStage>
          <StoryCard
            ref={storyRef}
            streakDays={storyData.streak}
            heatmapData={storyData.heatmapData}
            problemsSolved={storyData.problemsSolved}
            username={storyData.username}
            qrCodeSvg={storyData.qrCodeSvg}
            isPersonalBest={storyData.isPersonalBest}
          />
        </StoryCardStage>
      )}
      <OffscreenStage width={STICKER_WIDTH} height={STICKER_HEIGHT}>
        <StreakSticker ref={stickerRef} streak={streak} longest={longest} activeDays={activeDays} entries={entries} />
      </OffscreenStage>

      <button
        onClick={() => setMenuOpen((v) => !v)}
        disabled={busy}
        className="flex items-center gap-1.5 font-mono text-[11px] tracking-[.06em] uppercase text-text-muted hover:text-gold transition-colors disabled:opacity-50 shrink-0"
      >
        {busy ? <Loader2 size={13} className="animate-spin" /> : <Share2 size={13} />}
        {isLoadingStory ? "Preparing…" : isExporting ? "Exporting…" : "Share"}
        {!busy && <ChevronDown size={11} className={`transition-transform ${menuOpen ? "rotate-180" : ""}`} />}
      </button>

      {menuOpen && (
        <div
          role="menu"
          className="absolute left-0 top-full mt-2 z-20 bg-[#1A1A1F] border border-white/10 rounded-[12px] py-1.5 min-w-[170px] shadow-2xl"
        >
          <button
            role="menuitem"
            onClick={handleStoryClick}
            className="w-full flex items-center gap-2.5 text-left px-3.5 py-2 font-sans text-[13px] text-text-secondary hover:text-text-primary hover:bg-white/[0.04] transition-colors"
          >
            <RectangleVertical size={14} className="shrink-0" />
            Instagram Story
          </button>
          <button
            role="menuitem"
            onClick={handleStickerClick}
            className="w-full flex items-center gap-2.5 text-left px-3.5 py-2 font-sans text-[13px] text-text-secondary hover:text-text-primary hover:bg-white/[0.04] transition-colors"
          >
            <Sticker size={14} className="shrink-0" />
            Sticker
          </button>
        </div>
      )}
    </div>
  );
}
