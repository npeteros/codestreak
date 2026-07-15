import { getOpenAIClient } from "./client";

export type AiChallengeDraft = {
  id: string;
  title: string;
  description: string;
  difficulty: string;
  starter: string;
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
- starter: 4-6 lines of ${lang} starter code with a function signature and a pass statement

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
    starter: unescapeLiteralNewlines(
      String((c as Record<string, unknown>).starter ?? "")
    ),
  }));
}

// gpt-4o-mini's json_object mode occasionally double-escapes newlines inside
// string fields, leaving literal "\n"/"\t"/"\r" characters in the parsed
// output instead of real whitespace.
function unescapeLiteralNewlines(text: string): string {
  return text.replace(/\\n/g, "\n").replace(/\\t/g, "\t").replace(/\\r/g, "\r");
}
