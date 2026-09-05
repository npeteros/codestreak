"use client";

import CodeMirror, { EditorView, keymap } from "@uiw/react-codemirror";
import { EditorState, type StateCommand } from "@codemirror/state";
import { indentLess, indentMore } from "@codemirror/commands";
import { javascript } from "@codemirror/lang-javascript";
import { python } from "@codemirror/lang-python";
import { java } from "@codemirror/lang-java";
import { cpp } from "@codemirror/lang-cpp";
import { StreamLanguage, indentUnit } from "@codemirror/language";
import { go } from "@codemirror/legacy-modes/mode/go";
import { rust } from "@codemirror/legacy-modes/mode/rust";
import { editorThemeExtension, type EditorThemeKey } from "@/components/challenges/editorThemes";
import { normalizeLanguageTag } from "@/components/challenges/editorLanguages";

const TAB_SIZE = 4;
const TAB_INDENT = " ".repeat(TAB_SIZE);

// CodeMirror's own Tab binding always re-indents the whole current line from
// its start, ignoring cursor position. Override it so Tab with no selection
// inserts spaces at the cursor instead — matching typical editor behavior —
// and only falls back to indenting the line(s) when text is selected.
const insertIndent: StateCommand = ({ state, dispatch }) => {
  if (state.selection.ranges.some((range) => !range.empty)) {
    return indentMore({ state, dispatch });
  }
  dispatch(state.update(state.replaceSelection(TAB_INDENT), { scrollIntoView: true, userEvent: "input" }));
  return true;
};

const tabKeymap = keymap.of([{ key: "Tab", run: insertIndent, shift: indentLess }]);

interface Props {
  value: string;
  onChange: (value: string) => void;
  languageTag?: string;
  themeKey?: EditorThemeKey;
  /** Fixed height (e.g. "140px") for standalone use outside the flex editor shell. */
  height?: string;
}

function languageExtension(languageTag?: string) {
  switch (normalizeLanguageTag(languageTag)) {
    case "python":
      return python();
    case "javascript":
      return javascript();
    case "typescript":
      return javascript({ typescript: true });
    case "java":
      return java();
    case "c":
      return cpp();
    case "go":
      return StreamLanguage.define(go);
    case "rust":
      return StreamLanguage.define(rust);
  }
}

const editorTheme = EditorView.theme(
  {
    "&": {
      backgroundColor: "#0E0E11",
      color: "#EDEBE4",
      height: "100%",
      fontSize: "13px",
    },
    ".cm-content": {
      fontFamily: "var(--font-mono, monospace)",
      lineHeight: "1.75",
      padding: "16px 18px",
      caretColor: "#F5C842",
    },
    ".cm-scroller": {
      fontFamily: "var(--font-mono, monospace)",
    },
    "&.cm-focused": {
      outline: "none",
    },
    ".cm-gutters": {
      backgroundColor: "#0E0E11",
      color: "#5f5d57",
      border: "none",
    },
    ".cm-activeLine": {
      backgroundColor: "rgba(255, 255, 255, 0.03)",
    },
    ".cm-activeLineGutter": {
      backgroundColor: "rgba(255, 255, 255, 0.03)",
    },
    "&.cm-focused .cm-selectionBackground, ::selection": {
      backgroundColor: "rgba(245, 200, 66, 0.18)",
    },
    ".cm-cursor": {
      borderLeftColor: "#F5C842",
    },
  },
  { dark: true }
);

export function CodeEditor({ value, onChange, languageTag, themeKey = "default", height }: Props) {
  const lang = languageExtension(languageTag);
  const theme = editorThemeExtension(themeKey) ?? editorTheme;

  return (
    <CodeMirror
      value={value}
      onChange={onChange}
      theme={theme}
      height={height}
      indentWithTab={false}
      extensions={[
        EditorState.tabSize.of(TAB_SIZE),
        indentUnit.of(TAB_INDENT),
        tabKeymap,
        ...(lang ? [lang] : []),
      ]}
      basicSetup={{
        lineNumbers: true,
        foldGutter: false,
        highlightActiveLine: true,
        autocompletion: false,
        closeBrackets: true,
        bracketMatching: true,
      }}
      className={height ? "w-full overflow-auto" : "flex-1 min-h-[230px] w-full overflow-auto"}
      style={height ? undefined : { height: "100%" }}
    />
  );
}
