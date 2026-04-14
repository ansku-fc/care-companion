import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Trash2, X, ChevronsUpDown } from "lucide-react";

export type MedicationEntry = {
  name: string;
  dose: string;
};

export type IllnessMedicationRow = {
  illness: string;
  medications: MedicationEntry[];
};

const COMMON_ILLNESSES = [
  "Hypertension",
  "Type 2 Diabetes",
  "Type 1 Diabetes",
  "Hyperlipidaemia",
  "Hypothyroidism",
  "Hyperthyroidism",
  "Asthma",
  "COPD",
  "Heart Failure",
  "Coronary Artery Disease",
  "Atrial Fibrillation",
  "Chronic Kidney Disease",
  "GERD / Acid Reflux",
  "IBS",
  "Crohn's Disease",
  "Ulcerative Colitis",
  "Depression",
  "Anxiety Disorder",
  "Bipolar Disorder",
  "Epilepsy",
  "Migraine",
  "Rheumatoid Arthritis",
  "Osteoarthritis",
  "Osteoporosis",
  "PCOS",
  "Endometriosis",
  "Psoriasis",
  "Eczema / Dermatitis",
  "Anaemia",
  "Gout",
];

const MEDICATIONS_BY_ILLNESS: Record<string, string[]> = {
  "Hypertension": ["Amlodipine", "Lisinopril", "Losartan", "Ramipril", "Atenolol", "Hydrochlorothiazide", "Valsartan", "Bisoprolol", "Candesartan", "Enalapril"],
  "Type 2 Diabetes": ["Metformin", "Glipizide", "Sitagliptin", "Empagliflozin", "Dapagliflozin", "Semaglutide", "Liraglutide", "Pioglitazone", "Insulin Glargine", "Gliclazide"],
  "Type 1 Diabetes": ["Insulin Aspart", "Insulin Lispro", "Insulin Glargine", "Insulin Detemir", "Insulin Degludec"],
  "Hyperlipidaemia": ["Atorvastatin", "Rosuvastatin", "Simvastatin", "Ezetimibe", "Pravastatin", "Fenofibrate", "PCSK9 Inhibitor"],
  "Hypothyroidism": ["Levothyroxine", "Liothyronine"],
  "Hyperthyroidism": ["Carbimazole", "Propylthiouracil", "Propranolol"],
  "Asthma": ["Salbutamol", "Fluticasone", "Budesonide", "Montelukast", "Salmeterol", "Formoterol", "Beclometasone", "Tiotropium"],
  "COPD": ["Salbutamol", "Tiotropium", "Fluticasone", "Budesonide", "Formoterol", "Umeclidinium", "Roflumilast"],
  "Heart Failure": ["Ramipril", "Bisoprolol", "Spironolactone", "Furosemide", "Sacubitril/Valsartan", "Empagliflozin", "Dapagliflozin", "Digoxin"],
  "Coronary Artery Disease": ["Aspirin", "Clopidogrel", "Atorvastatin", "Bisoprolol", "Ramipril", "GTN Spray", "Isosorbide Mononitrate"],
  "Atrial Fibrillation": ["Apixaban", "Rivaroxaban", "Warfarin", "Bisoprolol", "Digoxin", "Amiodarone", "Flecainide"],
  "Chronic Kidney Disease": ["Ramipril", "Losartan", "Dapagliflozin", "Sodium Bicarbonate", "Erythropoietin", "Iron Supplements"],
  "GERD / Acid Reflux": ["Omeprazole", "Lansoprazole", "Esomeprazole", "Ranitidine", "Gaviscon"],
  "IBS": ["Mebeverine", "Peppermint Oil", "Loperamide", "Linaclotide", "Amitriptyline"],
  "Crohn's Disease": ["Mesalazine", "Azathioprine", "Methotrexate", "Infliximab", "Adalimumab", "Prednisolone", "Budesonide"],
  "Ulcerative Colitis": ["Mesalazine", "Azathioprine", "Infliximab", "Adalimumab", "Prednisolone", "Tofacitinib"],
  "Depression": ["Sertraline", "Fluoxetine", "Citalopram", "Escitalopram", "Venlafaxine", "Mirtazapine", "Amitriptyline", "Duloxetine"],
  "Anxiety Disorder": ["Sertraline", "Escitalopram", "Venlafaxine", "Pregabalin", "Buspirone", "Propranolol"],
  "Bipolar Disorder": ["Lithium", "Valproate", "Lamotrigine", "Quetiapine", "Olanzapine", "Aripiprazole"],
  "Epilepsy": ["Levetiracetam", "Lamotrigine", "Carbamazepine", "Valproate", "Topiramate", "Phenytoin"],
  "Migraine": ["Sumatriptan", "Propranolol", "Amitriptyline", "Topiramate", "Candesartan", "Erenumab"],
  "Rheumatoid Arthritis": ["Methotrexate", "Hydroxychloroquine", "Sulfasalazine", "Leflunomide", "Adalimumab", "Etanercept", "Prednisolone"],
  "Osteoarthritis": ["Paracetamol", "Ibuprofen", "Naproxen", "Diclofenac Gel", "Capsaicin Cream", "Codeine"],
  "Osteoporosis": ["Alendronate", "Risedronate", "Denosumab", "Calcium + Vitamin D", "Raloxifene", "Zoledronic Acid"],
  "PCOS": ["Metformin", "Combined OCP", "Spironolactone", "Clomifene"],
  "Endometriosis": ["Combined OCP", "Norethisterone", "GnRH Agonist", "Dienogest", "Mirena IUS"],
  "Psoriasis": ["Topical Corticosteroids", "Calcipotriol", "Methotrexate", "Ciclosporin", "Adalimumab", "Secukinumab"],
  "Eczema / Dermatitis": ["Emollients", "Topical Corticosteroids", "Tacrolimus", "Pimecrolimus", "Dupilumab", "Antihistamines"],
  "Anaemia": ["Iron Supplements", "Folic Acid", "Vitamin B12", "Erythropoietin"],
  "Gout": ["Allopurinol", "Febuxostat", "Colchicine", "Naproxen", "Prednisolone"],
};

