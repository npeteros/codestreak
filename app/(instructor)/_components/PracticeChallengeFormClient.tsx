"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  createPracticeChallenge,
  updatePracticeChallenge,
  generateAiChallenges,
  type PracticeChallengeRow,
} from "@/lib/actions/instructor";
import type { AiChallengeDraft } from "@/lib/services/openai/challengeGeneration";
import { useToast } from "@/lib/hooks/useToast";
import { CodeEditor } from "@/components/challenges/CodeEditor";
import { EditorThemePicker } from "@/components/challenges/EditorThemePicker";
import { LanguagePicker } from "@/components/challenges/LanguagePicker";
import { normalizeLanguageTag } from "@/components/challenges/editorLanguages";
import { useEditorTheme } from "@/lib/hooks/useEditorTheme";

type Mode = "manual" | "ai";
type Difficulty = "EASY" | "MEDIUM" | "HARD";

const MAX_TOPIC_TAG_LENGTH = 60;

const DIFF_LABELS: Record<Difficulty, string> = {
  EASY: "Easy",
  MEDIUM: "Medium",
  HARD: "Hard",
};

const LANGUAGE_META: Record<string, { ext: string; label: string; starter: string }> = {
  python: {
    ext: "py",
    label: "Python 3",
    starter: "def solution(s: str):\n    # starter code\n    pass\n",
  },
  javascript: {
    ext: "js",
    label: "JavaScript",
    starter: "function solution(s) {\n  // starter code\n}\n",
  },
  typescript: {
    ext: "ts",
    label: "TypeScript",
    starter: "function solution(s: string) {\n  // starter code\n}\n",
  },
  java: {
    ext: "java",
    label: "Java",
    starter:
      "class Solution {\n    static Object solution(String s) {\n        // starter code\n        return null;\n    }\n}\n",
  },
  c: {
    ext: "c",
    label: "C",
    starter: "#include <stdio.h>\n\nvoid solution(char *s) {\n    // starter code\n}\n",
  },
  go: {
    ext: "go",
    label: "Go",
    starter: "package main\n\nfunc solution(s string) {\n\t// starter code\n}\n",
  },
  rust: {
    ext: "rs",
    label: "Rust",
    starter: "fn solution(s: &str) {\n    // starter code\n}\n",
  },
};

function languageMeta(languageTag: string) {
  return LANGUAGE_META[languageTag.trim().toLowerCase()] ?? LANGUAGE_META.python;
}

function difficultyBadge(d: Difficulty) {
  return [
    "font-mono text-[11px] tracking-[.06em] px-2 py-0.5 rounded-[5px]",
    d === "EASY"
      ? "text-emerald-400 bg-emerald-400/10"
      : d === "HARD"
        ? "text-risk bg-risk/10"
        : "text-gold bg-gold/10",
  ].join(" ");
}

interface Props {
  courseId: string;
  languageTag: string;
  initialChallenge: PracticeChallengeRow | null;
}

