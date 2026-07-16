import type { ReactElement } from "react";
import { render } from "@react-email/render";
import nodemailer from "nodemailer";
import { getMailer } from "@/lib/services/email/client";

export async function sendEmail({
  to,
  subject,
  react,
}: {
  to: string;
  subject: string;
  react: ReactElement;
}): Promise<void> {
  const html = await render(react);
  const { transporter, from } = await getMailer();

  const info = await transporter.sendMail({ from, to, subject, html });

  const previewUrl = nodemailer.getTestMessageUrl(info);
  if (previewUrl) console.log(`[email] preview (${to}): ${previewUrl}`);
}
