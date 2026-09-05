import { EDITOR_LANGUAGE_OPTIONS, type EditorLanguageKey } from "@/components/challenges/editorLanguages";

interface Props {
  value: EditorLanguageKey;
  onChange: (key: EditorLanguageKey) => void;
}

export function LanguagePicker({ value, onChange }: Props) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as EditorLanguageKey)}
      aria-label="Editor language"
      className="font-mono text-[11px] text-text-muted bg-transparent border border-white/10 rounded-[6px] px-2 py-[3px] outline-none cursor-pointer [color-scheme:dark] hover:text-text-secondary transition-colors"
    >
      {EDITOR_LANGUAGE_OPTIONS.map((option) => (
        <option key={option.key} value={option.key} className="bg-[#131316] text-text-primary">
          {option.label}
        </option>
      ))}
    </select>
  );
}