export function PracticeChallengeFormClient({ courseId, languageTag, initialChallenge }: Props) {
  const lang = languageMeta(languageTag);
  const router = useRouter();
  const { toast, showToast } = useToast();
  const [isPending, startTransition] = useTransition();
  const isEditing = initialChallenge !== null;

  const [mode, setMode] = useState<Mode>("manual");
  const [title, setTitle] = useState(initialChallenge?.title ?? "");
  const [prompt, setPrompt] = useState(initialChallenge?.description ?? "");
  const [difficulty, setDifficulty] = useState<Difficulty>(initialChallenge?.difficulty ?? "MEDIUM");
  const [topicTag, setTopicTag] = useState(initialChallenge?.topicTag ?? "");
  const [starterCode, setStarterCode] = useState(initialChallenge?.starterCode ?? lang.starter);
  const { themeKey, setThemeKey } = useEditorTheme();
  const [language, setLanguage] = useState(() => normalizeLanguageTag(languageTag));
  const pickedLang = languageMeta(language);

  const [aiTopic, setAiTopic] = useState("");
  const [aiDrafts, setAiDrafts] = useState<(AiChallengeDraft & { selected: boolean })[]>([]);
  const [generated, setGenerated] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [editingDraft, setEditingDraft] = useState<{
    id: string;
    title: string;
    description: string;
    difficulty: Difficulty;
    starter: string;
    topicTag: string;
  } | null>(null);
  const [isSavingDraft, setIsSavingDraft] = useState(false);

  function goToList() {
    router.push(`/dashboard/instructor/${courseId}/practice`);
  }

  function saveManual(isDraft: boolean) {
    if (!title.trim()) { showToast("Add a title first"); return; }
    if (!prompt.trim()) { showToast("Add a problem prompt first"); return; }
    startTransition(async () => {
      const payload = { title, description: prompt, difficulty, topicTag, starterCode, isDraft };
      const res = isEditing
        ? await updatePracticeChallenge(courseId, initialChallenge!.id, payload)
        : await createPracticeChallenge(courseId, payload);
      if (res.success) {
        goToList();
      } else {
        showToast("Failed to save — try again");
      }
    });
  }

  function toggleDraft(id: string) {
    setAiDrafts((ds) => ds.map((d) => (d.id === id ? { ...d, selected: !d.selected } : d)));
  }

  async function handleGenerate() {
    if (!aiTopic.trim()) { showToast("Add a topic first"); return; }
    setIsGenerating(true);
    const result = await generateAiChallenges(courseId, aiTopic);
    setIsGenerating(false);
    if (!result.success) { showToast("Generation failed — try again"); return; }
    setAiDrafts(result.challenges.map((c) => ({ ...c, selected: false })));
    setGenerated(true);
  }

  function handleAddSelected() {
    const selected = aiDrafts.filter((d) => d.selected);
    if (selected.length === 0) { showToast("Select challenges to add"); return; }
    startTransition(async () => {
      await Promise.all(
        selected.map((d) =>
          createPracticeChallenge(courseId, {
            title: d.title,
            description: d.description,
            difficulty: (d.difficulty as Difficulty) || "MEDIUM",
            topicTag: d.topicTag,
            starterCode: d.starter,
            isDraft: false,
          })
        )
      );
      goToList();
    });
  }

  function openEditDraft(c: AiChallengeDraft) {
    setEditingDraft({
      id: c.id,
      title: c.title,
      description: c.description,
      difficulty: (c.difficulty as Difficulty) || "MEDIUM",
      starter: c.starter,
      topicTag: c.topicTag,
    });
  }

  async function handleSaveEditedDraft() {
    if (!editingDraft) return;
    if (!editingDraft.title.trim()) { showToast("Add a title first"); return; }
    if (!editingDraft.description.trim()) { showToast("Add a description first"); return; }
    setIsSavingDraft(true);
    const res = await createPracticeChallenge(courseId, {
      title: editingDraft.title,
      description: editingDraft.description,
      difficulty: editingDraft.difficulty,
      topicTag: editingDraft.topicTag,
      starterCode: editingDraft.starter,
      isDraft: false,
    });
    setIsSavingDraft(false);
    if (res.success) {
      goToList();
    } else {
      showToast("Failed to add — try again");
    }
  }

  const selectedCount = aiDrafts.filter((d) => d.selected).length;

  const modeBtn = (m: Mode, label: string) => (
    <button
      key={m}
      onClick={() => setMode(m)}
      className={[
        "px-4 py-2 rounded-[8px] font-sans text-[13.5px] font-semibold transition-colors cursor-pointer",
        mode === m
          ? "bg-surface text-text-primary"
          : "bg-transparent text-text-muted hover:text-text-secondary",
      ].join(" ")}
    >
      {label}
    </button>
  );

  const diffBtn = (d: Difficulty, onSelect: (d: Difficulty) => void, current: Difficulty) => (
    <button
      key={d}
      onClick={() => onSelect(d)}
      className={[
        "px-3.5 py-1.5 rounded-[8px] font-mono text-[12px] border transition-colors cursor-pointer",
        current === d
          ? "bg-gold text-bg border-gold"
          : "bg-transparent text-text-muted border-white/10 hover:border-white/20",
      ].join(" ")}
    >
      {DIFF_LABELS[d]}
    </button>
  );

  return (
    <div className="flex flex-col gap-[18px]" style={{ animation: "csFade .25s ease" }}>
      <div className="flex flex-col gap-1">
        <Link
          href={`/dashboard/instructor/${courseId}/practice`}
          className="font-mono text-[11.5px] text-text-muted hover:text-text-secondary no-underline"
        >
          ← Back to Practice
        </Link>
        <h2 className="font-serif font-normal text-[1.7rem] text-text-primary">
          {isEditing ? "Edit challenge" : "Add a challenge"}
        </h2>
        {!isEditing && (
          <p className="text-sm text-text-muted">
            Write it yourself, or let AI draft a set from your syllabus.
          </p>
        )}
        {isEditing && initialChallenge.origin === "DAILY_ARCHIVE" && (
          <p className="text-sm text-text-muted">
            Originally created via Daily Challenge — now archived into Practice.
          </p>
        )}
      </div>

      {!isEditing && (
        <div className="inline-flex gap-1.5 bg-[#101013] border border-white/[0.07] rounded-[11px] p-[5px] self-start">
          {modeBtn("manual", "Manual")}
          {modeBtn("ai", "AI Generate")}
        </div>
      )}

      {mode === "manual" && (
        <div className="flex gap-4 flex-wrap items-stretch">
          <div className="flex-[1.2_1_340px] min-w-[300px] bg-surface border border-white/[0.07] rounded-[15px] p-[22px] flex flex-col gap-[18px]">
            <div className="flex flex-col gap-2">
              <label className="font-mono text-[11px] tracking-[.08em] text-text-muted">
                TITLE
              </label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Reverse a Linked List"
                className="bg-code-bg text-text-primary border border-white/10 rounded-[10px] px-[13px] py-[11px] font-sans text-[14px] outline-none placeholder:text-[#5f5d57]"
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="font-serif text-[18px] text-text-primary">
                Problem prompt
              </label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Describe the problem students will solve. Include constraints and expected output…"
                className="min-h-[140px] resize-y bg-code-bg text-text-primary border border-white/10 rounded-[10px] px-[15px] py-[13px] font-sans text-[14px] leading-[1.65] outline-none placeholder:text-[#5f5d57]"
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="font-mono text-[11px] tracking-[.08em] text-text-muted">
                DIFFICULTY
              </label>
              <div className="flex gap-[7px] flex-wrap">
                {(["EASY", "MEDIUM", "HARD"] as Difficulty[]).map((d) =>
                  diffBtn(d, setDifficulty, difficulty)
                )}
              </div>
            </div>
            <div className="flex flex-col gap-2 max-w-[240px]">
              <label className="font-mono text-[11px] tracking-[.08em] text-text-muted">
                TOPIC TAG
              </label>
              <input
                value={topicTag}
                onChange={(e) => setTopicTag(e.target.value.slice(0, MAX_TOPIC_TAG_LENGTH))}
                maxLength={MAX_TOPIC_TAG_LENGTH}
                placeholder="Stacks"
                className="bg-code-bg text-text-primary border border-white/10 rounded-[10px] px-[13px] py-[11px] font-mono text-[13px] outline-none placeholder:text-[#5f5d57]"
              />
            </div>
          </div>

          <div className="flex-[1_1_300px] min-w-[280px] flex flex-col border border-white/[0.08] rounded-[15px] overflow-hidden bg-code-bg">
            <div className="flex items-center justify-between px-[15px] py-[11px] bg-[#131316] border-b border-white/[0.07]">
              <div className="flex items-center gap-2.5">
                <span className="w-[9px] h-[9px] rounded-full bg-gold inline-block" />
                <span className="font-mono text-[12.5px] text-[#D7D5CE]">
                  starter.{pickedLang.ext}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <LanguagePicker value={language} onChange={setLanguage} />
                <EditorThemePicker value={themeKey} onChange={setThemeKey} />
              </div>
            </div>
            <CodeEditor
              value={starterCode}
              onChange={setStarterCode}
              languageTag={language}
              themeKey={themeKey}
            />
          </div>
        </div>
      )}

      {!isEditing && mode === "ai" && (
        <div className="flex flex-col gap-4">
          <div
            className="border rounded-[15px] p-[22px] flex flex-col gap-3.5"
            style={{
              background: "linear-gradient(135deg, color-mix(in srgb,#F5C842 9%,#141417), #141417)",
              borderColor: "color-mix(in srgb,#F5C842 28%,transparent)",
            }}
          >
            <div className="flex items-center gap-2.5">
              <svg width={16} height={16} viewBox="0 0 20 20" className="text-gold">
                <path d="M11 2.4 L4.6 11 H9 L8.4 17.6 L15.4 8.6 H10.6 Z" fill="currentColor" />
              </svg>
              <span className="font-serif text-[18px] text-text-primary">
                Generate from a topic or syllabus excerpt
              </span>
            </div>
            <textarea
              value={aiTopic}
              onChange={(e) => setAiTopic(e.target.value)}
              placeholder="e.g. Week 7 covers stacks, queues, and expression parsing. Paste your syllabus section here…"
              className="min-h-[96px] resize-y bg-code-bg text-text-primary border border-white/10 rounded-[10px] px-[15px] py-[13px] font-sans text-[14px] leading-[1.6] outline-none placeholder:text-[#5f5d57]"
            />
            <button
              onClick={handleGenerate}
              disabled={isGenerating}
              className="self-start bg-gold text-bg border-none rounded-[9px] px-5 py-[11px] font-sans text-[13.5px] font-semibold cursor-pointer hover:brightness-105 transition-all disabled:opacity-60 flex items-center gap-2"
            >
              <svg width={15} height={15} viewBox="0 0 20 20">
                <path d="M11 2.4 L4.6 11 H9 L8.4 17.6 L15.4 8.6 H10.6 Z" fill="currentColor" />
              </svg>
              {isGenerating ? "Generating…" : "Generate challenges"}
            </button>
          </div>

          {generated && aiDrafts.length > 0 && (
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between gap-2.5">
                <h3 className="font-mono text-[11px] tracking-[.12em] text-text-muted">
                  {aiDrafts.length} DRAFTS · SELECT TO ADD
                </h3>
                <button
                  onClick={handleGenerate}
                  disabled={isGenerating}
                  className="bg-transparent text-text-muted border border-white/10 rounded-[8px] px-3 py-1.5 font-sans text-[12px] cursor-pointer hover:border-white/20 disabled:opacity-50"
                >
                  Regenerate
                </button>
              </div>
              <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-3.5">
                {aiDrafts.map((c) => (
                  <div
                    key={c.id}
                    onClick={() => toggleDraft(c.id)}
                    className={[
                      "flex flex-col gap-2.5 p-[18px] rounded-[14px] border cursor-pointer transition-all",
                      c.selected
                        ? "border-gold/50 bg-[color-mix(in_srgb,#F5C842_8%,#141417)]"
                        : "border-white/[0.08] bg-surface hover:border-white/20",
                    ].join(" ")}
                  >
                    <div className="flex items-start justify-between gap-2.5">
                      <span className={difficultyBadge((c.difficulty as Difficulty) || "MEDIUM")}>
                        {c.difficulty}
                      </span>
                      <span
                        className={[
                          "w-5 h-5 rounded-full border flex items-center justify-center text-[11px] font-bold flex-none transition-colors",
                          c.selected
                            ? "bg-gold border-gold text-bg"
                            : "border-white/20 text-transparent",
                        ].join(" ")}
                      >
                        ✓
                      </span>
                    </div>
                    <div className="font-serif text-[18px] text-text-primary leading-[1.2]">
                      {c.title}
                    </div>
                    <div className="text-[13px] text-text-secondary leading-[1.55]">
                      {c.description}
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openEditDraft(c);
                      }}
                      className="mt-auto self-start bg-transparent text-gold border border-gold/38 rounded-[8px] px-[13px] py-[7px] font-sans text-[12.5px] font-semibold cursor-pointer hover:bg-gold/10"
                    >
                      Edit &amp; add
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {mode === "manual" && (
        <div className="sticky bottom-0 flex items-center justify-between gap-3.5 flex-wrap bg-[#101013] border border-white/[0.08] rounded-[13px] px-[18px] py-[14px]">
          <span className="font-mono text-[12px] text-text-muted">
            {isEditing ? "Editing existing challenge" : "New challenge"}
          </span>
          <div className="flex gap-2.5">
            <Link
              href={`/dashboard/instructor/${courseId}/practice`}
              className="bg-transparent text-text-muted border border-white/[0.14] rounded-[9px] px-[18px] py-[10px] font-sans text-[13.5px] font-semibold cursor-pointer hover:border-white/25 no-underline flex items-center"
            >
              Cancel
            </Link>
            <button
              onClick={() => saveManual(true)}
              disabled={isPending}
              className="bg-transparent text-[#D7D5CE] border border-white/[0.14] rounded-[9px] px-[18px] py-[10px] font-sans text-[13.5px] font-semibold cursor-pointer hover:border-white/25 disabled:opacity-50"
            >
              Save as draft
            </button>
            <button
              onClick={() => saveManual(false)}
              disabled={isPending}
              className="bg-gold text-bg border-none rounded-[9px] px-5 py-[10px] font-sans text-[13.5px] font-semibold cursor-pointer hover:brightness-105 transition-all disabled:opacity-60"
            >
              {isPending ? "Saving…" : isEditing ? "Save & publish" : "Publish"}
            </button>
          </div>
        </div>
      )}

      {!isEditing && mode === "ai" && generated && aiDrafts.length > 0 && (
        <div className="sticky bottom-0 flex items-center justify-between gap-3.5 flex-wrap bg-[#101013] border border-white/[0.08] rounded-[13px] px-[18px] py-[14px]">
          <span className="font-mono text-[12px] text-text-muted">
            {selectedCount > 0 ? `${selectedCount} selected` : "Select challenges to add"}
          </span>
          <button
            onClick={handleAddSelected}
            disabled={isPending}
            className="bg-gold text-bg border-none rounded-[9px] px-5 py-[10px] font-sans text-[13.5px] font-semibold cursor-pointer hover:brightness-105 transition-all disabled:opacity-60"
          >
            {isPending ? "Adding…" : selectedCount > 0 ? `Add ${selectedCount}` : "Add to library"}
          </button>
        </div>
      )}

      {editingDraft && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-4"
          style={{ background: "rgba(8,8,10,0.62)" }}
          onClick={() => !isSavingDraft && setEditingDraft(null)}
        >
          <div
            className="w-full max-w-[560px] max-h-[86vh] overflow-y-auto bg-surface border border-white/[0.08] rounded-[16px] p-[24px] flex flex-col gap-[18px]"
            style={{ animation: "csFade .18s ease" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex flex-col gap-1">
              <h3 className="font-serif font-normal text-[1.35rem] text-text-primary">
                Edit &amp; add
              </h3>
              <p className="text-sm text-text-muted">
                Fine-tune this AI draft before it goes into the library.
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <label className="font-mono text-[11px] tracking-[.08em] text-text-muted">
                TITLE
              </label>
              <input
                value={editingDraft.title}
                onChange={(e) =>
                  setEditingDraft((d) => (d ? { ...d, title: e.target.value } : d))
                }
                className="bg-code-bg text-text-primary border border-white/10 rounded-[10px] px-[13px] py-[11px] font-sans text-[14px] outline-none"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="font-mono text-[11px] tracking-[.08em] text-text-muted">
                DESCRIPTION
              </label>
              <textarea
                value={editingDraft.description}
                onChange={(e) =>
                  setEditingDraft((d) => (d ? { ...d, description: e.target.value } : d))
                }
                className="min-h-[120px] resize-y bg-code-bg text-text-primary border border-white/10 rounded-[10px] px-[15px] py-[13px] font-sans text-[14px] leading-[1.6] outline-none"
              />
            </div>

            <div className="flex flex-col gap-2 max-w-[240px]">
              <label className="font-mono text-[11px] tracking-[.08em] text-text-muted">
                TOPIC TAG
              </label>
              <input
                value={editingDraft.topicTag}
                onChange={(e) =>
                  setEditingDraft((d) =>
                    d ? { ...d, topicTag: e.target.value.slice(0, MAX_TOPIC_TAG_LENGTH) } : d
                  )
                }
                maxLength={MAX_TOPIC_TAG_LENGTH}
                placeholder="Stacks"
                className="bg-code-bg text-text-primary border border-white/10 rounded-[10px] px-[13px] py-[11px] font-mono text-[13px] outline-none placeholder:text-[#5f5d57]"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="font-mono text-[11px] tracking-[.08em] text-text-muted">
                DIFFICULTY
              </label>
              <div className="flex gap-[7px] flex-wrap">
                {(["EASY", "MEDIUM", "HARD"] as Difficulty[]).map((d) =>
                  diffBtn(
                    d,
                    (nd) => setEditingDraft((cur) => (cur ? { ...cur, difficulty: nd } : cur)),
                    editingDraft.difficulty
                  )
                )}
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <label className="font-mono text-[11px] tracking-[.08em] text-text-muted">
                  STARTER CODE
                </label>
                <LanguagePicker value={language} onChange={setLanguage} />
              </div>
              <div className="border border-white/10 rounded-[10px] overflow-hidden">
                <CodeEditor
                  value={editingDraft.starter}
                  onChange={(value) =>
                    setEditingDraft((d) => (d ? { ...d, starter: value } : d))
                  }
                  languageTag={language}
                  themeKey={themeKey}
                  height="140px"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2.5 pt-1">
              <button
                onClick={() => setEditingDraft(null)}
                disabled={isSavingDraft}
                className="bg-transparent text-[#D7D5CE] border border-white/[0.14] rounded-[9px] px-[18px] py-[10px] font-sans text-[13.5px] font-semibold cursor-pointer hover:border-white/25 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEditedDraft}
                disabled={isSavingDraft}
                className="bg-gold text-bg border-none rounded-[9px] px-5 py-[10px] font-sans text-[13.5px] font-semibold cursor-pointer hover:brightness-105 transition-all disabled:opacity-60"
              >
                {isSavingDraft ? "Adding…" : "Save & add"}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div
          className="fixed bottom-7 left-1/2 z-60 bg-[#1A1A1F] border border-gold/35 rounded-[11px] px-5 py-3 flex items-center gap-2.5 shadow-2xl"
          style={{ transform: "translateX(-50%)", animation: "csToast .2s ease" }}
        >
          <span className="w-[18px] h-[18px] rounded-full bg-gold text-bg flex items-center justify-center text-[11px] font-bold flex-none">
            ✓
          </span>
          <span className="text-[13.5px] text-[#ECEAE3]">{toast}</span>
        </div>
      )}

      <style>{`
        @keyframes csFade { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:none; } }
        @keyframes csToast { from { transform:translateX(-50%) translateY(10px); opacity:0; } to { transform:translateX(-50%); opacity:1; } }
      `}</style>
    </div>
  );
}
