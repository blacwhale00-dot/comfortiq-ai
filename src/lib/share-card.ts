// Renders the shareable Guzzler Score card as a PNG on a canvas — no server, no
// image service, no external request. Same idea as the GOLD report PDF
// (supabase/functions/send-report/pdf.ts): the values come from the engine, this
// module only lays them out, and the palette mirrors the app's teal/amber.
//
// The card carries exactly what `ShareableScore` allows — score, grade, tier —
// so it can't leak anything the share text wouldn't (see share-score.ts).

import type { ShareableScore } from "./share-score";
import type { GuzzlerTier } from "@/components/quiz/guzzler-tiers";

// 1200 × 630 is the Open Graph / X summary_large_image ratio, so the same file
// works as a download, as a native-share attachment, and as an OG asset.
export const CARD_WIDTH = 1200;
export const CARD_HEIGHT = 630;

const WHITE = "#ffffff";
const TEAL = "#0d7377";
const MUTED = "rgba(255,255,255,0.72)";

// Accent per tier. Mirrors TIER_PRESENTATION's intent (teal → amber → red) in
// the raw hex canvas needs; the thresholds themselves stay in the engine.
const TIER_ACCENT: Record<GuzzlerTier, string> = {
  Mild: "#22a06b",
  Moderate: "#f4a261",
  High: "#e07b39",
  Severe: "#dc3d3d",
};

const TIER_CAPTION: Record<GuzzlerTier, string> = {
  Mild: "Running efficiently",
  Moderate: "Real savings on the table",
  High: "Significant waste detected",
  Severe: "Bleeding energy every month",
};

const DISPLAY = '"Plus Jakarta Sans", system-ui, sans-serif';

/** Filename used for both the download and the native-share attachment. */
export const CARD_FILENAME = "guzzler-score.png";

/**
 * Draw the card and hand back a PNG blob.
 *
 * Returns null when there's no usable 2D context — jsdom under vitest, or a
 * browser with canvas disabled. Callers hide the download/share-image affordance
 * rather than surfacing an error: the card is a bonus on top of the text share,
 * never the thing that makes sharing work.
 */
export async function renderScoreCard(result: ShareableScore): Promise<Blob | null> {
  if (typeof document === "undefined") return null;

  const canvas = document.createElement("canvas");
  canvas.width = CARD_WIDTH;
  canvas.height = CARD_HEIGHT;

  // getContext doesn't just return null when 2D is unavailable — jsdom throws
  // outright, and a hardened browser can too. Treat both the same way.
  let ctx: CanvasRenderingContext2D | null = null;
  try {
    ctx = canvas.getContext("2d");
  } catch {
    return null;
  }
  if (!ctx) return null;

  // Wait for the webfont so the card doesn't render in the fallback face on a
  // cold load. Best-effort — never block the share on it.
  try {
    await document.fonts?.ready;
  } catch {
    // Font loading API unavailable; the fallback stack still renders.
  }

  const score = Math.max(0, Math.min(100, Math.round(result.score)));
  const accent = TIER_ACCENT[result.tier];

  // Background — teal field with a soft radial lift behind the score.
  ctx.fillStyle = TEAL;
  ctx.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT);
  const glow = ctx.createRadialGradient(360, 300, 20, 360, 300, 420);
  glow.addColorStop(0, "rgba(255,255,255,0.18)");
  glow.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT);

  // Score dial on the right — the same ring the reveal screen shows, so a shared
  // card reads as the product rather than as generic text on a colour.
  drawDial(ctx, 940, 300, 148, score, accent);

  // Eyebrow
  ctx.fillStyle = MUTED;
  ctx.font = `600 26px ${DISPLAY}`;
  ctx.letterSpacing = "8px";
  ctx.fillText("THE GUZZLER SCORE", 80, 118);
  ctx.letterSpacing = "0px";

  // Score + denominator
  ctx.fillStyle = WHITE;
  ctx.font = `800 220px ${DISPLAY}`;
  const scoreText = String(score);
  ctx.fillText(scoreText, 76, 360);
  const scoreWidth = ctx.measureText(scoreText).width;

  ctx.fillStyle = MUTED;
  ctx.font = `600 56px ${DISPLAY}`;
  ctx.fillText("/100", 92 + scoreWidth, 360);

  // Grade pill
  const gradeLabel = `GRADE ${result.grade}`;
  ctx.font = `800 34px ${DISPLAY}`;
  const pillWidth = ctx.measureText(gradeLabel).width + 56;
  roundedRect(ctx, 80, 404, pillWidth, 68, 34);
  ctx.fillStyle = accent;
  ctx.fill();
  ctx.fillStyle = WHITE;
  ctx.fillText(gradeLabel, 108, 448);

  // Tier headline + caption
  ctx.fillStyle = WHITE;
  ctx.font = `800 52px ${DISPLAY}`;
  ctx.fillText(`${result.tier} Guzzler`, 80 + pillWidth + 36, 440);
  ctx.fillStyle = MUTED;
  ctx.font = `500 30px ${DISPLAY}`;
  ctx.fillText(TIER_CAPTION[result.tier], 80 + pillWidth + 38, 480);

  // Footer rule + wordmark
  ctx.fillStyle = "rgba(255,255,255,0.2)";
  ctx.fillRect(80, 540, CARD_WIDTH - 160, 2);
  ctx.fillStyle = WHITE;
  ctx.font = `700 30px ${DISPLAY}`;
  ctx.fillText("GuzzlerScore", 80, 590);
  ctx.fillStyle = MUTED;
  ctx.font = `500 26px ${DISPLAY}`;
  const cta = "Know your score before you get a quote";
  ctx.fillText(cta, CARD_WIDTH - 80 - ctx.measureText(cta).width, 590);

  return await new Promise<Blob | null>((resolve) => {
    canvas.toBlob((blob) => resolve(blob), "image/png");
  });
}

/** Track + progress ring, drawn from 12 o'clock like the on-screen gauge. */
function drawDial(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
  score: number,
  accent: string,
) {
  const START = -Math.PI / 2;
  ctx.save();
  ctx.lineWidth = 26;
  ctx.lineCap = "round";

  ctx.strokeStyle = "rgba(255,255,255,0.16)";
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.stroke();

  if (score > 0) {
    ctx.strokeStyle = accent;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, START, START + (score / 100) * Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
}

function roundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + width, y, x + width, y + height, radius);
  ctx.arcTo(x + width, y + height, x, y + height, radius);
  ctx.arcTo(x, y + height, x, y, radius);
  ctx.arcTo(x, y, x + width, y, radius);
  ctx.closePath();
}
