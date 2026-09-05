import { EDITOR_THEME_OPTIONS, type EditorThemeKey } from "@/components/challenges/editorThemes";

interface Props {
  value: EditorThemeKey;
  onChange: (key: EditorThemeKey) => void;
}

export function EditorThemePicker({ value, onChange }: Props) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as EditorThemeKey)}
      aria-label="Editor theme"
      className="font-mono text-[11px] text-text-muted bg-transparent border border-white/10 rounded-[6px] px-2 py-[3px] outline-none cursor-pointer [color-scheme:dark] hover:text-text-secondary transition-colors"
    >
      {EDITOR_THEME_OPTIONS.map((option) => (
        <option key={option.key} value={option.key} className="bg-[#131316] text-text-primary">
          {option.label}
        </option>
      ))}
    </select>
  );
}
