"use client";

import { useState, useTransition } from "react";
import {
  createInstructorChallenge,
  generateAiChallenges,
} from "@/lib/actions/instructor";
import type { AiChallengeDraft } from "@/lib/services/openai/challengeGeneration";
import { useToast } from "@/lib/hooks/useToast";

type Mode = "manual" | "ai";
type Difficulty = "EASY" | "MEDIUM" | "HARD";

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

interface Props {
  courseId: string;
  defaultDate: string;
  languageTag: string;
}

export function ChallengesClient({ courseId, defaultDate, languageTag }: Props) {
  const lang = languageMeta(languageTag);
  const [mode, setMode] = useState<Mode>("manual");
  const [difficulty, setDifficulty] = useState<Difficulty>("MEDIUM");
  const [prompt, setPrompt] = useState("");
  const [starterCode, setStarterCode] = useState(lang.starter);
  const [topicTag, setTopicTag] = useState("");
  const [schedDate, setSchedDate] = useState(defaultDate);
  const [aiTopic, setAiTopic] = useState("");
  const [aiDrafts, setAiDrafts] = useState<(AiChallengeDraft & { selected: boolean })[]>([]);
  const [generated, setGenerated] = useState(false);
  const { toast, showToast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [isGenerating, setIsGenerating] = useState(false);
  const [editingDraft, setEditingDraft] = useState<{
    id: string;
    title: string;
    description: string;
    difficulty: Difficulty;
    starter: string;
    schedDate: string;
  } | null>(null);
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  function toggleDraft(id: string) {
    setAiDrafts((ds) =>
      ds.map((d) => (d.id === id ? { ...d, selected: !d.selected } : d))
    );
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

  function handleSchedule() {
    if (mode === "manual") {
      if (!prompt.trim()) { showToast("Add a problem prompt first"); return; }
      startTransition(async () => {
        const res = await createInstructorChallenge(courseId, {
          title: topicTag || "Challenge",
          description: prompt,
          difficulty,
          topicTag,
          starterCode,
          scheduledFor: schedDate,
          isDraft: false,
        });
        if (res.success) {
          showToast(`Challenge scheduled for ${schedDate}`);
          setPrompt("");
          setTopicTag("");
        } else {
          showToast("Failed to schedule — try again");
        }
      });
    } else {
      const selected = aiDrafts.filter((d) => d.selected);
      if (selected.length === 0) { showToast("Select challenges to schedule"); return; }
      startTransition(async () => {
        await Promise.all(
          selected.map((d) =>
            createInstructorChallenge(courseId, {
              title: d.title,
              description: d.description,
              difficulty: (d.difficulty as Difficulty) || "MEDIUM",
              topicTag: aiTopic.slice(0, 40),
              starterCode: d.starter,
              scheduledFor: schedDate,
              isDraft: false,
            })
          )
        );
        showToast(
          `Scheduled ${selected.length} challenge${selected.length > 1 ? "s" : ""}`
        );
        setAiDrafts((ds) => ds.map((d) => ({ ...d, selected: false })));
      });
    }
  }

  function openEditDraft(c: AiChallengeDraft) {
    setEditingDraft({
      id: c.id,
      title: c.title,
      description: c.description,
      difficulty: ((c.difficulty as Difficulty) || "MEDIUM"),
      starter: c.starter,
      schedDate,
    });
  }

  async function handleSaveEditedSchedule() {
    if (!editingDraft) return;
    if (!editingDraft.title.trim()) { showToast("Add a title first"); return; }
    if (!editingDraft.description.trim()) { showToast("Add a description first"); return; }
    setIsSavingEdit(true);
    const res = await createInstructorChallenge(courseId, {
      title: editingDraft.title,
      description: editingDraft.description,
      difficulty: editingDraft.difficulty,
      topicTag: aiTopic.slice(0, 40),
      starterCode: editingDraft.starter,
      scheduledFor: editingDraft.schedDate,
      isDraft: false,
    });
    setIsSavingEdit(false);
    if (res.success) {
      showToast(`"${editingDraft.title}" scheduled for ${editingDraft.schedDate}`);
      setAiDrafts((ds) => ds.filter((d) => d.id !== editingDraft.id));
      setEditingDraft(null);
    } else {
      showToast("Failed to schedule — try again");
    }
  }

  function handleSaveDraft() {
    if (mode === "manual") {
      if (!prompt.trim()) { showToast("Add a problem prompt first"); return; }
      startTransition(async () => {
        await createInstructorChallenge(courseId, {
          title: topicTag || "Draft",
          description: prompt,
          difficulty,
          topicTag,
          starterCode,
          scheduledFor: schedDate,
          isDraft: true,
        });
        showToast("Saved as draft");
      });
    } else {
      showToast("Select and schedule to save AI challenges");
    }
  }

  const selectedCount = aiDrafts.filter((d) => d.selected).length;
  const bottomStatus =
    mode === "manual"
      ? schedDate
        ? `Scheduled for ${schedDate}`
        : "No date set"
      : generated
        ? selectedCount > 0
          ? `${selectedCount} selected`
          : "Select challenges to schedule"
        : "Generate challenges first";

  const scheduleLabel =
    mode === "manual"
      ? isPending
        ? "Scheduling…"
        : "Schedule"
      : isPending
        ? "Scheduling…"
        : selectedCount > 0
          ? `Schedule ${selectedCount}`
          : "Schedule";

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

  const diffBtn = (d: Difficulty) => (
    <button
      key={d}
      onClick={() => setDifficulty(d)}
      className={[
        "px-3.5 py-1.5 rounded-[8px] font-mono text-[12px] border transition-colors cursor-pointer",
        difficulty === d
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
        <h2 className="font-serif font-normal text-[1.7rem] text-text-primary">
          Create a challenge
        </h2>
        <p className="text-sm text-text-muted">
          Write it yourself, or let AI draft a set from your syllabus.
        </p>
      </div>

      {/* Mode toggle */}
      <div className="inline-flex gap-1.5 bg-[#101013] border border-white/[0.07] rounded-[11px] p-[5px] self-start">
        {modeBtn("manual", "Manual")}
        {modeBtn("ai", "AI Generate")}
      </div>

      {/* MANUAL form */}
      {mode === "manual" && (
        <div className="flex gap-4 flex-wrap items-stretch">
          {/* Left: prompt + meta */}
          <div className="flex-[1.2_1_340px] min-w-[300px] bg-surface border border-white/[0.07] rounded-[15px] p-[22px] flex flex-col gap-[18px]">
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
                {(["EASY", "MEDIUM", "HARD"] as Difficulty[]).map(diffBtn)}
              </div>
            </div>
            <div className="flex gap-3.5 flex-wrap">
              <div className="flex-1 min-w-[180px] flex flex-col gap-2">
                <label className="font-mono text-[11px] tracking-[.08em] text-text-muted">
                  TOPIC / WEEK TAG
                </label>
                <input
                  value={topicTag}
                  onChange={(e) => setTopicTag(e.target.value)}
                  placeholder="Week 7 · Stacks"
                  className="bg-code-bg text-text-primary border border-white/10 rounded-[10px] px-[13px] py-[11px] font-mono text-[13px] outline-none placeholder:text-[#5f5d57]"
                />
              </div>
              <div className="flex-1 min-w-[160px] flex flex-col gap-2">
                <label className="font-mono text-[11px] tracking-[.08em] text-text-muted">
                  SCHEDULE DATE
                </label>
                <input
                  type="date"
                  value={schedDate}
                  onChange={(e) => setSchedDate(e.target.value)}
                  className="bg-code-bg text-text-primary border border-white/10 rounded-[10px] px-[13px] py-[10px] font-mono text-[13px] outline-none [color-scheme:dark]"
                />
              </div>
            </div>
          </div>

          {/* Right: code editor */}
          <div className="flex-[1_1_300px] min-w-[280px] flex flex-col border border-white/[0.08] rounded-[15px] overflow-hidden bg-code-bg">
            <div className="flex items-center justify-between px-[15px] py-[11px] bg-[#131316] border-b border-white/[0.07]">
              <div className="flex items-center gap-2.5">
                <span className="w-[9px] h-[9px] rounded-full bg-gold inline-block" />
                <span className="font-mono text-[12.5px] text-[#D7D5CE]">
                  starter.{lang.ext}
                </span>
              </div>
              <span className="font-mono text-[11px] text-text-muted border border-white/10 rounded-[6px] px-2 py-[3px]">
                {lang.label}
              </span>
            </div>
            <textarea
              value={starterCode}
              onChange={(e) => setStarterCode(e.target.value)}
              spellCheck={false}
              className="flex-1 min-h-[240px] w-full resize-y border-none outline-none bg-code-bg text-text-primary font-mono text-[13px] leading-[1.75] px-[18px] py-[16px]"
            />
          </div>
        </div>
      )}

      {/* AI form */}
      {mode === "ai" && (
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
                  {aiDrafts.length} DRAFTS · SELECT TO SCHEDULE
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
                      <span
                        className={[
                          "font-mono text-[11px] tracking-[.06em] px-2 py-0.5 rounded-[5px]",
                          c.difficulty === "EASY"
                            ? "text-emerald-400 bg-emerald-400/10"
                            : c.difficulty === "HARD"
                              ? "text-risk bg-risk/10"
                              : "text-gold bg-gold/10",
                        ].join(" ")}
                      >
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
                      Edit &amp; schedule
                    </button>
                  </div>
                ))}
              </div>

              {/* Date picker for AI mode */}
              <div className="flex items-center gap-3 flex-wrap">
                <label className="font-mono text-[11px] tracking-[.08em] text-text-muted">
                  SCHEDULE DATE
                </label>
                <input
                  type="date"
                  value={schedDate}
                  onChange={(e) => setSchedDate(e.target.value)}
                  className="bg-code-bg text-text-primary border border-white/10 rounded-[10px] px-[13px] py-[9px] font-mono text-[13px] outline-none [color-scheme:dark]"
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Sticky bottom bar */}
      <div className="sticky bottom-0 flex items-center justify-between gap-3.5 flex-wrap bg-[#101013] border border-white/[0.08] rounded-[13px] px-[18px] py-[14px]">
        <span className="font-mono text-[12px] text-text-muted">{bottomStatus}</span>
        <div className="flex gap-2.5">
          <button
            onClick={handleSaveDraft}
            disabled={isPending}
            className="bg-transparent text-[#D7D5CE] border border-white/[0.14] rounded-[9px] px-[18px] py-[10px] font-sans text-[13.5px] font-semibold cursor-pointer hover:border-white/25 disabled:opacity-50"
          >
            Save as draft
          </button>
          <button
            onClick={handleSchedule}
            disabled={isPending}
            className="bg-gold text-bg border-none rounded-[9px] px-5 py-[10px] font-sans text-[13.5px] font-semibold cursor-pointer hover:brightness-105 transition-all disabled:opacity-60"
          >
            {scheduleLabel}
          </button>
        </div>
      </div>

      {editingDraft && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-4"
          style={{ background: "rgba(8,8,10,0.62)" }}
          onClick={() => !isSavingEdit && setEditingDraft(null)}
        >
          <div
            className="w-full max-w-[560px] max-h-[86vh] overflow-y-auto bg-surface border border-white/[0.08] rounded-[16px] p-[24px] flex flex-col gap-[18px]"
            style={{ animation: "csFade .18s ease" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex flex-col gap-1">
              <h3 className="font-serif font-normal text-[1.35rem] text-text-primary">
                Edit &amp; schedule
              </h3>
              <p className="text-sm text-text-muted">
                Fine-tune this AI draft before it goes out to students.
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

            <div className="flex flex-col gap-2">
              <label className="font-mono text-[11px] tracking-[.08em] text-text-muted">
                DIFFICULTY
              </label>
              <div className="flex gap-[7px] flex-wrap">
                {(["EASY", "MEDIUM", "HARD"] as Difficulty[]).map((d) => (
                  <button
                    key={d}
                    onClick={() =>
                      setEditingDraft((cur) => (cur ? { ...cur, difficulty: d } : cur))
                    }
                    className={[
                      "px-3.5 py-1.5 rounded-[8px] font-mono text-[12px] border transition-colors cursor-pointer",
                      editingDraft.difficulty === d
                        ? "bg-gold text-bg border-gold"
                        : "bg-transparent text-text-muted border-white/10 hover:border-white/20",
                    ].join(" ")}
                  >
                    {DIFF_LABELS[d]}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label className="font-mono text-[11px] tracking-[.08em] text-text-muted">
                STARTER CODE
              </label>
              <textarea
                value={editingDraft.starter}
                onChange={(e) =>
                  setEditingDraft((d) => (d ? { ...d, starter: e.target.value } : d))
                }
                spellCheck={false}
                className="min-h-[140px] resize-y bg-code-bg text-text-primary border border-white/10 rounded-[10px] px-[15px] py-[13px] font-mono text-[13px] leading-[1.65] outline-none"
              />
            </div>

            <div className="flex flex-col gap-2 max-w-[220px]">
              <label className="font-mono text-[11px] tracking-[.08em] text-text-muted">
                SCHEDULE DATE
              </label>
              <input
                type="date"
                value={editingDraft.schedDate}
                onChange={(e) =>
                  setEditingDraft((d) => (d ? { ...d, schedDate: e.target.value } : d))
                }
                className="bg-code-bg text-text-primary border border-white/10 rounded-[10px] px-[13px] py-[10px] font-mono text-[13px] outline-none [color-scheme:dark]"
              />
            </div>

            <div className="flex justify-end gap-2.5 pt-1">
              <button
                onClick={() => setEditingDraft(null)}
                disabled={isSavingEdit}
                className="bg-transparent text-[#D7D5CE] border border-white/[0.14] rounded-[9px] px-[18px] py-[10px] font-sans text-[13.5px] font-semibold cursor-pointer hover:border-white/25 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEditedSchedule}
                disabled={isSavingEdit}
                className="bg-gold text-bg border-none rounded-[9px] px-5 py-[10px] font-sans text-[13.5px] font-semibold cursor-pointer hover:brightness-105 transition-all disabled:opacity-60"
              >
                {isSavingEdit ? "Scheduling…" : "Save & schedule"}
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
