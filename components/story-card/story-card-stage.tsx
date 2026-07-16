"use client";

import * as React from "react";

/**
 * Renders its child at a fixed pixel size off-screen, independent of viewport size or
 * zoom — this is what makes the exported PNG crisp and correctly sized on any device.
 * Mount any fixed-size card inside this wherever you need to export it (it doesn't
 * need to be visible to the user; the share button lives elsewhere in your UI).
 */
export function OffscreenStage({
  width,
  height,
  children,
}: {
  width: number;
  height: number;
  children: React.ReactNode;
}) {
  return (
    <div aria-hidden style={{ position: "fixed", top: 0, left: -99999, width, height, pointerEvents: "none", zIndex: -1, transform: "none" }}>
      {children}
    </div>
  );
}

/** <OffscreenStage> pinned to <StoryCard>'s fixed 1080×1920. */
export function StoryCardStage({ children }: { children: React.ReactNode }) {
  return (
    <OffscreenStage width={1080} height={1920}>
      {children}
    </OffscreenStage>
  );
}
