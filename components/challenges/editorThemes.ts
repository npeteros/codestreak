import type { Extension } from "@uiw/react-codemirror";
import { atomone, dracula, githubDark } from "@uiw/codemirror-themes-all";

export type EditorThemeKey = "default" | "atomone" | "dracula" | "githubDark";

export const EDITOR_THEME_OPTIONS: { key: EditorThemeKey; label: string }[] = [
  { key: "default", label: "Codestreak" },
  { key: "atomone", label: "One Dark" },
  { key: "dracula", label: "Dracula" },
  { key: "githubDark", label: "GitHub Dark" },
];

export function isEditorThemeKey(value: string): value is EditorThemeKey {
  return EDITOR_THEME_OPTIONS.some((option) => option.key === value);
}

export function editorThemeExtension(key: EditorThemeKey): Extension | undefined {
  switch (key) {
    case "atomone":
      return atomone;
    case "dracula":
      return dracula;
    case "githubDark":
      return githubDark;
    case "default":
      return undefined;
  }
}
