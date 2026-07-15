import { getOpenAIClient } from "./client";

// Keeps token usage/cost bounded and avoids truncating mid-multibyte-char.
const MAX_CODE_CHARS = 3000;

export type JournalContext =
  | {
      triggerType: "CHALLENGE";
      title: string;
      difficulty: string;
      topicTag: string;
      code: string;
    }
  | { triggerType: "CHECKIN"; note: string }
  | { triggerType: "SPRINT_CARD"; taskTitle: string; projectName: string };

function buildUserPrompt(context: JournalContext): string {
  switch (context.triggerType) {
    case "CHALLENGE": {
      const code =
        context.code.length > MAX_CODE_CHARS
          ? context.code.slice(0, MAX_CODE_CHARS) + "\n… (truncated)"
          : context.code;
      return (
        `Write a short journal reflection for a student who just submitted their solution to the ` +
        `"${context.title}" coding challenge (difficulty: ${context.difficulty}, topic: ${context.topicTag}). ` +
        `Comment specifically on their code style and approach — naming, structure, clarity, any notable choices. ` +
        `Here is their submission:\n\n${code}`
      );
    }
    case "CHECKIN":
      return (
        `Write a short journal reflection responding to a student's daily check-in note. ` +
        `Engage with what they actually wrote — don't just acknowledge that they checked in.\n\n` +
        `Their note: "${context.note}"`
      );
    case "SPRINT_CARD":
      return (
        `Write a short journal reflection for a student who just completed the sprint task ` +
        `"${context.taskTitle}" on the project "${context.projectName}".`
      );
  }
}

export async function generateJournalReflection(
  context: JournalContext
): Promise<string | null> {
  const openai = getOpenAIClient();

  const completion = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "system",
        content:
          "You are a thoughtful coding coach writing brief journal reflections for a student. " +
          "Write in second person, encouraging but specific — no generic affirmations. " +
          "Focus on craft and the habit of showing up. Keep it to 2–3 sentences.",
      },
      {
        role: "user",
        content: buildUserPrompt(context),
      },
    ],
    max_tokens: 120,
    temperature: 0.85,
  });

  const content = completion.choices[0]?.message?.content?.trim();
  return content || null;
}
