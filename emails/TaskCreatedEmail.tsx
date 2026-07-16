import { Button, Text } from "@react-email/components";
import { EmailLayout, emailButton, emailText } from "@/emails/components/EmailLayout";

export function TaskCreatedEmail({
  studentName,
  courseName,
  projectName,
  taskTitle,
  dueDate,
  ctaUrl,
}: {
  studentName: string;
  courseName: string;
  projectName: string;
  taskTitle: string;
  dueDate: string | null;
  ctaUrl: string;
}) {
  return (
    <EmailLayout
      previewText={`New task: ${taskTitle}`}
      heading="A new task was added to your board"
      courseName={courseName}
    >
      <Text style={emailText}>Hi {studentName},</Text>
      <Text style={emailText}>
        Your instructor added <strong>{taskTitle}</strong> to your {projectName} board.
        {dueDate ? ` Due ${dueDate}.` : ""}
      </Text>
      <Button href={ctaUrl} style={emailButton}>
        View task
      </Button>
    </EmailLayout>
  );
}

TaskCreatedEmail.PreviewProps = {
  studentName: "Alex",
  courseName: "Intro to Python",
  projectName: "Weather Dashboard",
  taskTitle: "Wire up the OpenWeather API client",
  dueDate: "2026-07-25",
  ctaUrl: "https://codestreak.app",
} satisfies Parameters<typeof TaskCreatedEmail>[0];

export default TaskCreatedEmail;
