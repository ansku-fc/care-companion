import { describe, it, expect } from "vitest";
import { HEALTH_TAXONOMY } from "@/lib/healthDimensions";
import {
  DIMENSION_KEYS,
  assertCanonicalKeysMatchTaxonomy,
  fromKebab,
  fromLabel,
  isDimensionKey,
} from "./dimensionMapping";

describe("dimensionMapping canonical keys", () => {
  it("stays in sync with HEALTH_TAXONOMY main keys (edit the taxonomy -> this fails)", () => {
    expect(() => assertCanonicalKeysMatchTaxonomy()).not.toThrow();
    const taxonomyKeys = HEALTH_TAXONOMY.map((d) => d.key).sort();
    expect([...DIMENSION_KEYS].sort()).toEqual(taxonomyKeys);
  });

  it("fromKebab joins skin + oral into skin_oral_mucosal", () => {
    expect(fromKebab("skin")).toBe("skin_oral_mucosal");
    expect(fromKebab("oral")).toBe("skin_oral_mucosal");
    expect(fromKebab("exercise")).toBe("exercise_functional");
    expect(fromKebab("brain-mental")).toBe("brain_mental");
    expect(fromKebab("nonsense")).toBeNull();
  });

  it("fromLabel tolerates Health/Capacity and shortened variants", () => {
    expect(fromLabel("Exercise & Functional Health")).toBe("exercise_functional");
    expect(fromLabel("Exercise & Functional Capacity")).toBe("exercise_functional");
    expect(fromLabel("Respiratory & Immune")).toBe("respiratory_immune");
    expect(fromLabel("Skin, Oral & Mucosal Health")).toBe("skin_oral_mucosal");
    expect(fromLabel("Other")).toBeNull();
  });

  it("isDimensionKey guards arbitrary strings", () => {
    expect(isDimensionKey("cardiovascular")).toBe(true);
    expect(isDimensionKey("sensory_organs")).toBe(false); // sub-dimension, not main
  });
});