// Fallback medications for illnesses not in the map
const GENERAL_MEDICATIONS = [
  "Paracetamol", "Ibuprofen", "Aspirin", "Codeine", "Tramadol",
  "Amoxicillin", "Prednisolone", "Omeprazole", "Metformin",
];

interface Props {
  rows: IllnessMedicationRow[];
  onChange: (rows: IllnessMedicationRow[]) => void;
}

export function IllnessMedicationEditor({ rows, onChange }: Props) {
  const addRow = () => {
    onChange([...rows, { illness: "", medications: [] }]);
  };

  const removeRow = (idx: number) => {
    onChange(rows.filter((_, i) => i !== idx));
  };

  const updateIllness = (idx: number, illness: string) => {
    const updated = [...rows];
    updated[idx] = { ...updated[idx], illness, medications: [] };
    onChange(updated);
  };

  const toggleMedication = (idx: number, medName: string) => {
    const updated = [...rows];
    const row = { ...updated[idx] };
    const exists = row.medications.find((m) => m.name === medName);
    if (exists) {
      row.medications = row.medications.filter((m) => m.name !== medName);
    } else {
      row.medications = [...row.medications, { name: medName, dose: "" }];
    }
    updated[idx] = row;
    onChange(updated);
  };

  const updateDose = (rowIdx: number, medName: string, dose: string) => {
    const updated = [...rows];
    const row = { ...updated[rowIdx] };
    row.medications = row.medications.map((m) =>
      m.name === medName ? { ...m, dose } : m
    );
    updated[rowIdx] = row;
    onChange(updated);
  };

  const removeMedication = (rowIdx: number, medName: string) => {
    const updated = [...rows];
    const row = { ...updated[rowIdx] };
    row.medications = row.medications.filter((m) => m.name !== medName);
    updated[rowIdx] = row;
    onChange(updated);
  };

  const usedIllnesses = rows.map((r) => r.illness).filter(Boolean);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">Current Illnesses & Medications</Label>
        <Button type="button" variant="outline" size="sm" onClick={addRow} className="gap-1 text-xs">
          <Plus className="h-3.5 w-3.5" /> Add Illness
        </Button>
      </div>

      {rows.length === 0 && (
        <p className="text-sm text-muted-foreground py-4 text-center border rounded-md border-dashed">
          No illnesses added. Click "Add Illness" to start.
        </p>
      )}

      {rows.map((row, idx) => {
        const availableMeds = row.illness
          ? MEDICATIONS_BY_ILLNESS[row.illness] || GENERAL_MEDICATIONS
          : [];

        return (
          <div key={idx} className="border rounded-lg p-3 space-y-2 bg-muted/30">
            <div className="flex gap-2 items-start">
              {/* Illness dropdown */}
              <div className="flex-1 min-w-0">
                <Label className="text-xs text-muted-foreground mb-1 block">Illness</Label>
                <Select value={row.illness} onValueChange={(v) => updateIllness(idx, v)}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select illness..." />
                  </SelectTrigger>
                  <SelectContent>
                    {COMMON_ILLNESSES.filter(
                      (ill) => ill === row.illness || !usedIllnesses.includes(ill)
                    ).map((ill) => (
                      <SelectItem key={ill} value={ill}>{ill}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Medications multi-select */}
              <div className="flex-1 min-w-0">
                <Label className="text-xs text-muted-foreground mb-1 block">Medications</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-between font-normal h-auto min-h-[40px] py-1.5 text-left"
                      disabled={!row.illness}
                    >
                      {row.medications.length === 0 ? (
                        <span className="text-muted-foreground text-sm">
                          {row.illness ? "Select medications..." : "Choose illness first"}
                        </span>
                      ) : (
                        <span className="text-sm truncate">
                          {row.medications.length} selected
                        </span>
                      )}
                      <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[260px] p-2 max-h-[220px] overflow-y-auto" align="start">
                    {availableMeds.map((med) => {
                      const checked = row.medications.some((m) => m.name === med);
                      return (
                        <label
                          key={med}
                          className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted cursor-pointer text-sm"
                        >
                          <Checkbox
                            checked={checked}
                            onCheckedChange={() => toggleMedication(idx, med)}
                          />
                          {med}
                        </label>
                      );
                    })}
                  </PopoverContent>
                </Popover>
              </div>

              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="mt-5 shrink-0 h-9 w-9 text-muted-foreground hover:text-destructive"
                onClick={() => removeRow(idx)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>

            {/* Selected medications with dose inputs */}
            {row.medications.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-1">
                {row.medications.map((med) => (
                  <div
                    key={med.name}
                    className="flex items-center gap-1.5 bg-background border rounded-md px-2 py-1"
                  >
                    <span className="text-xs font-medium whitespace-nowrap">{med.name}</span>
                    <Input
                      placeholder="Dose"
                      value={med.dose}
                      onChange={(e) => updateDose(idx, med.name, e.target.value)}
                      className="h-6 w-24 text-xs px-1.5"
                    />
                    <button
                      type="button"
                      className="text-muted-foreground hover:text-destructive"
                      onClick={() => removeMedication(idx, med.name)}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
