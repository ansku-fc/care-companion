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

const GREEN_TEXT = "text-[hsl(137_25%_39%)]";
const AMBER_TEXT = "text-[hsl(28_63%_44%)]";
const RED_TEXT = "text-[hsl(0_57%_39%)]";
const MUTED_TEXT = "text-muted-foreground";

const GREEN_HSL = "hsl(137 25% 39%)";
const AMBER_HSL = "hsl(28 63% 44%)";
const RED_HSL = "hsl(0 57% 39%)";

const GREEN_BADGE = "bg-[hsl(137_25%_39%/0.15)] text-[hsl(137_25%_30%)]";
const AMBER_BADGE = "bg-[hsl(28_63%_44%/0.15)] text-[hsl(28_63%_38%)]";
const RED_BADGE = "bg-[hsl(0_57%_39%/0.15)] text-[hsl(0_57%_35%)]";
const MUTED_BADGE = "bg-muted text-muted-foreground";

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
    default: return "hsl(var(--muted-foreground))";
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
