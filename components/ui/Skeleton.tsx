export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      className={`bg-surface border border-white/[0.07] rounded-[18px] animate-pulse ${className}`}
    />
  );
}
