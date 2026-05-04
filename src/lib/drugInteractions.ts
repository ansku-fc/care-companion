// Hard-coded list of well-known drug interaction pairs. When a new medication
// is added we check the patient's other active meds for any of these pairs and
// auto-create a Drug interaction review task. Names are matched as
// case-insensitive substrings against medication_name.

export interface InteractionPair {
  /** Normalised display names. */
  a: string;
  b: string;
  /** Regexes for matching either order. */
  rxA: RegExp;
  rxB: RegExp;
  severity: "high" | "medium";
  rationale: string;
}

const r = (...alts: string[]) => new RegExp(`\\b(?:${alts.join("|")})\\b`, "i");

export const INTERACTION_PAIRS: InteractionPair[] = [
  {
    a: "Warfarin", b: "Ibuprofen",
    rxA: r("warfarin"), rxB: r("ibuprofen", "naproxen", "diclofenac"),
    severity: "high",
    rationale: "NSAID increases bleeding risk on Warfarin.",
  },
  {
    a: "Warfarin", b: "Aspirin",
    rxA: r("warfarin"), rxB: r("aspirin", "asa"),
    severity: "high",
    rationale: "Additive bleeding risk.",
  },
  {
    a: "Statin", b: "Clarithromycin",
    rxA: r("atorvastatin", "simvastatin", "rosuvastatin", "pravastatin", "statin"),
    rxB: r("clarithromycin", "erythromycin"),
    severity: "high",
    rationale: "Macrolide raises statin levels (rhabdomyolysis risk).",
  },
  {
    a: "SSRI", b: "Tramadol",
    rxA: r("sertraline", "citalopram", "fluoxetine", "paroxetine", "escitalopram", "ssri"),
    rxB: r("tramadol"),
    severity: "high",
    rationale: "Serotonin syndrome risk.",
  },
  {
    a: "Metformin", b: "Contrast media",
    rxA: r("metformin"), rxB: r("contrast", "iodinated"),
    severity: "medium",
    rationale: "Risk of lactic acidosis around contrast imaging.",
  },
  {
    a: "ACE inhibitor", b: "Potassium",
    rxA: r("lisinopril", "ramipril", "enalapril", "perindopril"),
    rxB: r("potassium", "spironolactone", "amiloride"),
    severity: "medium",
    rationale: "Hyperkalaemia risk.",
  },
  {
    a: "Clopidogrel", b: "Omeprazole",
    rxA: r("clopidogrel"), rxB: r("omeprazole", "esomeprazole"),
    severity: "medium",
    rationale: "PPI may reduce clopidogrel efficacy.",
  },
];

export interface DetectedInteraction {
  pair: InteractionPair;
  /** The matched names from the patient's medication list. */
  drugAName: string;
  drugBName: string;
}

/**
 * Given a newly added medication name and the patient's *existing* active
 * medication names, return any interaction pairs that fire.
 */
export function detectInteractions(
  newMedName: string,
  existingMedNames: string[],
): DetectedInteraction[] {
  const out: DetectedInteraction[] = [];
  for (const pair of INTERACTION_PAIRS) {
    const newIsA = pair.rxA.test(newMedName);
    const newIsB = pair.rxB.test(newMedName);
    if (!newIsA && !newIsB) continue;
    for (const other of existingMedNames) {
      if (!other) continue;
      if (other.toLowerCase() === newMedName.toLowerCase()) continue;
      if (newIsA && pair.rxB.test(other)) {
        out.push({ pair, drugAName: newMedName, drugBName: other });
      } else if (newIsB && pair.rxA.test(other)) {
        out.push({ pair, drugAName: other, drugBName: newMedName });
      }
    }
  }
  return out;
}
