import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";

export type PdfTable = { title: string; headers: string[]; rows: string[][]; total?: string[] };

export type MonthlySummary = {
  shopName: string;
  periodLabel: string;
  branchLabel: string;
  generatedLabel: string;
  accent: [number, number, number]; // 0–255
  kpis: Array<[string, string]>;
  tables: PdfTable[];
};

// Las fuentes estándar del PDF solo admiten Latin-1: se sustituye lo que no se pueda escribir.
const safe = (s: string) => s.replace(/[^\x20-\x7E\u00A0-\u00FF\u2013\u2014\u2018\u2019\u201C\u201D\u2022\u2026]/g, "?");

const roundedRect = (w: number, h: number, r: number) =>
  `M ${r} 0 H ${w - r} Q ${w} 0 ${w} ${r} V ${h - r} Q ${w} ${h} ${w - r} ${h} H ${r} Q 0 ${h} 0 ${h - r} V ${r} Q 0 0 ${r} 0 Z`;

/** Mismo estilo que el panel: fondo negro, tarjetas grises redondeadas, cifras en el color de acento. */
export async function buildMonthlyPdf(d: MonthlySummary): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const W = 595.28, H = 841.89, M = 44;

  const black = rgb(0, 0, 0);
  const card = rgb(0.125, 0.125, 0.125); // #202020
  const rule = rgb(0.192, 0.192, 0.192); // #313131
  const white = rgb(1, 1, 1);
  const gray = rgb(0.59, 0.59, 0.59); // #969696
  const gold = rgb(d.accent[0] / 255, d.accent[1] / 255, d.accent[2] / 255);

  let page!: PDFPage;
  let y = 0;
  const newPage = () => {
    page = doc.addPage([W, H]);
    page.drawRectangle({ x: 0, y: 0, width: W, height: H, color: black });
    y = H - M;
  };
  newPage();

  const text = (t: string, x: number, size: number, f: PDFFont = font, color = white) => page.drawText(safe(t), { x, y, size, font: f, color });
  const right = (t: string, xr: number, size: number, f: PDFFont = font, color = white) => {
    const s = safe(t);
    page.drawText(s, { x: xr - f.widthOfTextAtSize(s, size), y, size, font: f, color });
  };
  const ensure = (needed: number) => { if (y - needed < M + 24) newPage(); };

  // Encabezado
  text(d.shopName.toUpperCase(), M, 10, bold, gray); y -= 34;
  text("RESUMEN MENSUAL", M, 30, bold); y -= 24;
  page.drawRectangle({ x: M, y: y + 2, width: 56, height: 3, color: gold }); y -= 22;
  text(`${d.periodLabel}  ·  ${d.branchLabel}`, M, 13, font, white); y -= 16;
  text(`Generado el ${d.generatedLabel}`, M, 8.5, font, gray); y -= 30;

  // Los cuatro totales, en tarjetas
  const gap = 14;
  const cw = (W - 2 * M - gap) / 2, ch = 78;
  for (let i = 0; i < d.kpis.length; i += 2) {
    ensure(ch + gap);
    for (let j = 0; j < 2; j++) {
      const k = d.kpis[i + j];
      if (!k) continue;
      const x = M + j * (cw + gap);
      page.drawSvgPath(roundedRect(cw, ch, 14), { x, y, color: card });
      page.drawText(safe(k[0].toUpperCase()), { x: x + 18, y: y - 26, size: 8.5, font: bold, color: gray });
      page.drawText(safe(k[1]), { x: x + 18, y: y - 56, size: 22, font: bold, color: gold });
    }
    y -= ch + gap;
  }
  y -= 14;

  // Tablas
  for (const t of d.tables) {
    ensure(70);
    text(t.title.toUpperCase(), M, 11, bold, white); y -= 12;
    const n = t.headers.length;
    const firstW = 150;
    const colW = (W - 2 * M - firstW) / (n - 1);
    const xr = (i: number) => M + firstW + colW * i; // borde derecho de la columna i (i >= 1)

    const row = (cells: string[], f: PDFFont, color: ReturnType<typeof rgb>, size: number) => {
      text(cells[0], M, size, f, color);
      for (let i = 1; i < n; i++) right(cells[i] ?? "", xr(i), size, f, color);
    };

    row(t.headers.map((h) => h.toUpperCase()), bold, gray, 7.5); y -= 8;
    page.drawRectangle({ x: M, y, width: W - 2 * M, height: 0.6, color: rule }); y -= 14;
    if (t.rows.length === 0) { text("Sin ventas en este periodo.", M, 10, font, gray); y -= 18; }
    for (const r of t.rows) {
      ensure(18);
      row(r, font, white, 9.5); y -= 6;
      page.drawRectangle({ x: M, y, width: W - 2 * M, height: 0.4, color: rule }); y -= 12;
    }
    if (t.total) { ensure(20); row(t.total, bold, gold, 10); y -= 18; }
    y -= 16;
  }

  // Pie con número de página
  const pages = doc.getPages();
  pages.forEach((p, i) => {
    const label = safe(`${d.shopName}  ·  Página ${i + 1} de ${pages.length}`);
    p.drawText(label, { x: W / 2 - font.widthOfTextAtSize(label, 8) / 2, y: 26, size: 8, font, color: gray });
  });
  return doc.save();
}
