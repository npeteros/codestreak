import QRCode from "qrcode";

// Isolates the third-party QR rendering library the same way lib/services/openai/
// isolates the OpenAI SDK — callers pass a URL, get back inline SVG markup.
export async function generateQrCodeSvg(url: string): Promise<string> {
  return QRCode.toString(url, {
    type: "svg",
    margin: 0,
    color: { dark: "#0B0B0D", light: "#00000000" },
  });
}
