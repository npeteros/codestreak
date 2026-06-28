import type { CheckIn } from "@/lib/firebase/types";

interface Props {
  checkIn: CheckIn;
  timezone?: string;
}

export function CheckInCard({ checkIn, timezone = "UTC" }: Props) {
  const date = new Date(checkIn.createdAt);

  const formattedDate = date.toLocaleDateString("en-US", {
    timeZone: timezone,
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <div
      className="rounded-xl border border-white/[0.08] px-5 py-4 space-y-2"
      style={{ backgroundColor: "#1A1A1A" }}
    >
      <p className="font-mono text-[12px] text-gold/70 tracking-wide">
        {formattedDate}
      </p>
      <p className="text-sm text-text-secondary leading-relaxed">
        {checkIn.note}
      </p>
    </div>
  );
}
