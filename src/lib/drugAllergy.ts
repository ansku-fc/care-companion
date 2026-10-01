// Drug ↔ allergy matching. Patient allergies are plain labels (e.g. "NSAIDs",
// "Penicillin") — matching a specific drug to an allergy class needs a link, so
// each rule maps an allergy class to the medications in it via ATC prefix
// (ATC codes live on MEDICATION_LIST) AND name keywords. Mirrors the regex
// name-matching style of drugInteractions.ts.
//
// Raw inputs: a medication's name + ATC, and the patient's allergy labels.
// Derived output: the matched conflict (or null). Nothing is stored.

export interface AllergyConflict {
  /** The patient's allergy label that matched (as shown in the left rail). */
  allergy: string;
  /** Short tag for the ⚠, e.g. "NSAID allergy". */
  tag: string;
  /** Human reason, e.g. "Ibuprofen is an NSAID". */
  reason: string;
}

interface AllergyRule {
  /** Patient allergy labels (lowercased) that trigger this class. */
  triggers: string[];
  /** ATC prefixes identifying the drug class. */
  atcPrefixes: string[];
  /** Name keywords for the class (case-insensitive). */
  nameRx: RegExp;
  tag: string;
  /** Phrase for the reason, e.g. "an NSAID" / "a penicillin". */
  reasonClass: string;
}

const RULES: AllergyRule[] = [
  {
    triggers: ["nsaids", "nsaid", "ibuprofen", "naproxen", "diclofenac", "aspirin"],
    atcPrefixes: ["M01A"],
    nameRx: /\b(ibuprofen|naproxen|diclofenac|ketoprofen|celecoxib|etoricoxib|indomethacin|mefenamic|aspirin|acetylsalicylic)\b/i,
    tag: "NSAID allergy",
    reasonClass: "an NSAID",
  },
  {
    triggers: ["penicillin", "penicillins", "amoxicillin", "ampicillin", "beta-lactam"],
    atcPrefixes: ["J01C"],
    nameRx: /\b(penicillin|amoxicillin|ampicillin|flucloxacillin|benzylpenicillin|phenoxymethylpenicillin|co-amoxiclav|piperacillin)\b/i,
    tag: "Penicillin allergy",
    reasonClass: "a penicillin",
  },
  {
    triggers: ["statins", "statin", "atorvastatin", "simvastatin", "rosuvastatin"],
    atcPrefixes: ["C10AA"],
    nameRx: /\b(statin|atorvastatin|simvastatin|rosuvastatin|pravastatin|fluvastatin|pitavastatin)\b/i,
    tag: "Statin allergy",
    reasonClass: "a statin",
  },
  {
    triggers: ["ace inhibitors", "ace inhibitor", "ace-inhibitor", "lisinopril", "ramipril", "enalapril"],
    atcPrefixes: ["C09AA"],
    nameRx: /\b(lisinopril|ramipril|enalapril|perindopril|captopril|fosinopril)\b/i,
    tag: "ACE-inhibitor allergy",
    reasonClass: "an ACE inhibitor",
  },
  {
    triggers: ["sulfonamides", "sulfonamide", "sulphonamides", "sulfa"],
    atcPrefixes: ["J01E"],
    nameRx: /\b(sulfamethoxazole|co-trimoxazole|sulfadiazine|sulfasalazine)\b/i,
    tag: "Sulfonamide allergy",
    reasonClass: "a sulfonamide",
  },
];

/**
 * Does a medication conflict with any of the patient's allergies? Matches by
 * ATC prefix OR name keyword against each allergy-class rule the patient
 * triggers. Returns the first conflict, or null. Current meds often lack an ATC
 * (name-keyword still catches them); catalog meds carry ATC for robustness.
 */
export function medicationAllergyConflict(
  med: { name?: string; atc?: string },
  allergies: string[],
): AllergyConflict | null {
  const name = (med.name ?? "").trim();
  const atc = (med.atc ?? "").toUpperCase();
  if (!name && !atc) return null;
  const lower = allergies.map((a) => a.trim().toLowerCase());

  for (const rule of RULES) {
    const matchedIdx = lower.findIndex((a) => rule.triggers.some((t) => a === t || a.includes(t)));
    if (matchedIdx === -1) continue;
    const byAtc = atc !== "" && rule.atcPrefixes.some((p) => atc.startsWith(p));
    const byName = name !== "" && rule.nameRx.test(name);
    if (byAtc || byName) {
      return {
        allergy: allergies[matchedIdx],
        tag: rule.tag,
        reason: `${name || "This medication"} is ${rule.reasonClass}`,
      };
    }
  }
  return null;
}
