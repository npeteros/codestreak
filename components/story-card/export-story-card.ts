import { toPng } from "html-to-image";

export interface ExportCardOptions {
  fileName?: string;
  /** Output resolution multiplier over the node's fixed render size. */
  pixelRatio?: number;
  width: number;
  height: number;
}

/**
 * Captures a mounted, fixed-size card node (rendered off-screen inside
 * <OffscreenStage>, e.g. via <StoryCardStage>) and downloads it as a PNG.
 *
 * Waits on `document.fonts.ready` so DM Serif Display / DM Mono are painted before
 * capture — the root layout loads those fonts via `next/font/google`, so they're
 * self-hosted and don't need a runtime network request during export.
 */
export async function exportCardAsPng(node: HTMLElement, options: ExportCardOptions): Promise<Blob> {
  const { fileName = "codestreak-card.png", pixelRatio = 2, width, height } = options;

  if (typeof document !== "undefined" && "fonts" in document) {
    await document.fonts.ready;
  }

  const dataUrl = await toPng(node, {
    width,
    height,
    pixelRatio,
    cacheBust: true,
    style: { transform: "none" },
  });

  if (typeof document !== "undefined") {
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = fileName;
    a.click();
  }

  const res = await fetch(dataUrl);
  return res.blob();
}
