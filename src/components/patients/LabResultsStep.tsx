import { useState, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Upload, FileText, CloudDownload } from "lucide-react";
import { toast } from "sonner";

export type LabResultsData = {
  result_date: string;
  ldl_mmol_l: number | null;
  hba1c_mmol_mol: number | null;
  blood_pressure_systolic: number | null;
  blood_pressure_diastolic: number | null;
  alat_u_l: number | null;
  afos_alp_u_l: number | null;
  gt_u_l: number | null;
  alat_asat_ratio: number | null;
  egfr: number | null;
  cystatin_c: number | null;
  u_alb_krea_abnormal: boolean | null;
  tsh_mu_l: number | null;
  testosterone_estrogen_abnormal: boolean | null;
  apoe_e4: boolean | null;
  pef_percent: number | null;
  fev1_percent: number | null;
  fvc_percent: number | null;
  source: "manual" | "file_upload" | "tandem";
  source_filename: string | null;
  _file_content: string | null;
};

export const defaultLabResults: LabResultsData = {
  result_date: new Date().toISOString().split("T")[0],
  ldl_mmol_l: null,
  hba1c_mmol_mol: null,
  blood_pressure_systolic: null,
  blood_pressure_diastolic: null,
  alat_u_l: null,
  afos_alp_u_l: null,
  gt_u_l: null,
  alat_asat_ratio: null,
  egfr: null,
  cystatin_c: null,
  u_alb_krea_abnormal: null,
  tsh_mu_l: null,
  testosterone_estrogen_abnormal: null,
  apoe_e4: null,
  pef_percent: null,
  fev1_percent: null,
  fvc_percent: null,
  source: "manual",
  source_filename: null,
  _file_content: null,
};

function NumField({ label, value, onChange, suffix, step }: {
  label: string; value: number | null; onChange: (v: number | null) => void; suffix?: string; step?: number;
}) {
  return (
    <div className="space-y-1">
      <Label>{label}{suffix ? ` (${suffix})` : ""}</Label>
      <Input
        type="number"
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))}
        step={step}
      />
    </div>
  );
}

