import { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChevronDown, ChevronRight, Plus, Search, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  CARTER_DIAGNOSES,
  DIMENSION_LABEL_TO_KEY,
  fmtClinicalDate,
  isCarter,
  type ClinicalDimensionKey,
  type Diagnosis,
} from "@/lib/patientClinicalData";
import { cn } from "@/lib/utils";

const DIMENSIONS: ClinicalDimensionKey[] = [
  "Cardiovascular Health",
  "Metabolic Health",
  "Brain & Mental Health",
  "Digestion",
  "Respiratory & Immune Health",
  "Exercise & Functional Health",
  "Other",
];

// Mini ICD-10 catalogue for the search modal demo
const ICD_CATALOGUE: { icd10: string; name: string; dimension: ClinicalDimensionKey }[] = [
  { icd10: "I10", name: "Essential Hypertension", dimension: "Cardiovascular Health" },
  { icd10: "I25.10", name: "Atherosclerotic heart disease", dimension: "Cardiovascular Health" },
  { icd10: "I48.0", name: "Paroxysmal atrial fibrillation", dimension: "Cardiovascular Health" },
  { icd10: "E11", name: "Type 2 Diabetes Mellitus", dimension: "Metabolic Health" },
  { icd10: "E78.5", name: "Hyperlipidaemia", dimension: "Metabolic Health" },
  { icd10: "E66.9", name: "Obesity, unspecified", dimension: "Metabolic Health" },
  { icd10: "G47.3", name: "Obstructive Sleep Apnoea", dimension: "Brain & Mental Health" },
  { icd10: "F32.9", name: "Major depressive disorder", dimension: "Brain & Mental Health" },
  { icd10: "F41.1", name: "Generalised anxiety disorder", dimension: "Brain & Mental Health" },
  { icd10: "K21.0", name: "Gastroesophageal Reflux Disease", dimension: "Digestion" },
  { icd10: "K58.9", name: "Irritable bowel syndrome", dimension: "Digestion" },
  { icd10: "J45.9", name: "Asthma, unspecified", dimension: "Respiratory & Immune Health" },
  { icd10: "J44.9", name: "COPD, unspecified", dimension: "Respiratory & Immune Health" },
  { icd10: "M54.5", name: "Low back pain", dimension: "Exercise & Functional Health" },
  { icd10: "M17.9", name: "Osteoarthritis of knee", dimension: "Exercise & Functional Health" },
];

// Demo metadata not present in the source data (diagnosing doctor / notes).
const DX_META: Record<string, { doctor: string; note?: string; resolutionNote?: string }> = {
  d1: { doctor: "Dr. Laine", note: "BP averaging 148/94 across 3 readings — started lifestyle counselling and Lisinopril 10 mg." },
  d2: { doctor: "Dr. Laine", note: "HbA1c 58 mmol/mol at diagnosis. Metformin titrated to 500 mg BID." },
  d3: { doctor: "Dr. Laine", note: "LDL 4.6 mmol/l with strong family history. Atorvastatin 20 mg started." },
  d4: { doctor: "Dr. Mäkinen (sleep clinic)", note: "AHI 22 — moderate OSA. CPAP titration scheduled." },
  d5: { doctor: "Dr. Laine", note: "Chronic post-prandial reflux. PPI trial successful." },
  "d-past-1": {
    doctor: "Dr. Laine",
    note: "Acute viral pericarditis post-COVID.",
    resolutionNote: "Full clinical and echocardiographic resolution at 12-week follow-up.",
  },
};

interface Props {
  onSelectDimension: (key: string) => void;
}

