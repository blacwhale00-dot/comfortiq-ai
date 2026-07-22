// Renders the personalized GOLD Guzzler Score PDF with pdf-lib — pure JS, no
// browser, no external render service. Every value here comes from the scoring
// engine's persisted reveal payload (see src/lib/guzzler-reveal.ts); this file
// only lays them out. The category "chart" is drawn as severity-colored bars.

import { PDFDocument, StandardFonts, rgb, type PDFFont } from "https://esm.sh/pdf-lib@1.17.1";

export interface ReportCategory {
  label: string;
  score: number; // 0–100 severity
  grade: string;
}

export interface ReportModel {
  name: string;
  score: number; // 0–100
  grade: string; // A+ … F
  tier: string; // Mild | Moderate | High | Severe
  monthlyWaste: number; // dollars
  categories: ReportCategory[];
  topDrivers: string[];
  auditUrl: string;
  dateStr: string;
}

// Brand palette (mirrors the app's teal/amber).
const TEAL = rgb(0.051, 0.451, 0.467);
const TEAL_SOFT = rgb(0.925, 0.969, 0.969);
const AMBER = rgb(0.957, 0.635, 0.38);
const INK = rgb(0.11, 0.13, 0.16);
const MUTED = rgb(0.45, 0.48, 0.52);
const TRACK = rgb(0.9, 0.91, 0.93);
const WHITE = rgb(1, 1, 1);

// Severity color for a 0–100 value (higher = more waste = hotter).
function severityColor(v: number) {
  if (v >= 80) return rgb(0.86, 0.24, 0.24);
  if (v >= 60) return rgb(0.9, 0.45, 0.2);
  if (v >= 35) return AMBER;
  return rgb(0.2, 0.65, 0.45);
}

// pdf-lib StandardFonts use WinAnsi (CP1252) and cannot encode emoji or other
// characters above code point 255 — strip them so a homeowner's name (or any
// dynamic text) can never crash the render.
function winAnsiSafe(s: string): string {
  return [...String(s)].filter((c) => c.charCodeAt(0) <= 255).join("");
}

export async function generateReportPdf(model: ReportModel): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([612, 792]); // US Letter
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);

  const W = 612;
  const M = 54; // left/right margin
  const text = (
    s: string,
    x: number,
    y: number,
    size: number,
    f: PDFFont = font,
    color = INK,
  ) => page.drawText(winAnsiSafe(s), { x, y, size, font: f, color });

  const textRight = (
    s: string,
    xRight: number,
    y: number,
    size: number,
    f: PDFFont,
    color: ReturnType<typeof rgb>,
  ) => {
    const safe = winAnsiSafe(s);
    text(safe, xRight - f.widthOfTextAtSize(safe, size), y, size, f, color);
  };

  // ── Header band ────────────────────────────────────────────────
  page.drawRectangle({ x: 0, y: 696, width: W, height: 96, color: TEAL });
  text("ComfortIQ", M, 748, 22, bold, WHITE);
  text("G U Z Z L E R   S C O R E   R E P O R T", M, 726, 9, font, WHITE);
  textRight(model.dateStr, W - M, 726, 9, font, WHITE);

  // ── Prepared for ───────────────────────────────────────────────
  text("PREPARED FOR", M, 668, 8, bold, MUTED);
  text(model.name, M, 648, 16, bold, INK);

  // ── Score + grade + waste ──────────────────────────────────────
  text("YOUR GUZZLER SCORE", M, 612, 9, bold, MUTED);
  const scoreStr = String(model.score);
  text(scoreStr, M, 566, 44, bold, TEAL);
  const scoreW = bold.widthOfTextAtSize(scoreStr, 44);
  text("/100", M + scoreW + 6, 570, 14, font, MUTED);

  // Grade badge
  const badgeX = M + scoreW + 70;
  page.drawCircle({ x: badgeX, y: 584, size: 28, color: AMBER });
  const gradeW = bold.widthOfTextAtSize(model.grade, 22);
  text(model.grade, badgeX - gradeW / 2, 576, 22, bold, WHITE);
  text(`${model.tier} guzzler`, badgeX + 40, 588, 12, bold, INK);
  text("SEVERITY TIER", badgeX + 40, 574, 8, font, MUTED);

  // Monthly-waste callout (right)
  page.drawRectangle({
    x: 372,
    y: 548,
    width: W - M - 372,
    height: 76,
    color: TEAL_SOFT,
    borderColor: TEAL,
    borderWidth: 1,
  });
  text("EST. MONTHLY WASTE", 388, 600, 8, bold, MUTED);
  const wasteStr = `$${model.monthlyWaste}`;
  text(wasteStr, 388, 566, 28, bold, TEAL);
  text("/mo", 388 + bold.widthOfTextAtSize(wasteStr, 28) + 4, 570, 11, font, MUTED);

  // ── Category breakdown chart ───────────────────────────────────
  let y = 516;
  text("CATEGORY BREAKDOWN", M, y, 11, bold, INK);
  y -= 26;
  const barX = 236;
  const barW = 286;
  if (model.categories.length === 0) {
    text("Breakdown unavailable for this report.", M, y, 10, font, MUTED);
    y -= 26;
  } else {
    for (const cat of model.categories) {
      const v = Math.max(0, Math.min(100, cat.score));
      text(cat.label, M, y, 10, font, INK);
      page.drawRectangle({ x: barX, y: y - 2, width: barW, height: 10, color: TRACK });
      page.drawRectangle({
        x: barX,
        y: y - 2,
        width: Math.max(2, (barW * v) / 100),
        height: 10,
        color: severityColor(v),
      });
      textRight(cat.grade, W - M, y, 10, bold, INK);
      y -= 26;
    }
  }

  // ── Top waste drivers ──────────────────────────────────────────
  y -= 8;
  text("TOP WASTE DRIVERS", M, y, 11, bold, INK);
  y -= 22;
  if (model.topDrivers.length === 0) {
    text("No major waste drivers stood out — nice work keeping things in shape.", M, y, 10, font, MUTED);
    y -= 20;
  } else {
    model.topDrivers.slice(0, 3).forEach((d, i) => {
      text(`${i + 1}.  ${d}`, M, y, 10, font, INK);
      y -= 20;
    });
  }

  // ── What happens next ──────────────────────────────────────────
  y -= 14;
  text("WHAT HAPPENS NEXT", M, y, 11, bold, INK);
  y -= 22;
  for (const line of [
    "Your $900 Home Efficiency Discount is reserved.",
    "Book a free 15-minute audit with a real HVAC expert to review these results.",
    "No pressure, no obligation — just a straight answer on repair vs. replace.",
  ]) {
    text(line, M, y, 10, font, INK);
    y -= 18;
  }
  text(`Book here: ${model.auditUrl}`, M, y - 2, 10, bold, TEAL);

  // ── Footer / Cora sign-off ─────────────────────────────────────
  page.drawRectangle({ x: M, y: 92, width: W - M * 2, height: 1, color: TRACK });
  text("- Cora, your ComfortIQ guide", M, 72, 11, bold, INK);
  text("ComfortIQ  |  comfortiq.ai", M, 56, 8, font, MUTED);

  return await doc.save();
}
