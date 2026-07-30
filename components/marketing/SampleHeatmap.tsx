// Decorative demo heatmap for the marketing landing page hero. Deliberately
// not fed by Math.random() or live Firestore data — a fixed, deterministic
// grid so server and client render identically (no hydration mismatch) and
// the page can stay on ISR without a per-request activity query. Colored on
// the same 0-4 level scale as lib/domain/streak.ts's getHeatmapLevel.

const WEEKS = 14;
const DAYS = 7;

function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function buildGrid(): (0 | 1 | 2 | 3 | 4)[][] {
  const rand = mulberry32(20260731);
  const grid: (0 | 1 | 2 | 3 | 4)[][] = [];
  for (let w = 0; w < WEEKS; w++) {
    const recent = w / WEEKS;
    const week: (0 | 1 | 2 | 3 | 4)[] = [];
    for (let d = 0; d < DAYS; d++) {
      let v: 0 | 1 | 2 | 3 | 4 = 0;
      if (rand() < 0.4 + recent * 0.5) {
        v = Math.min(4, 1 + Math.floor(rand() * (1 + Math.round(recent * 3)))) as 0 | 1 | 2 | 3 | 4;
      }
      week.push(v);
    }
    grid.push(week);
  }
  return grid;
}

const GRID = buildGrid();
const LEVEL_MIX = [0, 30, 48, 70] as const;

function colorForLevel(level: 0 | 1 | 2 | 3 | 4): string {
  if (level <= 0) return "#1c1c21";
  if (level >= 4) return "var(--gold, #F5C842)";
  const mix = LEVEL_MIX[level as 1 | 2 | 3];
  return `color-mix(in srgb, var(--gold, #F5C842) ${mix}%, #1c1c21)`;
}

export function SampleHeatmap() {
  return (
    <div className="flex gap-0.75">
      {GRID.map((week, wi) => (
        <div key={wi} className="flex flex-col gap-0.75">
          {week.map((level, di) => (
            <div
              key={di}
              className="w-2.75 h-2.75 rounded-[2.5px]"
              style={{ background: colorForLevel(level) }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

export function SampleHeatmapLegend() {
  return (
    <div className="flex gap-1">
      {([0, 1, 2, 3, 4] as const).map((level) => (
        <div
          key={level}
          className="w-2.5 h-2.5 rounded-[2.5px]"
          style={{ background: colorForLevel(level) }}
        />
      ))}
    </div>
  );
}
