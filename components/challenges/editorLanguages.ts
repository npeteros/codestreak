export type EditorLanguageKey =
  | "python"
  | "javascript"
  | "typescript"
  | "java"
  | "c"
  | "go"
  | "rust";

export const EDITOR_LANGUAGE_OPTIONS: { key: EditorLanguageKey; label: string }[] = [
  { key: "python", label: "Python 3" },
  { key: "javascript", label: "JavaScript" },
  { key: "typescript", label: "TypeScript" },
  { key: "java", label: "Java" },
  { key: "c", label: "C" },
  { key: "go", label: "Go" },
  { key: "rust", label: "Rust" },
];

export function isEditorLanguageKey(value: string): value is EditorLanguageKey {
  return EDITOR_LANGUAGE_OPTIONS.some((option) => option.key === value);
}

// Course/challenge `languageTag` values aren't guaranteed to match one of our
// supported keys exactly (case, whitespace, or an unsupported language) — this
// mirrors the instructor form's existing `languageMeta()` fallback-to-Python
// pattern so the picker always starts on a valid, selectable option.
export function normalizeLanguageTag(languageTag?: string): EditorLanguageKey {
  const key = languageTag?.trim().toLowerCase();
  return key && isEditorLanguageKey(key) ? key : "python";
}
