import { Button, Text } from "@react-email/components";
import { EmailLayout, emailButton, emailText } from "@/emails/components/EmailLayout";

export function ProjectCreatedEmail({
  studentName,
  courseName,
  projectName,
  projectDescription,
  ctaUrl,
}: {
  studentName: string;
  courseName: string;
  projectName: string;
  projectDescription: string;
  ctaUrl: string;
}) {
  return (
    <EmailLayout
      previewText={`New project: ${projectName}`}
      heading="A new project was created for you"
      courseName={courseName}
    >
      <Text style={emailText}>Hi {studentName},</Text>
      <Text style={emailText}>
        Your instructor created <strong>{projectName}</strong> in {courseName}.
      </Text>
      {projectDescription && <Text style={emailText}>{projectDescription}</Text>}
      <Button href={ctaUrl} style={emailButton}>
        View project
      </Button>
    </EmailLayout>
  );
}

ProjectCreatedEmail.PreviewProps = {
  studentName: "Alex",
  courseName: "Intro to Python",
  projectName: "Weather Dashboard",
  projectDescription: "Build a small CLI that fetches and displays a 5-day forecast.",
  ctaUrl: "https://codestreak.app",
} satisfies Parameters<typeof ProjectCreatedEmail>[0];

export default ProjectCreatedEmail;
