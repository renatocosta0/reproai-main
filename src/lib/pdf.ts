// Minimal, dependency-free PDF generator for clinician reports. Produces a valid
// single-page PDF from real data passed in by the caller. No content is
// fabricated here; the caller supplies only persisted values.

import { ProtocolSuggestion } from "@/lib/protocols";

interface ReportData {
  coupleId: string;
  coupleNames?: string;
  probability: number;
  modelVersion: string;
  createdAt: string;
  protocols: ProtocolSuggestion[];
}

function escapePdfText(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

export function buildReportPdf(data: ReportData): Buffer {
  const coupleDisplay = data.coupleNames
    ? `${data.coupleNames} (${data.coupleId})`
    : `Couple ${data.coupleId}`;

  const lines: string[] = [
    "ReproAI clinician report",
    "",
    `Patient(s): ${coupleDisplay}`,
    `Generated: ${new Date().toISOString()}`,
    `Prediction date: ${data.createdAt}`,
    `Model version: ${data.modelVersion}`,
    "",
    `Estimated success probability: ${data.probability}%`,
    "",
    "Suggested protocols:"
  ];
  if (data.protocols.length === 0) {
    lines.push("  (none from available data)");
  } else {
    for (const p of data.protocols) lines.push(`  - ${p.name}: ${p.rationale}`);
  }
  lines.push("");
  lines.push("This report is decision-support only and does not replace clinical judgement.");

  // Build a simple PDF content stream.
  let text = "BT /F1 12 Tf 50 780 Td 16 TL";
  for (const line of lines) {
    text += ` (${escapePdfText(line)}) Tj T*`;
  }
  text += " ET";

  const objects: string[] = [];
  objects.push("<< /Type /Catalog /Pages 2 0 R >>");
  objects.push("<< /Type /Pages /Kids [3 0 R] /Count 1 >>");
  objects.push(
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>"
  );
  objects.push(`<< /Length ${text.length} >>\nstream\n${text}\nendstream`);
  objects.push("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");

  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [];
  objects.forEach((obj, i) => {
    offsets.push(pdf.length);
    pdf += `${i + 1} 0 obj\n${obj}\nendobj\n`;
  });
  const xrefStart = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const off of offsets) {
    pdf += `${off.toString().padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;

  return Buffer.from(pdf, "binary");
}
