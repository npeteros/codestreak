import { Button, Text } from "@react-email/components";
import { EmailLayout, emailButton, emailText } from "@/emails/components/EmailLayout";

export function ChallengeCreatedEmail({
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
      previewText={`New challenge: ${challengeTitle}`}
      heading="A new daily challenge is up"
      courseName={courseName}
    >
      <Text style={emailText}>Hi {studentName},</Text>
      <Text style={emailText}>
        <strong>{challengeTitle}</strong> ({difficulty.toLowerCase()} · {topicTag}) is ready for
        you in {courseName}. Solve it today to keep your streak alive.
      </Text>
      <Button href={ctaUrl} style={emailButton}>
        Open today&apos;s challenge
      </Button>
    </EmailLayout>
  );
}

ChallengeCreatedEmail.PreviewProps = {
  studentName: "Alex",
  courseName: "Intro to Python",
  challengeTitle: "Palindrome Checker",
  difficulty: "MEDIUM",
  topicTag: "strings",
  ctaUrl: "https://codestreak.app",
} satisfies Parameters<typeof ChallengeCreatedEmail>[0];

export default ChallengeCreatedEmail;
