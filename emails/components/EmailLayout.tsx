import {
  Body,
  Column,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Preview,
  Row,
  Section,
  Text,
} from "react-email";
import type { ReactNode } from "react";

// CodeStreak brand palette — kept in sync with app/globals.css's @theme block.
const colors = {
  gold: "#F5C842",
  bg: "#0B0B0D",
  surface: "#141417",
  textPrimary: "#F3F1EA",
  textSecondary: "#B7B5AE",
  textMuted: "#8C8A83",
  textFaint: "#6b6964",
  border: "rgba(255, 255, 255, 0.08)",
};

// Same app-icon asset used for the PWA manifest/favicons (public/app-icon-192.png).
const APP_URL = (process.env.NEXT_PUBLIC_APP_URL ?? "https://codestreak.dcism.org").replace(/\/$/, "");
const LOGO_URL = `${APP_URL}/app-icon-192.png`;

export function EmailLayout({
  previewText,
  heading,
  courseName,
  children,
}: {
  previewText: string;
  heading: string;
  courseName: string;
  children: ReactNode;
}) {
  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={body}>
        <Container style={container}>
          <Row style={brandRow}>
            <Column style={brandLogoCell}>
              <Img src={LOGO_URL} width="28" height="28" alt="CodeStreak" style={brandLogo} />
            </Column>
            <Column>
              <Text style={brand}>CodeStreak</Text>
            </Column>
          </Row>
          <Section style={card}>
            <Text style={eyebrow}>{courseName}</Text>
            <Heading style={heading1}>{heading}</Heading>
            {children}
          </Section>
          <Hr style={hr} />
          <Text style={footer}>
            You&apos;re receiving this because you&apos;re enrolled in {courseName} on CodeStreak.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

// Shared by every template's body copy + CTA button so they stay one system.
export const emailText = {
  fontSize: "14px",
  lineHeight: "22px",
  color: colors.textSecondary,
  margin: "0 0 16px",
};

export const emailButton = {
  backgroundColor: colors.gold,
  color: colors.bg,
  fontSize: "14px",
  fontWeight: 700,
  borderRadius: "8px",
  padding: "12px 20px",
  textDecoration: "none",
  display: "inline-block",
};

const body = {
  backgroundColor: colors.bg,
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif',
  padding: "32px 0",
};

const container = {
  maxWidth: "480px",
  margin: "0 auto",
  padding: "0 16px",
};

const brandRow = {
  width: "auto",
  margin: "0 0 16px",
};

const brandLogoCell = {
  width: "32px",
};

const brandLogo = {
  borderRadius: "7px",
  display: "block",
};

const brand = {
  fontSize: "15px",
  fontWeight: 700,
  letterSpacing: "0.02em",
  color: colors.gold,
  margin: 0,
};

const card = {
  backgroundColor: colors.surface,
  borderRadius: "12px",
  padding: "32px",
  border: `1px solid ${colors.border}`,
};

const eyebrow = {
  fontSize: "13px",
  fontWeight: 600,
  color: colors.gold,
  textTransform: "uppercase" as const,
  letterSpacing: "0.04em",
  margin: "0 0 8px",
};

const heading1 = {
  fontSize: "20px",
  fontWeight: 700,
  color: colors.textPrimary,
  margin: "0 0 16px",
};

const hr = {
  borderColor: colors.border,
  margin: "24px 0",
};

const footer = {
  fontSize: "12px",
  color: colors.textFaint,
  lineHeight: "18px",
};
