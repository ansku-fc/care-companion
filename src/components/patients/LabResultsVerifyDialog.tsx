import { useState, useRef, Fragment } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Upload, FileText, Check, AlertCircle, Loader2, Sparkles } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// Alternative units the doctor can switch between when the OCR mis-reads a unit
const UNIT_ALTERNATIVES: Record<string, string[]> = {
  "mmol/l": ["mmol/l", "mol/l", "µmol/l", "mg/dl", "g/l"],
  "mmol/mol": ["mmol/mol", "mol/mol", "%"],
  "mmHg": ["mmHg", "kPa"],
  "U/l": ["U/l", "kU/l", "µkat/l"],
  "ml/min/1.73 m²": ["ml/min/1.73 m²", "ml/min"],
  "mg/l": ["mg/l", "µg/l", "g/l", "ng/ml"],
  "mU/l": ["mU/l", "U/l", "µU/ml"],
  "%": ["%", "ratio"],
};

const unitOptionsFor = (unit?: string): string[] => {
  if (!unit) return [];
  const alts = UNIT_ALTERNATIVES[unit];
  return alts ?? [unit];
};

type ParsedRow = {
  field: keyof ExtractedValues;
  label: string;
  unit?: string;
  reference?: string;
  parsed: string;
  verified: boolean;
  dimension: string;
};

const DIMENSION_ORDER = [
  "Cardiovascular Health",
  "Metabolic Health",
  "Liver Function",
  "Kidney Function",
  "Endocrine & Hormonal",
  "Brain & Mental Health",
  "Respiratory & Immune Health",
] as const;

type ExtractedValues = {
  ldl_mmol_l: string;
  hba1c_mmol_mol: string;
  blood_pressure_systolic: string;
  blood_pressure_diastolic: string;
  alat_u_l: string;
  afos_alp_u_l: string;
  gt_u_l: string;
  alat_asat_ratio: string;
  egfr: string;
  cystatin_c: string;
  u_alb_krea_abnormal: string;
  tsh_mu_l: string;
  testosterone_estrogen_abnormal: string;
  apoe_e4: string;
  pef_percent: string;
  fev1_percent: string;
  fvc_percent: string;
};

// Mock "AI extraction" results — matches values in /public/sample-lab-report.pdf
const MOCK_EXTRACTED: ParsedRow[] = [
  { field: "ldl_mmol_l", label: "LDL cholesterol", unit: "mmol/l", reference: "< 3.0", parsed: "3.42", verified: false, dimension: "Cardiovascular Health" },
  { field: "blood_pressure_systolic", label: "Blood pressure (systolic)", unit: "mmHg", reference: "< 130", parsed: "128", verified: false, dimension: "Cardiovascular Health" },
  { field: "blood_pressure_diastolic", label: "Blood pressure (diastolic)", unit: "mmHg", reference: "< 85", parsed: "82", verified: false, dimension: "Cardiovascular Health" },
  { field: "hba1c_mmol_mol", label: "HbA1c", unit: "mmol/mol", reference: "20 - 42", parsed: "38", verified: false, dimension: "Metabolic Health" },
  { field: "alat_u_l", label: "ALAT", unit: "U/l", reference: "10 - 45", parsed: "29", verified: false, dimension: "Liver Function" },
  { field: "afos_alp_u_l", label: "AFOS / ALP", unit: "U/l", reference: "35 - 105", parsed: "78", verified: false, dimension: "Liver Function" },
  { field: "gt_u_l", label: "GT", unit: "U/l", reference: "10 - 65", parsed: "34", verified: false, dimension: "Liver Function" },
  { field: "alat_asat_ratio", label: "ALAT / ASAT ratio", reference: "0.8 - 1.5", parsed: "1.12", verified: false, dimension: "Liver Function" },
  { field: "egfr", label: "eGFR", unit: "ml/min/1.73 m²", reference: "> 60", parsed: "92", verified: false, dimension: "Kidney Function" },
  { field: "cystatin_c", label: "Cystatin C", unit: "mg/l", reference: "0.6 - 1.0", parsed: "0.94", verified: false, dimension: "Kidney Function" },
  { field: "u_alb_krea_abnormal", label: "U-Alb/Krea", reference: "Normal", parsed: "Normal", verified: false, dimension: "Kidney Function" },
  { field: "tsh_mu_l", label: "TSH", unit: "mU/l", reference: "0.4 - 4.0", parsed: "2.31", verified: false, dimension: "Endocrine & Hormonal" },
  { field: "testosterone_estrogen_abnormal", label: "Testosterone / Estrogen", reference: "Normal", parsed: "Normal", verified: false, dimension: "Endocrine & Hormonal" },
  { field: "apoe_e4", label: "APOE ε4", reference: "Negative", parsed: "Negative", verified: false, dimension: "Brain & Mental Health" },
  { field: "pef_percent", label: "PEF", unit: "%", reference: "> 80", parsed: "94", verified: false, dimension: "Respiratory & Immune Health" },
  { field: "fev1_percent", label: "FEV1", unit: "%", reference: "> 80", parsed: "91", verified: false, dimension: "Respiratory & Immune Health" },
  { field: "fvc_percent", label: "FVC", unit: "%", reference: "> 80", parsed: "96", verified: false, dimension: "Respiratory & Immune Health" },
];

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  patientId: string;
  onSaved: () => void;
}

