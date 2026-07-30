import { Button, Text } from "react-email";
import { EmailLayout, emailButton, emailText } from "@/emails/components/EmailLayout";

export function PracticeChallengeCreatedEmail({
  studentName,
  courseName,
  challengeTitle,
  difficulty,
  topicTag,
  ctaUrl,
}: {
  studentName: string;
  courseName: string;
  challengeTitle: string;
  difficulty: "EASY" | "MEDIUM" | "HARD";
  topicTag: string;
  ctaUrl: string;
}) {
  return (
    <EmailLayout
      previewText={`New in Practice: ${challengeTitle}`}
      heading="A new challenge is in Practice"
      courseName={courseName}
    >
      <Text style={emailText}>Hi {studentName},</Text>
      <Text style={emailText}>
        <strong>{challengeTitle}</strong> ({difficulty.toLowerCase()} · {topicTag}) was just added
        to Practice in {courseName}. Take it on anytime — no deadline, and you can retry it as
        many times as you like.
      </Text>
      <Button href={ctaUrl} style={emailButton}>
        Open Practice
      </Button>
    </EmailLayout>
  );
}

PracticeChallengeCreatedEmail.PreviewProps = {
  studentName: "Alex",
  courseName: "Intro to Python",
  challengeTitle: "Palindrome Checker",
  difficulty: "MEDIUM",
  topicTag: "strings",
  ctaUrl: "https://codestreak.app",
} satisfies Parameters<typeof PracticeChallengeCreatedEmail>[0];

export default PracticeChallengeCreatedEmail;
