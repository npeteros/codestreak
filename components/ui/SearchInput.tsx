"use client";

interface Props {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function SearchInput({ value, onChange, placeholder = "Search…" }: Props) {
  return (
    <div className="relative flex-1 min-w-[180px]">
      <svg
        aria-hidden="true"
        viewBox="0 0 20 20"
        className="absolute left-3 top-1/2 -translate-y-1/2 w-[15px] h-[15px] text-text-muted pointer-events-none"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
      >
        <circle cx="8.5" cy="8.5" r="5.5" />
        <path d="M17 17l-4-4" strokeLinecap="round" />
      </svg>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-surface border border-white/[0.08] rounded-[9px] pl-9 pr-3 py-[9px] font-sans text-[13.5px] text-text-primary placeholder:text-text-muted outline-none focus:border-white/25 transition-colors"
      />
    </div>
  );
}
