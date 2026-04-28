import { useEffect, useMemo, useRef, useState, Fragment } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft, Upload, FileText, Check, AlertTriangle, X, Search, Sparkles, Plus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  LAB_MARKERS, LAB_DIMENSIONS, LAB_PACKAGES, getMarkerByField, type LabMarker,
} from "@/lib/labMarkerCatalog";
import { logActivity } from "@/lib/activityLog";

type Confidence = "confident" | "uncertain" | "not_found";

type ExtractedRow = {
  field: string;
  value: string;
  confidence: Confidence;
  removed?: boolean;
};

type Step = "upload" | "verify" | "manual";

type FileKind = "pdf" | "image" | "html" | "other";

function detectKind(file: File): FileKind {
  const name = file.name.toLowerCase();
  if (name.endsWith(".pdf")) return "pdf";
  if (name.endsWith(".html") || name.endsWith(".htm")) return "html";
  if (/\.(jpe?g|png|webp|gif)$/.test(name)) return "image";
  return "other";
}

/** Mock parser — produces a plausible mix of confident / uncertain / not_found rows. */
function mockExtract(): ExtractedRow[] {
  const mockValues: Record<string, { value: string; confidence: Confidence }> = {
    ldl_mmol_l: { value: "3.42", confidence: "confident" },
    blood_pressure_systolic: { value: "128", confidence: "confident" },
    blood_pressure_diastolic: { value: "82", confidence: "confident" },
    hba1c_mmol_mol: { value: "38", confidence: "confident" },
    alat_u_l: { value: "29", confidence: "confident" },
    afos_alp_u_l: { value: "78", confidence: "confident" },
    gt_u_l: { value: "34", confidence: "confident" },
    alat_asat_ratio: { value: "1.12", confidence: "uncertain" },
    egfr: { value: "92", confidence: "confident" },
    creatinine_umol_l: { value: "78", confidence: "confident" },
    cystatin_c: { value: "0.94", confidence: "uncertain" },
    tsh_mu_l: { value: "2.31", confidence: "confident" },
    free_t4_pmol_l: { value: "15.2", confidence: "confident" },
    vitamin_d_25oh_nmol_l: { value: "68", confidence: "confident" },
    vitamin_b12_total_ng_l: { value: "412", confidence: "confident" },
    folate_ug_l: { value: "8.4", confidence: "confident" },
    ferritin_ug_l: { value: "112", confidence: "confident" },
    sodium_mmol_l: { value: "140", confidence: "confident" },
    potassium_mmol_l: { value: "4.2", confidence: "confident" },
    calcium_mmol_l: { value: "2.34", confidence: "confident" },
    pef_percent: { value: "94", confidence: "confident" },
    fev1_percent: { value: "91", confidence: "uncertain" },
    fvc_percent: { value: "96", confidence: "confident" },
  };
  return Object.entries(mockValues).map(([field, v]) => ({
    field, value: v.value, confidence: v.confidence,
  }));
}

function ConfidenceBadge({ c }: { c: Confidence }) {
  if (c === "confident") {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 rounded-full px-2 py-0.5">
        <Check className="h-3 w-3" /> Confident
      </span>
    );
  }
  if (c === "uncertain") {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-medium text-amber-700 dark:text-amber-400 bg-amber-500/10 rounded-full px-2 py-0.5">
        <AlertTriangle className="h-3 w-3" /> Uncertain
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-medium text-muted-foreground bg-muted rounded-full px-2 py-0.5">
      <X className="h-3 w-3" /> Not found
    </span>
  );
}

