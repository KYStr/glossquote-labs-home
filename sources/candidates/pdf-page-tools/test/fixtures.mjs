// Synthetic fixture PDFs for the engine tests (SPEC section 7).
// Everything is generated in memory by this committed script — never
// real documents. Each page carries a distinct solid colour and its
// label as drawn text ("A-1" ... "A-5"), so outputs can be verified by
// re-opening them and reading the labels back in order.

import { PDFDocument, StandardFonts, degrees, rgb } from "../public/js/vendor/pdf-lib.esm.min.js";

const PALETTE = [
  [0.85, 0.25, 0.25],
  [0.25, 0.7, 0.3],
  [0.25, 0.4, 0.9],
  [0.9, 0.75, 0.2],
  [0.6, 0.3, 0.8],
];

export async function makeLabelledPdf(prefix, count, rotations = {}) {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  for (let i = 1; i <= count; i += 1) {
    const page = doc.addPage([200, 200]);
    const [r, g, b] = PALETTE[(i - 1) % PALETTE.length];
    page.drawRectangle({ x: 0, y: 0, width: 200, height: 200, color: rgb(r, g, b) });
    page.drawText(`${prefix}-${i}`, { x: 20, y: 100, size: 24, font });
    if (rotations[i]) page.setRotation(degrees(rotations[i]));
  }
  return doc.save();
}

export function makeDocA() {
  return makeLabelledPdf("A", 5);
}

export function makeDocB() {
  return makeLabelledPdf("B", 3);
}

export function makePreRotatedPdf() {
  // Page 2 already carries a 90-degree rotation (SPEC section 7).
  return makeLabelledPdf("R", 2, { 2: 90 });
}

// A minimal but well-formed PDF whose trailer carries a Standard
// encryption dictionary. It is not a real encrypted document (the
// strings are filler); it exists so the engine's encrypted-input path
// — the parser reporting encryption — is exercised deterministically.
export function makeEncryptedPdf() {
  const objects = [];
  objects[1] = "<< /Type /Catalog /Pages 2 0 R >>";
  objects[2] = "<< /Type /Pages /Kids [3 0 R] /Count 1 >>";
  objects[3] = "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 200 200] >>";
  objects[4] = "<< /Filter /Standard /V 1 /R 2 /O (xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx) /U (yyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyy) /P -44 >>";
  let out = "%PDF-1.4\n";
  const offsets = [0];
  for (let n = 1; n <= 4; n += 1) {
    offsets[n] = out.length;
    out += `${n} 0 obj\n${objects[n]}\nendobj\n`;
  }
  const xrefPos = out.length;
  out += "xref\n0 5\n0000000000 65535 f \n";
  for (let n = 1; n <= 4; n += 1) {
    out += `${String(offsets[n]).padStart(10, "0")} 00000 n \n`;
  }
  out += `trailer\n<< /Size 5 /Root 1 0 R /Encrypt 4 0 R >>\nstartxref\n${xrefPos}\n%%EOF\n`;
  return new TextEncoder().encode(out);
}

// A truncated valid document: header intact, body cut mid-stream.
export function makeCorruptPdf(validBytes) {
  return validBytes.slice(0, 300);
}
