import nodemailer, { type Transporter } from "nodemailer";

export type Mailer = { transporter: Transporter; from: string };

let mailer: Mailer | null = null;
let mailerPromise: Promise<Mailer> | null = null;

// Falls back to a zero-config Ethereal test account when Gmail credentials
// aren't set, so local dev works without any SMTP setup.
async function createMailer(): Promise<Mailer> {
  const { GMAIL_USER, GMAIL_APP_PASSWORD } = process.env;

  if (GMAIL_USER && GMAIL_APP_PASSWORD) {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user: GMAIL_USER, pass: GMAIL_APP_PASSWORD },
    });
    return { transporter, from: `CodeStreak <${GMAIL_USER}>` };
  }

  const testAccount = await nodemailer.createTestAccount();
  console.warn(
    "[email] GMAIL_USER/GMAIL_APP_PASSWORD not set — using Ethereal test account. " +
      "Sent emails will not reach real inboxes; check the console for preview URLs."
  );
  const transporter = nodemailer.createTransport({
    host: testAccount.smtp.host,
    port: testAccount.smtp.port,
    secure: testAccount.smtp.secure,
    auth: { user: testAccount.user, pass: testAccount.pass },
  });
  return { transporter, from: `CodeStreak <${testAccount.user}>` };
}

export async function getMailer(): Promise<Mailer> {
  if (mailer) return mailer;
  if (!mailerPromise) mailerPromise = createMailer();
  mailer = await mailerPromise;
  return mailer;
}
