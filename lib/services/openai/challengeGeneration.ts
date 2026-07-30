import { getOpenAIClient } from "./client";

export type AiChallengeDraft = {
  id: string;
  title: string;
  description: string;
  difficulty: string;
  starter: string;
  topicTag: string;
};

export async function generateChallengeDrafts(
  lang: string,
  topic: string
): Promise<AiChallengeDraft[]> {
  const openai = getOpenAIClient();

  const prompt = `Generate 5 coding challenge ideas for a ${lang} course based on this topic or syllabus excerpt:
${topic}

Return a JSON object with a "challenges" array. Each challenge has:
- title: short memorable name (3-5 words)
- description: 1-2 sentence problem description including constraints and expected output
- difficulty: one of "EASY", "MEDIUM", or "HARD"
- starter: 4-6 lines of ${lang} starter code with a function signature and a pass statement, properly formatted with a real line break between each statement and each brace — never crammed onto one line
- topicTag: the major concept(s) this challenge tests, in Title Case, under 60 characters (e.g. "Recursion", "Hash Maps", "Sliding Window & Two Pointers") — not the input text above

Return ONLY valid JSON. No markdown, no code fences.`;

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.75,
    max_tokens: 1500,
    response_format: { type: "json_object" },
  });

  const raw = completion.choices[0]?.message?.content ?? "{}";
  const parsed = JSON.parse(raw) as { challenges?: unknown[] };
  const challenges = (
    Array.isArray(parsed) ? parsed : (parsed.challenges ?? [])
  ).slice(0, 5) as AiChallengeDraft[];

  return challenges.map((c, i) => ({
    id: `ai-${Date.now()}-${i}`,
    title: String((c as Record<string, unknown>).title ?? "Challenge"),
    description: unescapeLiteralNewlines(
      String((c as Record<string, unknown>).description ?? "")
    ),
    difficulty: String((c as Record<string, unknown>).difficulty ?? "MEDIUM"),
    starter: expandInlineBraces(
      unescapeLiteralNewlines(String((c as Record<string, unknown>).starter ?? ""))
    ),
    topicTag: toTitleCase(
      String((c as Record<string, unknown>).topicTag ?? "").slice(0, 60)
    ),
  }));
}

// gpt-4o-mini's json_object mode occasionally double-escapes newlines inside
// string fields, leaving literal "\n"/"\t"/"\r" characters in the parsed
// output instead of real whitespace.
function unescapeLiteralNewlines(text: string): string {
  return text.replace(/\\n/g, "\n").replace(/\\t/g, "\t").replace(/\\r/g, "\r");
}

// The model sometimes still crams a block body onto one line (e.g.
// `typedef struct { int *data; int size; } DynamicArray;`) despite the
// prompt asking for line breaks. Expand any non-nested `{ ... }` block
// that contains statements onto its own indented lines.
function expandInlineBraces(code: string): string {
  return code.replace(/\{([^{}]*)\}/g, (match, inner: string) => {
    const trimmed = inner.trim();
    if (!trimmed || (!trimmed.includes(";") && !trimmed.includes("\n"))) return match;
    const stmts = trimmed
      .split(/[;\n]/)
      .map((s) => s.trim())
      .filter(Boolean)
      .map((s) => `    ${s};`);
    return stmts.length ? `{\n${stmts.join("\n")}\n}` : match;
  });
}

// Model compliance with "Title Case" in the prompt is inconsistent, so
// enforce it rather than trust it.
function toTitleCase(text: string): string {
  return text.replace(
    /\w\S*/g,
    (word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
  );
}
