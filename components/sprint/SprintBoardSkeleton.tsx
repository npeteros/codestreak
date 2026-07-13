const COLUMN_CARD_COUNTS = [3, 2, 1, 2];

export function SprintBoardSkeleton() {
  return (
    <div className="flex flex-col gap-4 animate-pulse">
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div className="h-4 w-56 bg-white/[0.07] rounded" />
        <div className="h-9 w-28 bg-white/[0.07] rounded-[9px]" />
      </div>

      <div className="h-[5px] rounded-full bg-white/[0.08]" />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-start">
        {COLUMN_CARD_COUNTS.map((cardCount, colIdx) => (
          <div
            key={colIdx}
            className="flex flex-col gap-[11px] p-[13px] rounded-[14px] min-h-[300px]"
            style={{ background: "#101013", border: "1px solid rgba(255,255,255,0.06)" }}
          >
            <div className="flex items-center justify-between px-1 py-0.5">
              <div className="h-3 w-16 bg-white/[0.08] rounded" />
              <div className="h-4 w-5 bg-white/[0.06] rounded-full" />
            </div>

            {Array.from({ length: cardCount }).map((_, cardIdx) => (
              <div
                key={cardIdx}
                className="bg-[#17171b] rounded-[10px] p-[11px_12px] flex flex-col gap-2"
                style={{ border: "1px solid rgba(255,255,255,0.06)" }}
              >
                <div className="h-[15px] w-16 bg-white/[0.07] rounded-[5px]" />
                <div className="h-3.5 w-4/5 bg-white/[0.09] rounded" />
                <div className="h-3 w-full bg-white/[0.06] rounded" />
                <div className="h-3 w-2/3 bg-white/[0.06] rounded" />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
