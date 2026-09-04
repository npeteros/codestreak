import { ImageResponse } from "next/og";
import { getJoinPageData } from "@/lib/actions/courses";
import { loadGoogleFont } from "@/lib/og/loadGoogleFont";

export const alt = "Join a course on CodeStreak";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const BG = "#0F0F0F";
const GOLD = "#F5C842";
const TEXT_PRIMARY = "#F0F0F0";
const TEXT_MUTED = "#8C8A83";

function Logomark() {
  return (
    <svg width="54" height="48" viewBox="11 14 80 72">
      <polygon points="15,80 30,80 38,52 23,52" fill={GOLD} />
      <polygon points="39,80 54,80 62,38 47,38" fill={GOLD} />
      <polygon points="63,80 78,80 86,20 71,20" fill={GOLD} />
    </svg>
  );
}

export default async function Image({
  params,
}: {
  params: Promise<{ inviteCode: string }>;
}) {
  const { inviteCode } = await params;
  const data = await getJoinPageData(inviteCode);

  const heading = data.success ? data.course.name : "Invite not found";
  const tagline = data.success
    ? "Building the habit of coding every day."
    : "This invite link is invalid or has expired.";

  const fontText = `CODESTREAK${heading}${tagline}${
    data.success ? data.course.languageTag : ""
  }`;

  const [serif, sans, sansMedium] = await Promise.all([
    loadGoogleFont("DM Serif Display", 400, fontText),
    loadGoogleFont("DM Sans", 400, fontText),
    loadGoogleFont("DM Sans", 500, fontText),
  ]);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "0 100px",
          background: BG,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 14,
            marginBottom: 44,
          }}
        >
          <Logomark />
          <span
            style={{
              fontFamily: "DM Sans",
              fontWeight: 500,
              fontSize: 22,
              color: TEXT_MUTED,
              letterSpacing: 1,
            }}
          >
            CODESTREAK
          </span>
        </div>

        <div
          style={{
            display: "flex",
            fontFamily: "DM Serif Display",
            fontSize: heading.length > 28 ? 56 : 72,
            color: TEXT_PRIMARY,
            lineHeight: 1.15,
            maxWidth: 920,
          }}
        >
          {heading}
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            marginTop: 36,
          }}
        >
          {data.success && (
            <span
              style={{
                display: "flex",
                fontFamily: "DM Sans",
                fontWeight: 500,
                fontSize: 22,
                color: BG,
                background: GOLD,
                padding: "8px 18px",
                borderRadius: 8,
              }}
            >
              {data.course.languageTag}
            </span>
          )}
          <span
            style={{
              display: "flex",
              fontFamily: "DM Sans",
              fontSize: 24,
              color: TEXT_MUTED,
            }}
          >
            {tagline}
          </span>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "DM Serif Display", data: serif, style: "normal", weight: 400 },
        { name: "DM Sans", data: sans, style: "normal", weight: 400 },
        { name: "DM Sans", data: sansMedium, style: "normal", weight: 500 },
      ],
    }
  );
}
