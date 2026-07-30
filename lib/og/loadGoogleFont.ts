// next/og's ImageResponse (Satori) needs raw font binaries — it can't use
// next/font or @font-face. Google serves .ttf instead of .woff2 to old
// browser user-agents, so we spoof one to fetch a binary directly.
const LEGACY_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/41.0.2228.0 Safari/537.36";

export async function loadGoogleFont(
  family: string,
  weight: number,
  text: string
): Promise<ArrayBuffer> {
  const cssUrl = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(
    family
  )}:wght@${weight}&text=${encodeURIComponent(text)}`;

  const css = await fetch(cssUrl, {
    headers: { "User-Agent": LEGACY_UA },
  }).then((res) => res.text());

  const match = css.match(/src: url\((.+?)\) format\('(?:opentype|truetype|woff)'\)/);
  if (!match) {
    throw new Error(`Could not resolve font source for ${family} ${weight}`);
  }

  const res = await fetch(match[1]);
  return res.arrayBuffer();
}