export function LabResultsVerifyDialog({ open, onOpenChange, patientId, onSaved }: Props) {
  const [stage, setStage] = useState<"upload" | "verify">("upload");
  const [pdfUrl, setPdfUrl] = useState<string>("");
  const [pdfName, setPdfName] = useState<string>("");
  const [parsing, setParsing] = useState(false);
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [resultDate, setResultDate] = useState(new Date().toISOString().split("T")[0]);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setStage("upload");
    setPdfUrl("");
    setPdfName("");
    setRows([]);
    setResultDate(new Date().toISOString().split("T")[0]);
  };

  const useDummyPdf = async () => {
    setPdfUrl("/sample-lab-report.pdf");
    setPdfName("sample-lab-report.pdf");
    runMockParse();
  };

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      toast.error("Please upload a PDF file");
      return;
    }
    const url = URL.createObjectURL(file);
    setPdfUrl(url);
    setPdfName(file.name);
    runMockParse();
  };

  const runMockParse = () => {
    setParsing(true);
    setStage("verify");
    // Simulate AI extraction latency
    setTimeout(() => {
      setRows(MOCK_EXTRACTED.map((r) => ({ ...r })));
      setParsing(false);
      toast.success("Lab values extracted — please verify each row");
    }, 1400);
  };

  const updateRow = (idx: number, value: string) => {
    setRows((rs) => rs.map((r, i) => (i === idx ? { ...r, parsed: value, verified: false } : r)));
  };

  const updateUnit = (idx: number, unit: string) => {
    setRows((rs) => rs.map((r, i) => (i === idx ? { ...r, unit, verified: false } : r)));
  };

  const toggleVerified = (idx: number) => {
    setRows((rs) => rs.map((r, i) => (i === idx ? { ...r, verified: !r.verified } : r)));
  };

  const verifyAll = () => {
    setRows((rs) => rs.map((r) => ({ ...r, verified: true })));
  };

  const verifiedCount = rows.filter((r) => r.verified).length;
  const allVerified = rows.length > 0 && verifiedCount === rows.length;

  const handleSave = async () => {
    setSaving(true);
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      toast.error("Not authenticated");
      setSaving(false);
      return;
    }

    const num = (v: string): number | null => {
      const n = parseFloat(v);
      return isNaN(n) ? null : n;
    };
    const bool = (v: string): boolean | null => {
      const lower = v.toLowerCase().trim();
      if (["normal", "negative", "no", "false"].includes(lower)) return false;
      if (["abnormal", "positive", "yes", "true"].includes(lower)) return true;
      return null;
    };

    const map: Record<string, any> = {};
    rows.forEach((r) => {
      if (["u_alb_krea_abnormal", "testosterone_estrogen_abnormal", "apoe_e4"].includes(r.field)) {
        map[r.field] = bool(r.parsed);
      } else {
        map[r.field] = num(r.parsed);
      }
    });

    const { error } = await supabase.from("patient_lab_results").insert({
      patient_id: patientId,
      created_by: userData.user.id,
      result_date: resultDate,
      source: "file_upload",
      source_filename: pdfName,
      ...map,
    });

    setSaving(false);
    if (error) {
      toast.error("Failed to save lab results");
      console.error(error);
    } else {
      toast.success("Lab results saved");
      reset();
      onOpenChange(false);
      onSaved();
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v);
        if (!v) reset();
      }}
    >
      <DialogContent className="max-w-[95vw] w-[1400px] h-[90vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-6 py-4 border-b">
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {stage === "upload" ? "Upload Lab Report PDF" : "Verify Extracted Lab Results"}
          </DialogTitle>
        </DialogHeader>

        {stage === "upload" && (
          <div className="flex-1 flex items-center justify-center p-12">
            <div className="max-w-md w-full text-center space-y-6">
              <div className="border-2 border-dashed border-border rounded-xl p-10 hover:border-primary/50 transition-colors">
                <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="font-semibold mb-1">Upload a lab report PDF</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  We'll extract the values automatically so you can review them row by row.
                </p>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".pdf"
                  onChange={handleUpload}
                  className="hidden"
                />
                <Button onClick={() => fileRef.current?.click()} className="gap-2">
                  <Upload className="h-4 w-4" /> Choose PDF
                </Button>
              </div>
              <div className="text-xs text-muted-foreground">— or —</div>
              <Button variant="outline" onClick={useDummyPdf} className="gap-2">
                <Sparkles className="h-4 w-4" /> Try with sample lab report
              </Button>
            </div>
          </div>
        )}

        {stage === "verify" && (
          <div className="flex-1 grid grid-cols-2 min-h-0">
            {/* PDF Viewer */}
            <div className="border-r bg-muted/30 flex flex-col min-h-0">
              <div className="px-4 py-2 border-b bg-background flex items-center justify-between text-sm">
                <span className="font-medium truncate">{pdfName}</span>
                <Badge variant="outline" className="text-xs">Source</Badge>
              </div>
              <div className="flex-1 min-h-0">
                {pdfUrl ? (
                  <iframe
                    src={pdfUrl}
                    title="Lab report PDF"
                    className="w-full h-full border-0"
                  />
                ) : (
                  <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
                    No PDF loaded
                  </div>
                )}
              </div>
            </div>

            {/* Verification Table */}
            <div className="flex flex-col min-h-0">
              <div className="px-4 py-3 border-b flex items-center justify-between gap-3 bg-background">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">Extracted values</span>
                  {!parsing && rows.length > 0 && (
                    <Badge variant="secondary" className="text-xs">
                      {verifiedCount} / {rows.length} verified
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-xs text-muted-foreground">Date</label>
                  <Input
                    type="date"
                    value={resultDate}
                    onChange={(e) => setResultDate(e.target.value)}
                    className="h-8 w-[140px] text-xs"
                  />
                  <Button size="sm" variant="outline" onClick={verifyAll} disabled={parsing || rows.length === 0}>
                    <Check className="h-3.5 w-3.5 mr-1" /> Verify all
                  </Button>
                </div>
              </div>

              {parsing ? (
                <div className="flex-1 flex flex-col items-center justify-center gap-3 text-sm text-muted-foreground">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  Extracting lab values from PDF…
                </div>
              ) : (
                <ScrollArea className="flex-1">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 z-10 bg-muted/60 backdrop-blur border-b text-xs uppercase tracking-wide text-muted-foreground">
                      <tr>
                        <th className="text-left font-medium px-3 py-2 w-10"></th>
                        <th className="text-left font-medium px-3 py-2">Test</th>
                        <th className="text-left font-medium px-3 py-2 w-[140px]">Value</th>
                        <th className="text-left font-medium px-3 py-2 w-[110px]">Unit</th>
                        <th className="text-left font-medium px-3 py-2 w-[110px]">Reference</th>
                      </tr>
                    </thead>
                    <tbody>
                      {DIMENSION_ORDER.filter((dim) => rows.some((r) => r.dimension === dim)).map((dim) => {
                        const dimRows = rows
                          .map((r, idx) => ({ r, idx }))
                          .filter(({ r }) => r.dimension === dim);
                        const dimVerified = dimRows.filter(({ r }) => r.verified).length;
                        return (
                          <Fragment key={dim}>
                            <tr className="bg-muted/40 border-b border-t">
                              <td colSpan={5} className="px-3 py-1.5">
                                <div className="flex items-center justify-between">
                                  <span className="text-[11px] font-semibold uppercase tracking-wider text-foreground/80">
                                    {dim}
                                  </span>
                                  <span className="text-[10px] text-muted-foreground">
                                    {dimVerified}/{dimRows.length} verified
                                  </span>
                                </div>
                              </td>
                            </tr>
                            {dimRows.map(({ r, idx }) => (
                              <tr
                                key={r.field}
                                className={cn(
                                  "border-b transition-colors",
                                  r.verified ? "bg-accent/40" : "hover:bg-muted/40"
                                )}
                              >
                                <td className="px-3 py-2">
                                  <button
                                    onClick={() => toggleVerified(idx)}
                                    className={cn(
                                      "h-5 w-5 rounded-full border-2 flex items-center justify-center transition-all",
                                      r.verified
                                        ? "bg-primary border-primary text-primary-foreground"
                                        : "border-muted-foreground/30 hover:border-primary"
                                    )}
                                    aria-label={r.verified ? "Mark unverified" : "Mark verified"}
                                  >
                                    {r.verified && <Check className="h-3 w-3" strokeWidth={3} />}
                                  </button>
                                </td>
                                <td className="px-3 py-2 font-medium">{r.label}</td>
                                <td className="px-3 py-2">
                                  <Input
                                    value={r.parsed}
                                    onChange={(e) => updateRow(idx, e.target.value)}
                                    className="h-8 text-sm"
                                  />
                                </td>
                                <td className="px-3 py-2">
                                  {r.unit ? (
                                    <Select value={r.unit} onValueChange={(v) => updateUnit(idx, v)}>
                                      <SelectTrigger className="h-8 text-xs px-2">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent className="bg-popover z-50">
                                        {unitOptionsFor(r.unit).map((u) => (
                                          <SelectItem key={u} value={u} className="text-xs">{u}</SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  ) : (
                                    <span className="text-muted-foreground text-xs">—</span>
                                  )}
                                </td>
                                <td className="px-3 py-2 text-muted-foreground text-xs">{r.reference ?? "—"}</td>
                              </tr>
                            ))}
                          </Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </ScrollArea>
              )}

              <div className="border-t px-4 py-3 flex items-center justify-between bg-background">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  {allVerified ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-primary" />
                      All rows verified
                    </>
                  ) : (
                    <>
                      <AlertCircle className="h-3.5 w-3.5 text-muted-foreground" />
                      Verify each row before saving
                    </>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                  <Button onClick={handleSave} disabled={saving || !allVerified || parsing}>
                    {saving ? "Saving…" : "Save Lab Results"}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