export default function NewLabResultsPage() {
  const { id: patientId = "" } = useParams<{ id: string }>();
  const [search] = useSearchParams();
  const navigate = useNavigate();

  const initialStep = (search.get("mode") === "manual" ? "manual" : "upload") as Step;
  const [step, setStep] = useState<Step>(initialStep);

  const [resultDate, setResultDate] = useState(new Date().toISOString().split("T")[0]);
  const [sourceLab, setSourceLab] = useState("HUSLAB");

  const [file, setFile] = useState<File | null>(null);
  const [fileUrl, setFileUrl] = useState<string>("");
  const [fileKind, setFileKind] = useState<FileKind>("other");
  const [parsing, setParsing] = useState(false);
  const [parseFailed, setParseFailed] = useState(false);

  const [rows, setRows] = useState<ExtractedRow[]>([]);
  const [saving, setSaving] = useState(false);
  const [patientName, setPatientName] = useState<string>("");

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => { if (fileUrl) URL.revokeObjectURL(fileUrl); };
  }, [fileUrl]);

  useEffect(() => {
    if (!patientId) return;
    supabase.from("patients").select("full_name").eq("id", patientId).maybeSingle()
      .then(({ data }) => { if (data?.full_name) setPatientName(data.full_name); });
  }, [patientId]);

  const acceptFile = (f: File) => {
    const kind = detectKind(f);
    if (kind === "other") {
      toast.error("Unsupported file. Use PDF, HTML, JPG or PNG.");
      return;
    }
    if (fileUrl) URL.revokeObjectURL(fileUrl);
    const url = URL.createObjectURL(f);
    setFile(f);
    setFileUrl(url);
    setFileKind(kind);
    setStep("verify");
    setParsing(true);
    setParseFailed(false);
    // Simulate AI extraction
    setTimeout(() => {
      // ~10% chance of total parse failure for demo realism
      const fail = false;
      if (fail) {
        setParseFailed(true);
        setRows([]);
      } else {
        setRows(mockExtract());
      }
      setParsing(false);
    }, 1400);
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) acceptFile(f);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files?.[0];
    if (f) acceptFile(f);
  };

  const updateRowValue = (field: string, value: string) => {
    setRows((rs) => rs.map((r) => (r.field === field ? { ...r, value } : r)));
  };

  const removeRow = (field: string) => {
    setRows((rs) => rs.filter((r) => r.field !== field));
  };

  const addMarker = (field: string) => {
    setRows((rs) => {
      if (rs.some((r) => r.field === field)) return rs;
      return [...rs, { field, value: "", confidence: "confident" }];
    });
  };

  const addPackage = (markers: string[]) => {
    setRows((rs) => {
      const existing = new Set(rs.map((r) => r.field));
      const additions = markers
        .filter((m) => !existing.has(m))
        .map((field) => ({ field, value: "", confidence: "confident" as Confidence }));
      return [...rs, ...additions];
    });
  };

  const grouped = useMemo(() => {
    const out: Record<string, ExtractedRow[]> = {};
    for (const r of rows) {
      const m = getMarkerByField(r.field);
      if (!m) continue;
      if (!out[m.dimension]) out[m.dimension] = [];
      out[m.dimension].push(r);
    }
    return out;
  }, [rows]);

  const summary = useMemo(() => {
    const total = rows.length;
    const conf = rows.filter((r) => r.confidence === "confident").length;
    const unc = rows.filter((r) => r.confidence === "uncertain").length;
    return { total, conf, unc };
  }, [rows]);

  const handleSave = async () => {
    if (rows.length === 0) {
      toast.error("Add at least one marker before saving");
      return;
    }
    setSaving(true);
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      toast.error("Not authenticated");
      setSaving(false);
      return;
    }
    const payload: Record<string, any> = {
      patient_id: patientId,
      created_by: userData.user.id,
      result_date: resultDate,
      source: file ? "file_upload" : "manual",
      source_filename: file?.name ?? null,
    };
    for (const r of rows) {
      const m = getMarkerByField(r.field);
      if (!m) continue;
      const v = r.value.trim();
      if (v === "") continue;
      if (m.type === "boolean") {
        const lower = v.toLowerCase();
        if (["true", "yes", "abnormal", "positive", "1"].includes(lower)) payload[m.field] = true;
        else if (["false", "no", "normal", "negative", "0"].includes(lower)) payload[m.field] = false;
      } else {
        const n = parseFloat(v);
        if (!isNaN(n)) payload[m.field] = n;
      }
    }
    try {
      const { error } = await supabase.from("patient_lab_results").insert(payload as any);
      if (error) throw error;
      await logActivity({
        eventType: "lab_results_uploaded",
        title: "New lab results uploaded",
        patientId,
        actorName: file ? "Lab system" : "Dr. Laine",
        actorType: file ? "lab" : "doctor",
        section: "health-data",
        createdBy: userData.user.id,
        metadata: { source: payload.source, source_filename: payload.source_filename, marker_count: Object.keys(payload).length - 5 },
      });
      toast.success("Lab results saved");
      navigate(`/patients/${patientId}?tab=lab`);
    } catch (error: any) {
      console.error("Failed to save lab results", error);
      toast.error(error?.message ?? "Failed to save lab results");
    } finally {
      setSaving(false);
    }
  };

  // ─── STEP 1: UPLOAD ─────────────────────────────────────────────
  if (step === "upload") {
    return (
      <div className="fixed inset-0 z-50 bg-background flex flex-col">
        <Header title="Add Lab Results" subtitle={patientName} onBack={() => navigate(-1)} />
        <div className="flex-1 flex items-center justify-center p-8 overflow-auto">
          <div className="w-full max-w-xl space-y-6">
            <div className="space-y-2">
              <Label htmlFor="rdate">Result date</Label>
              <Input
                id="rdate"
                type="date"
                value={resultDate}
                onChange={(e) => setResultDate(e.target.value)}
                className="max-w-xs"
              />
            </div>
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={onDrop}
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-border rounded-2xl p-12 text-center cursor-pointer hover:border-primary/60 hover:bg-accent/30 transition-colors"
            >
              <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="font-semibold text-lg mb-1">Drop a lab report here</h3>
              <p className="text-sm text-muted-foreground mb-4">
                PDF, HTML, JPG or PNG — up to 20 MB
              </p>
              <Button type="button" variant="outline" className="gap-2" onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}>
                <Upload className="h-4 w-4" /> Choose file
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.html,.htm,.jpg,.jpeg,.png,.webp"
                onChange={onFileChange}
                className="hidden"
              />
            </div>
            <div className="text-center text-xs text-muted-foreground">— or —</div>
            <div className="text-center">
              <Button variant="ghost" onClick={() => setStep("manual")} className="gap-2">
                <FileText className="h-4 w-4" /> Enter manually instead
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─── STEP 2 / 3: SPLIT-PANEL ───────────────────────────────────
  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col">
      <Header
        title={step === "manual" ? "Enter Lab Results Manually" : "Verify Extracted Lab Results"}
        subtitle={patientName}
        onBack={() => setStep("upload")}
      />
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 min-h-0">
        {/* LEFT — document or placeholder */}
        <div className="border-r bg-muted/30 flex flex-col min-h-0">
          <div className="px-4 py-2 border-b bg-background flex items-center justify-between text-sm">
            <span className="font-medium truncate">
              {file?.name ?? "No document uploaded"}
            </span>
            {file && <Badge variant="outline" className="text-xs">Source</Badge>}
          </div>
          <div className="flex-1 min-h-0 overflow-auto bg-muted/40">
            {!file && (
              <div className="h-full flex flex-col items-center justify-center text-sm text-muted-foreground gap-3 p-8 text-center">
                <FileText className="h-12 w-12 opacity-30" />
                <div>No document uploaded.<br />Manual entry mode.</div>
                <Button variant="outline" size="sm" onClick={() => setStep("upload")} className="mt-2">
                  Upload a document
                </Button>
              </div>
            )}
            {file && fileKind === "pdf" && fileUrl && (
              <iframe src={fileUrl} title="Lab report" className="w-full h-full border-0 bg-white" />
            )}
            {file && fileKind === "image" && fileUrl && (
              <div className="p-4 flex justify-center">
                <img src={fileUrl} alt="Lab report" className="max-w-full rounded-lg shadow-sm" />
              </div>
            )}
            {file && fileKind === "html" && fileUrl && (
              <iframe src={fileUrl} title="Lab report" className="w-full h-full border-0 bg-white" />
            )}
          </div>
        </div>

        {/* RIGHT — extracted/manual values */}
        <div className="flex flex-col min-h-0">
          <div className="px-5 py-3 border-b bg-background space-y-3">
            {step === "verify" && parseFailed && (
              <div className="flex items-start gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-800 dark:text-amber-300">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                <div>
                  Could not read this document automatically. Add markers manually below — the document is still visible on the left for reference.
                </div>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Result date</Label>
                <Input type="date" value={resultDate} onChange={(e) => setResultDate(e.target.value)} className="h-9" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Source lab</Label>
                <Input value={sourceLab} onChange={(e) => setSourceLab(e.target.value)} className="h-9" placeholder="e.g. HUSLAB" />
              </div>
            </div>
            {step === "verify" && !parsing && !parseFailed && rows.length > 0 && (
              <div className="text-xs text-muted-foreground flex items-center gap-1">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                {summary.total} markers extracted — {summary.conf} confident
                {summary.unc > 0 && `, ${summary.unc} uncertain`}
              </div>
            )}
            {/* Manual-entry add-markers controls */}
            {(step === "manual" || parseFailed || !parsing) && (
              <AddMarkerControls onAdd={addMarker} onAddPackage={addPackage} existing={rows.map((r) => r.field)} />
            )}
          </div>

          {parsing ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 text-sm text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              Extracting lab values…
            </div>
          ) : (
            <ScrollArea className="flex-1">
              <div className="p-4 space-y-5">
                {rows.length === 0 && (
                  <div className="text-sm text-muted-foreground text-center py-12">
                    No markers added yet. Use the search above to add markers, or pick a package.
                  </div>
                )}
                {LAB_DIMENSIONS.map((dim) => {
                  const dimRows = grouped[dim] ?? [];
                  if (dimRows.length === 0) return null;
                  return (
                    <div key={dim}>
                      <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                        {dim}
                      </div>
                      <div className="rounded-xl border bg-card divide-y">
                        {dimRows.map((r) => {
                          const m = getMarkerByField(r.field)!;
                          return (
                            <MarkerRow
                              key={r.field}
                              row={r}
                              marker={m}
                              onChange={(v) => updateRowValue(r.field, v)}
                              onRemove={() => removeRow(r.field)}
                              showConfidence={step === "verify" && !parseFailed}
                            />
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          )}

          <div className="px-5 py-3 border-t bg-background flex items-center justify-between gap-3">
            <Button variant="outline" onClick={() => setStep("upload")}>Back</Button>
            <Button onClick={handleSave} disabled={saving || rows.length === 0} className="gap-2">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              {step === "verify" ? "Confirm & Save" : "Save Lab Results"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Header({ title, subtitle, onBack }: { title: string; subtitle?: string; onBack: () => void }) {
  return (
    <header className="border-b bg-background px-5 py-3 flex items-center gap-3">
      <Button variant="ghost" size="icon" onClick={onBack} aria-label="Back">
        <ArrowLeft className="h-5 w-5" />
      </Button>
      <div className="min-w-0">
        <h1 className="font-semibold leading-tight truncate">{title}</h1>
        {subtitle && <p className="text-xs text-muted-foreground truncate">{subtitle}</p>}
      </div>
    </header>
  );
}

function MarkerRow({
  row, marker, onChange, onRemove, showConfidence,
}: {
  row: ExtractedRow;
  marker: LabMarker;
  onChange: (v: string) => void;
  onRemove: () => void;
  showConfidence: boolean;
}) {
  return (
    <div className="flex items-center gap-3 px-3 py-2">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium truncate">{marker.label}</span>
          {showConfidence && <ConfidenceBadge c={row.confidence} />}
        </div>
        {marker.reference && (
          <div className="text-[10px] text-muted-foreground">Ref: {marker.reference}</div>
        )}
      </div>
      {marker.type === "boolean" ? (
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            {row.value === "true" ? "Abnormal" : "Normal"}
          </span>
          <Switch
            checked={row.value === "true"}
            onCheckedChange={(v) => onChange(v ? "true" : "false")}
          />
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <Input
            value={row.value}
            onChange={(e) => onChange(e.target.value)}
            className="h-8 w-24 text-sm"
            inputMode="decimal"
            placeholder="—"
          />
          {marker.unit && (
            <span className="text-xs text-muted-foreground w-20">{marker.unit}</span>
          )}
        </div>
      )}
      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onRemove} aria-label="Remove">
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}

function AddMarkerControls({
  onAdd, onAddPackage, existing,
}: {
  onAdd: (field: string) => void;
  onAddPackage: (markers: string[]) => void;
  existing: string[];
}) {
  const [open, setOpen] = useState(false);
  const existingSet = new Set(existing);

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground mr-1">Packages:</span>
        {LAB_PACKAGES.map((p) => (
          <Button
            key={p.key}
            size="sm"
            variant="secondary"
            className="h-7 text-xs"
            onClick={() => onAddPackage(p.markers)}
            title={p.description}
          >
            <Plus className="h-3 w-3" /> {p.label}
          </Button>
        ))}
      </div>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="w-full justify-start gap-2 h-9">
            <Search className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground font-normal">Search markers…</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="p-0 w-[--radix-popover-trigger-width] max-h-[60vh] overflow-hidden bg-popover z-50" align="start">
          <Command>
            <CommandInput placeholder="Search markers…" />
            <CommandList className="max-h-[50vh]">
              <CommandEmpty>No markers found.</CommandEmpty>
              {LAB_DIMENSIONS.map((dim) => {
                const items = LAB_MARKERS.filter((m) => m.dimension === dim);
                if (items.length === 0) return null;
                return (
                  <CommandGroup key={dim} heading={dim}>
                    {items.map((m) => {
                      const added = existingSet.has(m.field);
                      return (
                        <CommandItem
                          key={m.field}
                          value={`${m.label} ${m.field}`}
                          onSelect={() => { onAdd(m.field); }}
                          className="flex items-center justify-between"
                        >
                          <span className="flex items-center gap-2">
                            {m.label}
                            {m.unit && <span className="text-xs text-muted-foreground">({m.unit})</span>}
                          </span>
                          {added ? (
                            <Check className="h-3.5 w-3.5 text-primary" />
                          ) : (
                            <Plus className="h-3.5 w-3.5 text-muted-foreground" />
                          )}
                        </CommandItem>
                      );
                    })}
                  </CommandGroup>
                );
              })}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
