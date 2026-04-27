/**
 * Single source of truth for risk-index colour coding.
 *
 * Scale (lower = healthier, higher = worse):
 *   1.0 – 3.9  → green
 *   4.0 – 6.9  → amber
 *   7.0 – 10.0 → red/pink
 *   null/undef → muted grey ("no data")
 *
 * Used by:
 *  - main Risk Index display in dimension headers
 *  - subdimension strip cards
 *  - risk-factor group header score badges
 */

export type ScoreInput = number | null | undefined;

// Brand palette — matches teal/amber/pink used throughout the product.
//   teal  #0EA5A0  → hsl(178 84% 35%)
//   amber #D97706  → hsl(28 92% 44%)
//   pink  #E8446A  → hsl(348 78% 59%)
//   grey  #9CA3AF  → hsl(218 11% 65%)
const GREEN_TEXT = "text-[hsl(178_84%_35%)]";
const AMBER_TEXT = "text-[hsl(28_92%_44%)]";
const RED_TEXT = "text-[hsl(348_78%_59%)]";
const MUTED_TEXT = "text-[hsl(218_11%_65%)]";

const GREEN_HSL = "hsl(178 84% 35%)";
const AMBER_HSL = "hsl(28 92% 44%)";
const RED_HSL = "hsl(348 78% 59%)";
const MUTED_HSL = "hsl(218 11% 65%)";

const GREEN_BADGE = "bg-[hsl(178_84%_35%/0.15)] text-[hsl(178_84%_28%)]";
const AMBER_BADGE = "bg-[hsl(28_92%_44%/0.15)] text-[hsl(28_92%_38%)]";
const RED_BADGE = "bg-[hsl(348_78%_59%/0.15)] text-[hsl(348_78%_45%)]";
const MUTED_BADGE = "bg-[hsl(218_11%_65%/0.15)] text-[hsl(218_11%_45%)]";

export type ScoreTone = "green" | "amber" | "red" | "muted";

export function scoreTone(score: ScoreInput): ScoreTone {
  if (score == null || Number.isNaN(Number(score))) return "muted";
  const n = Number(score);
  if (n < 4) return "green";
  if (n < 7) return "amber";
  return "red";
}

/** Tailwind text-color class for a numeric score. */
export function scoreColorClass(score: ScoreInput): string {
  switch (scoreTone(score)) {
    case "green": return GREEN_TEXT;
    case "amber": return AMBER_TEXT;
    case "red": return RED_TEXT;
    default: return MUTED_TEXT;
  }
}

/** Raw HSL colour for borders/strokes. */
export function scoreBorderColor(score: ScoreInput): string {
  switch (scoreTone(score)) {
    case "green": return GREEN_HSL;
    case "amber": return AMBER_HSL;
    case "red": return RED_HSL;
    default: return MUTED_HSL;
  }
}

/** Tinted background + text combo for pill/badge style score chips. */
export function scoreBadgeClass(score: ScoreInput): string {
  switch (scoreTone(score)) {
    case "green": return GREEN_BADGE;
    case "amber": return AMBER_BADGE;
    case "red": return RED_BADGE;
    default: return MUTED_BADGE;
  }
}

/** Format a score for display, returning "—" when missing. */
export function formatScore(score: ScoreInput, digits = 1): string {
  if (score == null || Number.isNaN(Number(score))) return "—";
  return Number(score).toFixed(digits);
}
