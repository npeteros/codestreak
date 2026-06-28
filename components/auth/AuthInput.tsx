"use client";

interface AuthInputProps {
  label: string;
  type: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  placeholder?: string;
}

export function AuthInput({
  label,
  type,
  value,
  onChange,
  error,
  placeholder,
}: AuthInputProps) {
  return (
    <div className="space-y-1.5">
      <label className="font-mono text-[11px] tracking-[.08em] text-text-muted">
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={[
          "w-full bg-surface border rounded-xl px-4 py-3 text-text-primary text-sm outline-none transition-colors",
          error
            ? "border-red-500/50 focus:border-red-500/80"
            : "border-white/10 focus:border-gold/50",
        ].join(" ")}
      />
      {error && (
        <p className="font-mono text-[11px] text-red-400">{error}</p>
      )}
    </div>
  );
}