// Simple parser that tries to extract lab values from text content
function parseLabText(text: string): Partial<LabResultsData> {
  const result: Partial<LabResultsData> = {};
  const lower = text.toLowerCase();

  const extractNum = (patterns: RegExp[]): number | null => {
    for (const p of patterns) {
      const m = lower.match(p);
      if (m) return parseFloat(m[1]);
    }
    return null;
  };

  result.ldl_mmol_l = extractNum([/ldl[^0-9]*?([\d.]+)/i]);
  result.hba1c_mmol_mol = extractNum([/hba1c[^0-9]*?([\d.]+)/i]);
  result.alat_u_l = extractNum([/\balat\b[^0-9]*?([\d.]+)/i]);
  result.afos_alp_u_l = extractNum([/(?:afos|alp)\b[^0-9]*?([\d.]+)/i]);
  result.gt_u_l = extractNum([/\bgt\b[^0-9]*?([\d.]+)/i, /\bggt\b[^0-9]*?([\d.]+)/i]);
  result.egfr = extractNum([/egfr[^0-9]*?([\d.]+)/i]);
  result.cystatin_c = extractNum([/cystatin[^0-9]*?([\d.]+)/i]);
  result.tsh_mu_l = extractNum([/\btsh\b[^0-9]*?([\d.]+)/i]);

  // Blood pressure pattern: e.g. "120/80"
  const bpMatch = text.match(/(\d{2,3})\s*[/]\s*(\d{2,3})/);
  if (bpMatch) {
    result.blood_pressure_systolic = parseInt(bpMatch[1]);
    result.blood_pressure_diastolic = parseInt(bpMatch[2]);
  }

  // ALAT/ASAT ratio
  const ratioMatch = lower.match(/alat\s*[/]\s*asat[^0-9]*?([\d.]+)/);
  if (ratioMatch) result.alat_asat_ratio = parseFloat(ratioMatch[1]);

  // Date extraction
  const dateMatch = text.match(/(\d{4}[-/]\d{1,2}[-/]\d{1,2})/);
  if (dateMatch) result.result_date = dateMatch[1].replace(/\//g, "-");

  return result;
}

interface Props {
  data: LabResultsData;
  onChange: (data: LabResultsData) => void;
}

export function LabResultsStep({ data, onChange }: Props) {
  const [tab, setTab] = useState<string>("manual");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const tandemFileInputRef = useRef<HTMLInputElement>(null);

  const update = (field: keyof LabResultsData, value: any) => {
    onChange({ ...data, [field]: value });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, sourceType: "file_upload" | "tandem" = "file_upload") => {
    const file = e.target.files?.[0];
    if (!file) return;

    const ext = file.name.split(".").pop()?.toLowerCase();
    if (!["pdf", "txt", "html"].includes(ext || "")) {
      toast.error("Only .pdf, .txt, and .html files are supported");
      return;
    }

    if (ext === "pdf") {
      onChange({
        ...data,
        source: sourceType,
        source_filename: file.name,
      });
      toast.info("PDF uploaded. Please verify or fill in the values manually.");
      return;
    }

    const text = await file.text();
    const parsed = parseLabText(text);
    onChange({
      ...data,
      ...parsed,
      source: sourceType,
      source_filename: file.name,
      _file_content: null,
    });
    toast.success(`Parsed ${file.name} — please review extracted values`);
  };

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <Label>Result Date *</Label>
        <Input
          type="date"
          value={data.result_date}
          onChange={(e) => update("result_date", e.target.value)}
        />
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="manual" className="gap-1.5">
            <FileText className="h-3.5 w-3.5" /> Manual Entry
          </TabsTrigger>
          <TabsTrigger value="upload" className="gap-1.5">
            <Upload className="h-3.5 w-3.5" /> Upload File
          </TabsTrigger>
          <TabsTrigger value="tandem" className="gap-1.5">
            <CloudDownload className="h-3.5 w-3.5" /> Upload from Tandem
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upload" className="space-y-3 pt-2">
          <p className="text-sm text-muted-foreground">
            Upload a lab report (.pdf, .txt, or .html). For .txt and .html files, values will be auto-extracted where possible.
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.txt,.html"
            onChange={(e) => handleFileUpload(e, "file_upload")}
            className="hidden"
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            className="gap-2"
          >
            <Upload className="h-4 w-4" />
            {data.source === "file_upload" && data.source_filename ? `Uploaded: ${data.source_filename}` : "Choose File"}
          </Button>
          {data.source === "file_upload" && data.source_filename && (
            <p className="text-xs text-muted-foreground">Review the values below and correct as needed.</p>
          )}
        </TabsContent>

        <TabsContent value="tandem" className="space-y-3 pt-2">
          <p className="text-sm text-muted-foreground">
            Upload a lab report exported from Tandem (.pdf, .txt, or .html). Values will be auto-extracted where possible.
          </p>
          <input
            ref={tandemFileInputRef}
            type="file"
            accept=".pdf,.txt,.html"
            onChange={(e) => handleFileUpload(e, "tandem")}
            className="hidden"
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => tandemFileInputRef.current?.click()}
            className="gap-2"
          >
            <CloudDownload className="h-4 w-4" />
            {data.source === "tandem" && data.source_filename ? `Uploaded: ${data.source_filename}` : "Choose Tandem File"}
          </Button>
          {data.source === "tandem" && data.source_filename && (
            <p className="text-xs text-muted-foreground">Review the values below and correct as needed.</p>
          )}
        </TabsContent>

        <TabsContent value="manual" className="pt-2">
          <p className="text-sm text-muted-foreground">Enter lab results manually below.</p>
        </TabsContent>
      </Tabs>

      {/* Lab result fields — always shown */}
      <div className="space-y-5">
        <div>
          <h4 className="font-medium text-sm mb-3 text-muted-foreground uppercase tracking-wide">
            Cardiovascular & Metabolic Health
          </h4>
          <div className="grid gap-3 sm:grid-cols-2">
            <NumField label="LDL" suffix="mmol/l" value={data.ldl_mmol_l} onChange={(v) => update("ldl_mmol_l", v)} step={0.01} />
            <NumField label="HbA1c" suffix="mmol/mol" value={data.hba1c_mmol_mol} onChange={(v) => update("hba1c_mmol_mol", v)} step={0.1} />
            <NumField label="Blood Pressure — Systolic" suffix="mmHg" value={data.blood_pressure_systolic} onChange={(v) => update("blood_pressure_systolic", v)} />
            <NumField label="Blood Pressure — Diastolic" suffix="mmHg" value={data.blood_pressure_diastolic} onChange={(v) => update("blood_pressure_diastolic", v)} />
          </div>
        </div>

        <div>
          <h4 className="font-medium text-sm mb-3 text-muted-foreground uppercase tracking-wide">
            Liver Function
          </h4>
          <div className="grid gap-3 sm:grid-cols-2">
            <NumField label="ALAT" suffix="U/l" value={data.alat_u_l} onChange={(v) => update("alat_u_l", v)} />
            <NumField label="AFOS / ALP" suffix="U/l" value={data.afos_alp_u_l} onChange={(v) => update("afos_alp_u_l", v)} />
            <NumField label="GT" suffix="U/l" value={data.gt_u_l} onChange={(v) => update("gt_u_l", v)} />
            <NumField label="ALAT / ASAT Ratio" value={data.alat_asat_ratio} onChange={(v) => update("alat_asat_ratio", v)} step={0.01} />
          </div>
        </div>

        <div>
          <h4 className="font-medium text-sm mb-3 text-muted-foreground uppercase tracking-wide">
            Kidney Function
          </h4>
          <div className="grid gap-3 sm:grid-cols-2">
            <NumField label="eGFR" suffix="ml/min/1.73 m²" value={data.egfr} onChange={(v) => update("egfr", v)} />
            <NumField label="Cystatin C" suffix="mg/l" value={data.cystatin_c} onChange={(v) => update("cystatin_c", v)} step={0.01} />
            <div className="flex items-center justify-between sm:col-span-2">
              <Label>U-Alb/Krea, abnormal</Label>
              <Switch checked={data.u_alb_krea_abnormal ?? false} onCheckedChange={(v) => update("u_alb_krea_abnormal", v)} />
            </div>
          </div>
        </div>

        <div>
          <h4 className="font-medium text-sm mb-3 text-muted-foreground uppercase tracking-wide">
            Endocrine & Hormonal Health
          </h4>
          <div className="grid gap-3 sm:grid-cols-2">
            <NumField label="TSH" suffix="mU/l" value={data.tsh_mu_l} onChange={(v) => update("tsh_mu_l", v)} step={0.01} />
            <div className="flex items-center justify-between">
              <Label>Testosterone / Estrogen, abnormal</Label>
              <Switch checked={data.testosterone_estrogen_abnormal ?? false} onCheckedChange={(v) => update("testosterone_estrogen_abnormal", v)} />
            </div>
          </div>
        </div>

        <div>
          <h4 className="font-medium text-sm mb-3 text-muted-foreground uppercase tracking-wide">
            Genetics & Risk Markers
          </h4>
          <div className="flex items-center justify-between">
            <Label>APOE ε4</Label>
            <Switch checked={data.apoe_e4 ?? false} onCheckedChange={(v) => update("apoe_e4", v)} />
          </div>
        </div>

        <div>
          <h4 className="font-medium text-sm mb-3 text-muted-foreground uppercase tracking-wide">
            Spirometry
          </h4>
          <div className="grid gap-3 sm:grid-cols-2">
            <NumField label="PEF" suffix="%" value={data.pef_percent} onChange={(v) => update("pef_percent", v)} step={0.1} />
            <NumField label="FEV1" suffix="%" value={data.fev1_percent} onChange={(v) => update("fev1_percent", v)} step={0.1} />
            <NumField label="FVC" suffix="%" value={data.fvc_percent} onChange={(v) => update("fvc_percent", v)} step={0.1} />
          </div>
        </div>
      </div>
    </div>
  );
}
