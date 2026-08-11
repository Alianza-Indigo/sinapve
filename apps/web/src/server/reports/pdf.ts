import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

// EP-14 / 8.5: render PDF de un informe. La narrativa proviene de metricas
// certificadas y solo se publica tras aprobacion humana; los borradores llevan
// marca de agua de estado para no confundirlos con informes aprobados.

export type ReportPdfInput = {
  title: string;
  reportType: string;
  status: string;
  narrative: string;
  generatedAt: string;
};

function wrapText(text: string, maxChars: number): string[] {
  const words = text.replace(/\s+/g, " ").trim().split(" ");
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    if ((current + " " + word).trim().length > maxChars) {
      if (current) lines.push(current.trim());
      current = word;
    } else {
      current = `${current} ${word}`;
    }
  }
  if (current.trim()) lines.push(current.trim());
  return lines;
}

export async function renderReportPdf(input: ReportPdfInput): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

  let page = pdf.addPage([595.28, 841.89]); // A4
  const margin = 56;
  let y = 785;
  const indigo = rgb(0.2, 0.13, 0.55);
  const ink = rgb(0.12, 0.13, 0.19);

  page.drawText("SINAPVE", { x: margin, y, size: 12, font: bold, color: indigo });
  y -= 30;
  for (const line of wrapText(input.title, 46)) {
    page.drawText(line, { x: margin, y, size: 20, font: bold, color: ink });
    y -= 26;
  }
  y -= 6;
  page.drawText(`Tipo: ${input.reportType}  ·  Estado: ${input.status}  ·  Generado: ${input.generatedAt}`, {
    x: margin,
    y,
    size: 9,
    font,
    color: rgb(0.39, 0.4, 0.48)
  });
  y -= 24;

  if (input.status !== "aprobado") {
    page.drawText("BORRADOR — PENDIENTE DE APROBACION HUMANA", { x: margin, y, size: 11, font: bold, color: rgb(0.79, 0.21, 0.24) });
    y -= 24;
  }

  for (const line of wrapText(input.narrative, 92)) {
    if (y < margin + 20) {
      page = pdf.addPage([595.28, 841.89]);
      y = 785;
    }
    page.drawText(line, { x: margin, y, size: 11, font, color: ink });
    y -= 16;
  }

  return pdf.save();
}
