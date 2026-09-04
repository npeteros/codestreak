"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import type { HintChatMessage, HintStyle } from "@/lib/types";
import { sendHintChatMessage } from "@/lib/actions/hints";

const Markdown = dynamic(() => import("@/components/ui/Markdown"));

interface Props {
  courseId: string;
  challengeId: string;
  draftCode?: string;
}

const STYLE_LABEL: Record<HintStyle, string> = {
  socratic: "Guide me",
  direct: "Just tell me",
};

const STYLE_HINT: Record<HintStyle, string> = {
  socratic: "Stuck? Ask a question and get a nudge in the right direction — not the answer.",
  direct: "Stuck? Ask a question and get a direct explanation of the approach.",
};

// Ephemeral hint chat — no history is persisted; it resets whenever the
// student reloads/reopens the problem. Tutoring style (Socratic nudges vs.
// direct answers) is a per-session toggle, not persisted either.
export function HintChat({ courseId, challengeId, draftCode }: Props) {
  const [messages, setMessages] = useState<HintChatMessage[]>([]);
  const [style, setStyle] = useState<HintStyle>("socratic");
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSend() {
    const text = input.trim();
    if (!text || sending) return;

    const nextHistory: HintChatMessage[] = [...messages, { role: "user", content: text }];
    setMessages(nextHistory);
    setInput("");
    setSending(true);
    setError(null);

    const result = await sendHintChatMessage(courseId, challengeId, nextHistory, style, draftCode);
    if (result.success) {
      setMessages([...nextHistory, { role: "assistant", content: result.reply }]);
    } else {
      setError("Couldn't reach the tutor. Try again.");
    }
    setSending(false);
  }

  return (
    <div className="flex-[1_1_300px] min-w-[280px] flex flex-col bg-surface border border-white/[0.07] rounded-[15px] overflow-hidden">
      <div className="flex items-center justify-between gap-[9px] px-[18px] py-[13px] border-b border-white/[0.07] flex-wrap">
        <div className="flex items-center gap-[9px]">
          <span className="w-[9px] h-[9px] rounded-full bg-gold inline-block" />
          <span className="font-mono text-[12.5px] text-[#D7D5CE]">Ask for a hint</span>
        </div>
        <div className="flex items-center gap-[4px] bg-white/[0.04] rounded-full p-[3px]">
          {(["socratic", "direct"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStyle(s)}
              className={`font-mono text-[10.5px] rounded-full px-[10px] py-[4px] cursor-pointer transition-colors border-none ${
                style === s ? "bg-gold text-bg" : "bg-transparent text-text-faint hover:text-text-muted"
              }`}
            >
              {STYLE_LABEL[s]}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-[10px] p-[16px] max-h-72 overflow-y-auto">
        {messages.length === 0 ? (
          <p className="text-[13px] text-text-muted m-0">{STYLE_HINT[style]}</p>
        ) : (
          messages.map((m, i) => (
            <div
              key={i}
              className={`text-[13.5px] leading-[1.6] rounded-[10px] px-[12px] py-[8px] max-w-[90%] ${
                m.role === "user"
                  ? "self-end bg-gold/10 text-[#EDEBE4]"
                  : "self-start bg-white/[0.04] text-[#D7D5CE] markdown-body"
              }`}
            >
              {m.role === "assistant" ? <Markdown>{m.content}</Markdown> : m.content}
            </div>
          ))
        )}
        {sending && <p className="text-[12.5px] text-text-faint m-0">Thinking…</p>}
      </div>

      <div className="flex items-center gap-[8px] px-[14px] py-[12px] border-t border-white/[0.07]">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          placeholder={error ?? "Type your question…"}
          className="flex-1 bg-transparent border border-white/[0.1] rounded-[9px] px-[12px] py-[8px] text-[13px] text-[#EDEBE4] outline-none placeholder:text-text-faint"
        />
        <button
          onClick={handleSend}
          disabled={sending || !input.trim()}
          className="bg-gold text-bg border-none rounded-[9px] px-4 py-[9px] font-sans text-[13px] font-semibold cursor-pointer hover:brightness-110 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
        >
          Send
        </button>
      </div>
    </div>
  );
}
