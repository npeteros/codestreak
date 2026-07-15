export function difficultyBadgeClass(difficulty: string): string {
  if (difficulty === "EASY") return "text-emerald-400 bg-emerald-400/10";
  if (difficulty === "HARD") return "text-risk bg-risk/10";
  return "text-gold bg-gold/10";
}

export function formatShortDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function initials(name: string): string {
  return name
    .split(" ")
    .map((p) => p[0] ?? "")
    .slice(0, 2)
    .join("")
    .toUpperCase();
}
