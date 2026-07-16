import { Button, Text } from "react-email";
import { EmailLayout, emailButton, emailText } from "@/emails/components/EmailLayout";

export function NudgeEmail({
  studentName,
  courseName,
  instructorName,
  ctaUrl,
}: {
  studentName: string;
  courseName: string;
  instructorName: string;
  ctaUrl: string;
}) {
  return (
    <EmailLayout
      previewText={`${instructorName} wants to check in on your progress`}
      heading="A quick nudge from your instructor"
      courseName={courseName}
    >
      <Text style={emailText}>Hi {studentName},</Text>
      <Text style={emailText}>
        {instructorName} noticed you&apos;ve been quiet in {courseName} lately and wanted to check
        in. Jump back in whenever you&apos;re ready — every streak restarts with one day.
      </Text>
      <Button href={ctaUrl} style={emailButton}>
        Go to dashboard
      </Button>
    </EmailLayout>
  );
}

NudgeEmail.PreviewProps = {
  studentName: "Alex",
  courseName: "Intro to Python",
  instructorName: "Dr. Rivera",
  ctaUrl: "https://codestreak.app",
} satisfies Parameters<typeof NudgeEmail>[0];

export default NudgeEmail;
