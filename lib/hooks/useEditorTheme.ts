"use client";

import { useSyncExternalStore } from "react";
import { type EditorThemeKey, isEditorThemeKey } from "@/components/challenges/editorThemes";

const STORAGE_KEY = "codestreak:editor-theme";
const listeners = new Set<() => void>();

function subscribe(callback: () => void) {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

function getSnapshot(): EditorThemeKey {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && isEditorThemeKey(stored)) return stored;
  } catch {
    // localStorage unavailable (private browsing, etc.) — stick with default.
  }
  return "default";
}

function getServerSnapshot(): EditorThemeKey {
  return "default";
}

export function useEditorTheme() {
  const themeKey = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  function setThemeKey(key: EditorThemeKey) {
    try {
      localStorage.setItem(STORAGE_KEY, key);
    } catch {
      // Best-effort persistence only.
    }
    listeners.forEach((listener) => listener());
  }

  return { themeKey, setThemeKey };
}