export function DiagnosesView({ onSelectDimension }: Props) {
  const [diagnoses, setDiagnoses] = useState<Diagnosis[]>(CARTER_DIAGNOSES);
  const [filterDim, setFilterDim] = useState<string>("all");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [addOpen, setAddOpen] = useState(false);

  const active = useMemo(
    () =>
      diagnoses
        .filter((d) => d.status === "active")
        .filter((d) => filterDim === "all" || d.dimension === filterDim),
    [diagnoses, filterDim],
  );
  const past = useMemo(
    () =>
      diagnoses
        .filter((d) => d.status === "resolved")
        .filter((d) => filterDim === "all" || d.dimension === filterDim),
    [diagnoses, filterDim],
  );

  const toggle = (id: string) => setExpanded((e) => ({ ...e, [id]: !e[id] }));

  const handleAdd = (entry: typeof ICD_CATALOGUE[number]) => {
    const id = `d-new-${Date.now()}`;
    setDiagnoses((prev) => [
      {
        id,
        name: entry.name,
        icd10: entry.icd10,
        dimension: entry.dimension,
        diagnosedDate: new Date().toISOString().slice(0, 10),
        status: "active",
      },
      ...prev,
    ]);
    DX_META[id] = { doctor: "Dr. Laine" };
    setAddOpen(false);
  };

  return (
    <div className="space-y-5 p-1">
      {/* Header row */}
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-lg font-semibold text-foreground">All Diagnoses</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {active.length} active · {past.length} past
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={filterDim} onValueChange={setFilterDim}>
            <SelectTrigger className="h-9 w-[220px]">
              <SelectValue placeholder="Filter by dimension" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All dimensions</SelectItem>
              {DIMENSIONS.map((d) => (
                <SelectItem key={d} value={d}>{d}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button size="sm" onClick={() => setAddOpen(true)}>
            <Plus className="h-4 w-4 mr-1" /> Add diagnosis
          </Button>
        </div>
      </div>

      {/* Active */}
      <section className="space-y-2">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Active
        </h3>
        <Card className="shadow-card">
          <CardContent className="p-0 divide-y">
            {active.length === 0 ? (
              <p className="px-4 py-6 text-sm text-muted-foreground text-center">
                No active diagnoses for this filter.
              </p>
            ) : (
              active.map((d) => (
                <DxRow
                  key={d.id}
                  d={d}
                  expanded={!!expanded[d.id]}
                  onToggle={() => toggle(d.id)}
                  onJump={() => onSelectDimension(DIMENSION_LABEL_TO_KEY[d.dimension])}
                />
              ))
            )}
          </CardContent>
        </Card>
      </section>

      {/* Past */}
      <section className="space-y-2">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Past
        </h3>
        <Card className="shadow-card">
          <CardContent className="p-0 divide-y">
            {past.length === 0 ? (
              <p className="px-4 py-6 text-sm text-muted-foreground text-center">
                No resolved diagnoses for this filter.
              </p>
            ) : (
              past.map((d) => (
                <DxRow
                  key={d.id}
                  d={d}
                  expanded={!!expanded[d.id]}
                  onToggle={() => toggle(d.id)}
                  onJump={() => onSelectDimension(DIMENSION_LABEL_TO_KEY[d.dimension])}
                />
              ))
            )}
          </CardContent>
        </Card>
      </section>

      {/* Add modal */}
      <AddDiagnosisDialog open={addOpen} onOpenChange={setAddOpen} onPick={handleAdd} />
    </div>
  );
}

function DxRow({
  d,
  expanded,
  onToggle,
  onJump,
}: {
  d: Diagnosis;
  expanded: boolean;
  onToggle: () => void;
  onJump: () => void;
}) {
  const meta = DX_META[d.id];
  return (
    <div>
      <button
        onClick={onToggle}
        className="w-full text-left px-4 py-3 hover:bg-muted/50 transition-colors flex items-center gap-3"
      >
        {expanded ? (
          <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
        ) : (
          <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium text-foreground truncate">{d.name}</p>
            <Badge variant="outline" className="text-[10px]">{d.icd10}</Badge>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <button
              onClick={(e) => { e.stopPropagation(); onJump(); }}
              className="text-[11px] text-primary hover:underline"
            >
              {d.dimension}
            </button>
            <span className="text-[11px] text-muted-foreground">·</span>
            <span className="text-[11px] text-muted-foreground">
              Diagnosed {fmtClinicalDate(d.diagnosedDate)}
            </span>
            {meta?.doctor && (
              <>
                <span className="text-[11px] text-muted-foreground">·</span>
                <span className="text-[11px] text-muted-foreground inline-flex items-center gap-1">
                  <User className="h-3 w-3" /> {meta.doctor}
                </span>
              </>
            )}
          </div>
        </div>
        {d.status === "resolved" && d.resolvedDate && (
          <span className="text-[11px] text-muted-foreground shrink-0">
            Resolved {fmtClinicalDate(d.resolvedDate)}
          </span>
        )}
      </button>
      {expanded && (
        <div className="px-4 pb-4 pt-1 pl-11 space-y-2 bg-muted/20">
          {meta?.note ? (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">
                Clinical note
              </p>
              <p className="text-sm text-foreground">{meta.note}</p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground italic">No additional notes.</p>
          )}
          {meta?.resolutionNote && (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">
                Resolution
              </p>
              <p className="text-sm text-foreground">{meta.resolutionNote}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function AddDiagnosisDialog({
  open,
  onOpenChange,
  onPick,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onPick: (entry: typeof ICD_CATALOGUE[number]) => void;
}) {
  const [q, setQ] = useState("");
  const results = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return ICD_CATALOGUE.slice(0, 8);
    return ICD_CATALOGUE.filter(
      (e) =>
        e.icd10.toLowerCase().includes(s) ||
        e.name.toLowerCase().includes(s) ||
        e.dimension.toLowerCase().includes(s),
    ).slice(0, 12);
  }, [q]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Add diagnosis</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search by ICD-10 code or diagnosis name…"
              className="pl-9"
            />
          </div>
          <div className="border rounded-md divide-y max-h-[320px] overflow-auto">
            {results.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground text-center">
                No matches.
              </p>
            ) : (
              results.map((r) => (
                <button
                  key={r.icd10 + r.name}
                  onClick={() => onPick(r)}
                  className={cn(
                    "w-full text-left px-3 py-2.5 hover:bg-muted/60 transition-colors flex items-center gap-3",
                  )}
                >
                  <Badge variant="outline" className="text-[10px] font-mono shrink-0">
                    {r.icd10}
                  </Badge>
                  <span className="text-sm text-foreground flex-1 truncate">{r.name}</span>
                  <span className="text-[11px] text-muted-foreground shrink-0">
                    {r.dimension}
                  </span>
                </button>
              ))
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
