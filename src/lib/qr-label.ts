import QRCode from "qrcode";

import { fullName, type Contact } from "@/lib/vcard";

/** Which lines appear under the QR code. */
export type ShowOptions = {
  showName: boolean;
  showPhone: boolean;
  showPosition: boolean;
  showUnit: boolean;
  showDepartment: boolean;
};
export type ShowOption = keyof ShowOptions;

export const defaultShowOptions: ShowOptions = {
  showName: true,
  showPhone: true,
  showPosition: true,
  showUnit: true,
  showDepartment: true,
};

/** A line of text shown under the QR code; `primary` is the bold headline. */
export type Caption = { key: string; text: string; primary?: boolean };

/** Lines under the QR code, shared by the preview, the printout and the PNGs. */
export function buildCaptions(c: Contact, show: ShowOptions): Caption[] {
  return [
    { key: "name", text: fullName(c), show: show.showName, primary: true },
    { key: "phone", text: c.phone, show: show.showPhone },
    { key: "position", text: c.position.trim(), show: show.showPosition },
    { key: "unit", text: c.unit.trim(), show: show.showUnit },
    { key: "department", text: c.department.trim(), show: show.showDepartment },
  ]
    .filter((l) => l.show && l.text)
    .map(({ key, text, primary }) => ({ key, text, primary }));
}

/** "Mohd Nor Solahuddin" → "Mohd_Nor_Solahuddin", safe for any file system. */
export function fileBaseName(name: string) {
  return (name.trim() || "contact").replace(/[^\w-]+/g, "_").replace(/^_+|_+$/g, "") || "contact";
}

/** Save a blob as a file through a temporary link. */
export function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const QR_SIZE = 1024;
const PAD = 48;
const LINE_H = 80;

/** Render the QR code plus its caption lines as a PNG, the same for single and bulk downloads. */
export async function renderLabelPng(vcard: string, captions: Caption[]): Promise<Blob> {
  const qr = document.createElement("canvas");
  await QRCode.toCanvas(qr, vcard, { errorCorrectionLevel: "M", margin: 2, width: QR_SIZE });

  const out = document.createElement("canvas");
  out.width = qr.width + PAD * 2;
  out.height = qr.height + PAD * 2 + (captions.length ? captions.length * LINE_H + 16 : 0);
  const ctx = out.getContext("2d")!;
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, out.width, out.height);
  ctx.drawImage(qr, PAD, PAD);
  ctx.fillStyle = "#111";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  captions.forEach((c, i) => {
    ctx.font = c.primary ? "600 64px system-ui, sans-serif" : "48px system-ui, sans-serif";
    ctx.fillText(c.text, out.width / 2, PAD + qr.height + 16 + LINE_H * i + LINE_H / 2, out.width - PAD * 2);
  });

  return new Promise((resolve, reject) =>
    out.toBlob((b) => (b ? resolve(b) : reject(new Error("Could not create PNG"))), "image/png"),
  );
}
