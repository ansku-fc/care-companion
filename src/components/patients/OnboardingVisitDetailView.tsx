import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  Calendar,
  Stethoscope,
  CheckCircle2,
  FileText,
  Lock,
  Pencil,
  Save,
  History,
  AlertTriangle,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { toast } from "sonner";

interface Props {
  patient: Tables<"patients">;
  visit: Tables<"visit_notes">;
  onBack: () => void;
}

type DocStatus = "draft" | "finalised";

interface EditLogEntry {
  ts: string;
  editor: string;
  action: string;
  reason?: string;
}

interface DocState {
  status: DocStatus;
  finalised_at?: string | null;
  finalised_by?: string | null;
  doctor_summary?: string;
  recommendations?: string;
  overrides?: Record<string, any>;
  edit_log: EditLogEntry[];
}

const DEFAULT_EDITOR = "Dr. Laine";

function fmtDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function fmtDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function StatusBadge({ status }: { status: DocStatus }) {
  if (status === "draft") {
    return (
      <Badge className="gap-1 bg-yellow-100 text-yellow-900 hover:bg-yellow-100 border border-yellow-300">
        <FileText className="h-3 w-3" /> Draft
      </Badge>
    );
  }
  return (
    <Badge className="gap-1 bg-green-100 text-green-900 hover:bg-green-100 border border-green-300">
      <Lock className="h-3 w-3" /> Finalised
    </Badge>
  );
}

function Field({
  label,
  value,
  editing,
  onChange,
  placeholder,
}: {
  label: string;
  value: any;
  editing: boolean;
  onChange?: (v: string) => void;
  placeholder?: string;
}) {
  if (editing) {
    return (
      <div className="text-sm grid grid-cols-[140px_1fr] items-center gap-2">
        <span className="text-muted-foreground">{label}</span>
        <Input
          value={value ?? ""}
          onChange={(e) => onChange?.(e.target.value)}
          placeholder={placeholder ?? "—"}
          className="h-8"
        />
      </div>
    );
  }
  if (value === null || value === undefined || value === "") return null;
  return (
    <div className="text-sm">
      <span className="text-muted-foreground">{label}: </span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">{children}</CardContent>
    </Card>
  );
}

const REOPEN_REASONS = [
  "Correction of error",
  "New clinical information",
  "Patient request",
  "Other",
];

export function OnboardingVisitDetailView({ patient, visit, onBack }: Props) {
  const [onboarding, setOnboarding] = useState<any>(null);
  const [allergies, setAllergies] = useState<Tables<"patient_allergies">[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const initialDoc: DocState = useMemo(() => {
    const ed = ((visit as any).extra_data ?? {}) as any;
    return {
      status: (ed.status as DocStatus) ?? "draft",
      finalised_at: ed.finalised_at ?? null,
      finalised_by: ed.finalised_by ?? null,
      doctor_summary: ed.doctor_summary ?? "",
      recommendations: ed.recommendations ?? "",
      overrides: ed.overrides ?? {},
      edit_log: Array.isArray(ed.edit_log) ? ed.edit_log : [],
    };
  }, [visit]);

  const [doc, setDoc] = useState<DocState>(initialDoc);

  // Re-open dialog
  const [reopenOpen, setReopenOpen] = useState(false);
  const [reopenReason, setReopenReason] = useState<string>(REOPEN_REASONS[0]);
  const [reopenOther, setReopenOther] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [obRes, alRes] = await Promise.all([
        supabase.from("patient_onboarding").select("*").eq("patient_id", patient.id).maybeSingle(),
        supabase.from("patient_allergies").select("*").eq("patient_id", patient.id),
      ]);
      if (cancelled) return;
      setOnboarding(obRes.data);
      setAllergies(alRes.data || []);
      setLoading(false);
      // Seed creation log entry once
      if ((initialDoc.edit_log ?? []).length === 0) {
        setDoc((d) => ({
          ...d,
          edit_log: [
            {
              ts: visit.created_at ?? new Date().toISOString(),
              editor: "System",
              action: "Created from onboarding data",
            },
          ],
        }));
      }
    })();
    return () => { cancelled = true; };
  }, [patient.id]);

  const ex = (onboarding?.extra_data ?? {}) as any;
  const moles: any[] = Array.isArray(ex.moles) ? ex.moles : [];
  const family: any[] = Array.isArray(ex.family_history) ? ex.family_history : [];
  const currentIllnesses: any[] = Array.isArray(ex.current_illnesses) ? ex.current_illnesses : [];
  const previousIllnesses: any[] = Array.isArray(ex.previous_illnesses) ? ex.previous_illnesses : [];
  const supplements: any[] = Array.isArray(ex.supplements) ? ex.supplements : [];

  const isFinalised = doc.status === "finalised";
  const editing = !isFinalised; // editable in draft & under_review

  const overrides = doc.overrides ?? {};
  const ov = (key: string, fallback: any) =>
    overrides[key] !== undefined ? overrides[key] : fallback;

  function setOverride(key: string, value: any) {
    setDoc((d) => ({ ...d, overrides: { ...(d.overrides ?? {}), [key]: value } }));
  }

  async function persist(next: DocState) {
    setSaving(true);
    const { error } = await supabase
      .from("visit_notes")
      .update({ extra_data: next as any })
      .eq("id", visit.id);
    setSaving(false);
    if (error) {
      toast.error("Failed to save document");
      return false;
    }
    return true;
  }

  function appendLog(entry: EditLogEntry, base: DocState = doc): DocState {
    return { ...base, edit_log: [...(base.edit_log ?? []), entry] };
  }

  async function handleSaveEdits() {
    const next = appendLog({
      ts: new Date().toISOString(),
      editor: DEFAULT_EDITOR,
      action: "Field updated",
    });
    if (await persist(next)) {
      setDoc(next);
      toast.success("Document saved");
    }
  }

  async function handleFinalise() {
    const ts = new Date().toISOString();
    const next = appendLog(
      {
        ts,
        editor: DEFAULT_EDITOR,
        action: "Status changed: Draft → Finalised",
      },
      { ...doc, status: "finalised", finalised_at: ts, finalised_by: DEFAULT_EDITOR }
    );
    if (await persist(next)) {
      setDoc(next);
      toast.success("Document finalised");
    }
  }

  async function handleConfirmReopen() {
    const reason =
      reopenReason === "Other" ? `Other: ${reopenOther.trim() || "(no detail)"}` : reopenReason;
    const next = appendLog(
      {
        ts: new Date().toISOString(),
        editor: DEFAULT_EDITOR,
        action: "Re-opened for editing",
        reason,
      },
      { ...doc, status: "draft", finalised_at: null, finalised_by: null }
    );
    if (await persist(next)) {
      setDoc(next);
      setReopenOpen(false);
      setReopenOther("");
      setReopenReason(REOPEN_REASONS[0]);
      toast.success("Document re-opened. You can now edit.");
    }
  }

  const whRatio = onboarding?.waist_circumference_cm && onboarding?.hip_circumference_cm
    ? (Number(onboarding.waist_circumference_cm) / Number(onboarding.hip_circumference_cm)).toFixed(2)
    : null;

  const meaningfulCurrent = currentIllnesses.filter((i: any) => i?.illness_name?.trim());
  const meaningfulPrevious = previousIllnesses.filter((i: any) => i?.illness_name?.trim());

  function renderIllness(i: any) {
    const meds: any[] = Array.isArray(i.medications) ? i.medications : [];
    return (
      <div key={i.id ?? i.illness_name} className="text-sm">
        <div className="font-medium">
          {i.icd_code ? <span className="text-muted-foreground mr-1">{i.icd_code}</span> : null}
          {i.illness_name}
          {i.onset_year ? <span className="text-muted-foreground"> · onset {i.onset_year}</span> : null}
          {i.resolved_year ? <span className="text-muted-foreground"> · resolved {i.resolved_year}</span> : null}
        </div>
        {meds.length > 0 && (
          <div className="mt-1 flex flex-wrap gap-1">
            {meds.map((m: any, idx: number) => (
              <Badge key={idx} variant="outline" className="text-[11px] font-normal">
                {m.atc_code ? `${m.atc_code} ` : ""}
                {m.name}
                {m.dose ? ` · ${m.dose}` : ""}
                {m.frequency ? ` · ${m.frequency}` : ""}
                {m.route ? ` · ${m.route}` : ""}
              </Badge>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onBack} className="gap-1.5">
          <ArrowLeft className="h-4 w-4" /> Back to Visits
        </Button>
      </div>

      {/* Header / status card */}
      <Card>
        <CardContent className="py-4 flex items-center justify-between flex-wrap gap-3">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg font-semibold">Initial Consultation / Onboarding</h2>
              <StatusBadge status={doc.status} />
              {doc.status === "finalised" ? (
                <Badge className="gap-1 bg-green-100 text-green-900 hover:bg-green-100 border border-green-300">
                  <CheckCircle2 className="h-3 w-3" /> Visit Completed
                </Badge>
              ) : (
                <Badge className="gap-1 bg-yellow-100 text-yellow-900 hover:bg-yellow-100 border border-yellow-300">
                  <CheckCircle2 className="h-3 w-3" /> Awaiting Review
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground flex-wrap">
              <span className="flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" /> {fmtDate(visit.visit_date)}
              </span>
              <span className="flex items-center gap-1.5">
                <Stethoscope className="h-3.5 w-3.5" /> Dr. Laine
              </span>
              {doc.status === "finalised" && doc.finalised_at && (
                <span className="flex items-center gap-1.5">
                  <Lock className="h-3.5 w-3.5" /> Finalised by {doc.finalised_by ?? "Dr. Laine"} ·{" "}
                  {fmtDateTime(doc.finalised_at)}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {doc.status === "draft" && (
              <>
                <Button size="sm" variant="outline" onClick={handleSaveEdits} disabled={saving} className="gap-1.5">
                  <Save className="h-3.5 w-3.5" /> Save
                </Button>
                <Button size="sm" onClick={handleFinalise} disabled={saving} className="gap-1.5">
                  <Lock className="h-3.5 w-3.5" /> Finalise Document
                </Button>
              </>
            )}
            {doc.status === "finalised" && (
              <Button size="sm" variant="outline" onClick={() => setReopenOpen(true)} className="gap-1.5">
                <Pencil className="h-3.5 w-3.5" /> Edit document
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {isFinalised && (
        <div className="text-xs text-muted-foreground flex items-center gap-1.5 px-1">
          <Lock className="h-3 w-3" /> This document is finalised and read-only. Click "Edit document" to re-open.
        </div>
      )}

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading onboarding data…</p>
      ) : !onboarding ? (
        <p className="text-sm text-muted-foreground">No onboarding data found for this patient.</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          <Section title="Basic Information">
            <Field label="Age" value={ov("age", onboarding.age)} editing={editing} onChange={(v) => setOverride("age", v)} />
            <Field label="Height" value={ov("height_cm", onboarding.height_cm ? `${onboarding.height_cm} cm` : "")} editing={editing} onChange={(v) => setOverride("height_cm", v)} />
            <Field label="Weight" value={ov("weight_kg", onboarding.weight_kg ? `${onboarding.weight_kg} kg` : "")} editing={editing} onChange={(v) => setOverride("weight_kg", v)} />
            <Field label="BMI" value={ov("bmi", onboarding.bmi)} editing={editing} onChange={(v) => setOverride("bmi", v)} />
            <Field label="Waist" value={ov("waist", onboarding.waist_circumference_cm ? `${onboarding.waist_circumference_cm} cm` : "")} editing={editing} onChange={(v) => setOverride("waist", v)} />
            <Field label="Hip" value={ov("hip", onboarding.hip_circumference_cm ? `${onboarding.hip_circumference_cm} cm` : "")} editing={editing} onChange={(v) => setOverride("hip", v)} />
            <Field label="W/H" value={ov("wh", whRatio)} editing={editing} onChange={(v) => setOverride("wh", v)} />
            <Separator className="my-2" />
            <Field label="Occupation" value={ov("occupation", onboarding.occupation)} editing={editing} onChange={(v) => setOverride("occupation", v)} />
            <Field label="Education" value={ov("education", onboarding.education_level)} editing={editing} onChange={(v) => setOverride("education", v)} />
            <Field label="Shift work" value={ov("shift_work", onboarding.shift_work === true ? "Yes" : onboarding.shift_work === false ? "No" : "")} editing={editing} onChange={(v) => setOverride("shift_work", v)} />
          </Section>

          <Section title="Diagnostics">
            <Field
              label="BP 1st"
              value={ov("bp1", onboarding.bp1_systolic && onboarding.bp1_diastolic ? `${onboarding.bp1_systolic}/${onboarding.bp1_diastolic} mmHg` : "")}
              editing={editing}
              onChange={(v) => setOverride("bp1", v)}
            />
            <Field
              label="BP 2nd"
              value={ov("bp2", onboarding.bp2_systolic && onboarding.bp2_diastolic ? `${onboarding.bp2_systolic}/${onboarding.bp2_diastolic} mmHg` : "")}
              editing={editing}
              onChange={(v) => setOverride("bp2", v)}
            />
            <Field label="ECG notes" value={ov("ecg_notes", onboarding.ecg_notes)} editing={editing} onChange={(v) => setOverride("ecg_notes", v)} />
          </Section>

          <Section title="Illnesses & Medications">
            <div className="text-sm font-medium">Current</div>
            {meaningfulCurrent.length === 0 ? (
              <p className="text-sm text-muted-foreground">None recorded</p>
            ) : (
              <div className="space-y-2">{meaningfulCurrent.map(renderIllness)}</div>
            )}
            <Separator className="my-2" />
            <div className="text-sm font-medium">Previous</div>
            {meaningfulPrevious.length === 0 ? (
              <p className="text-sm text-muted-foreground">None recorded</p>
            ) : (
              <div className="space-y-2">{meaningfulPrevious.map(renderIllness)}</div>
            )}
          </Section>

          <Section title="Allergies">
            {allergies.length === 0 ? (
              <p className="text-sm text-muted-foreground">None recorded</p>
            ) : (
              <div className="space-y-1">
                {allergies.map((a) => (
                  <div key={a.id} className="text-sm">
                    {a.icd_code ? <span className="text-muted-foreground mr-1">{a.icd_code}</span> : null}
                    <span className="font-medium">{a.allergen}</span>
                    {a.severity ? <Badge variant="outline" className="ml-2 text-[11px]">{a.severity}</Badge> : null}
                    {a.reaction ? <div className="text-xs text-muted-foreground">{a.reaction}</div> : null}
                  </div>
                ))}
              </div>
            )}
          </Section>

          <Section title="Supplements">
            {supplements.length === 0 ? (
              <p className="text-sm text-muted-foreground">None recorded</p>
            ) : (
              <div className="flex flex-wrap gap-1">
                {supplements.map((s: any, idx: number) => (
                  <Badge key={idx} variant="outline" className="text-[11px] font-normal">
                    {typeof s === "string" ? s : `${s.name ?? ""}${s.dose ? ` · ${s.dose}` : ""}${s.frequency ? ` · ${s.frequency}` : ""}`}
                  </Badge>
                ))}
              </div>
            )}
          </Section>

          <Section title="Family History">
            {family.length === 0 ? (
              <p className="text-sm text-muted-foreground">None recorded</p>
            ) : (
              family.map((f: any) => (
                <div key={f.id} className="text-sm">
                  <span className="font-medium">{f.relative}</span>
                  <span className="text-muted-foreground"> · {f.illness_name}</span>
                  {f.age_at_diagnosis ? <span className="text-muted-foreground"> · {f.age_at_diagnosis}</span> : null}
                </div>
              ))
            )}
          </Section>

          <Section title="Lifestyle">
            <Field
              label="Nicotine pouches"
              value={ov("nic", ex.nicotine_pouches_current ? `${ex.nicotine_pouches_per_day ?? "—"}/day · ${ex.nicotine_pouches_strength ?? ""}`.trim() : "")}
              editing={editing}
              onChange={(v) => setOverride("nic", v)}
            />
            <Field label="Smoking" value={ov("smoking", ex.smoking_current ? "Yes" : ex.smoking_previous ? "Previously" : "No")} editing={editing} onChange={(v) => setOverride("smoking", v)} />
            <Field label="Alcohol" value={ov("alcohol", ex.alcohol_current ? `${onboarding.alcohol_units_per_week ?? ""} units/week` : "No")} editing={editing} onChange={(v) => setOverride("alcohol", v)} />
            <Field label="Caffeine" value={ov("caffeine", ex.caffeine_current ? `${ex.caffeine_cups_per_day ?? ""} cups/day` : "No")} editing={editing} onChange={(v) => setOverride("caffeine", v)} />
            <Field label="Drugs" value={ov("drugs", ex.drugs_current ? "Yes" : "No")} editing={editing} onChange={(v) => setOverride("drugs", v)} />
          </Section>

          <Section title="Physical Activity">
            <Field label="Cardio easy" value={ov("ce", onboarding.cardio_easy_hours_per_week ? `${onboarding.cardio_easy_hours_per_week} h/week` : "")} editing={editing} onChange={(v) => setOverride("ce", v)} />
            <Field label="Cardio moderate" value={ov("cm", onboarding.cardio_moderate_hours_per_week ? `${onboarding.cardio_moderate_hours_per_week} h/week` : "")} editing={editing} onChange={(v) => setOverride("cm", v)} />
            <Field label="Cardio vigorous" value={ov("cv", onboarding.cardio_vigorous_hours_per_week ? `${onboarding.cardio_vigorous_hours_per_week} h/week` : "")} editing={editing} onChange={(v) => setOverride("cv", v)} />
            <Field label="Strength" value={ov("str", onboarding.strength_hours_per_week ? `${onboarding.strength_hours_per_week} h/week` : "")} editing={editing} onChange={(v) => setOverride("str", v)} />
            <Field label="MET" value={ov("met", onboarding.exercise_met_hours ? `${onboarding.exercise_met_hours} h/week` : "")} editing={editing} onChange={(v) => setOverride("met", v)} />
            <Field label="Sedentary" value={ov("sed", onboarding.sedentary_hours_per_day ? `${onboarding.sedentary_hours_per_day} h/day` : "")} editing={editing} onChange={(v) => setOverride("sed", v)} />
          </Section>

          <Section title="Nutrition">
            <Field label="Diet" value={ov("diet", ex.diet_type)} editing={editing} onChange={(v) => setOverride("diet", v)} />
            <Field label="Water" value={ov("water", ex.water_litres_per_day ? `${ex.water_litres_per_day} L/day` : "")} editing={editing} onChange={(v) => setOverride("water", v)} />
            <Field label="Fruit & veg" value={ov("fv", onboarding.fruits_vegetables_g_per_day ? `${onboarding.fruits_vegetables_g_per_day} g` : "")} editing={editing} onChange={(v) => setOverride("fv", v)} />
            <Field label="Red meat" value={ov("rm", onboarding.red_meat_g_per_day ? `${onboarding.red_meat_g_per_day} g` : "")} editing={editing} onChange={(v) => setOverride("rm", v)} />
            <Field label="Sugar" value={ov("sugar", onboarding.sugar_g_per_day ? `${onboarding.sugar_g_per_day} g` : "")} editing={editing} onChange={(v) => setOverride("sugar", v)} />
            <Field label="Fiber" value={ov("fiber", onboarding.fiber_g_per_day ? `${onboarding.fiber_g_per_day} g` : "")} editing={editing} onChange={(v) => setOverride("fiber", v)} />
          </Section>

          <Section title="Sleep">
            <Field label="Quality" value={ov("sq", onboarding.sleep_quality ? `${onboarding.sleep_quality}/10` : "")} editing={editing} onChange={(v) => setOverride("sq", v)} />
            <Field label="Daytime fatigue" value={ov("df", ex.daytime_fatigue ? `${ex.daytime_fatigue}/10` : "")} editing={editing} onChange={(v) => setOverride("df", v)} />
            <Field label="Bedtime" value={ov("bed", ex.sleep_bedtime)} editing={editing} onChange={(v) => setOverride("bed", v)} />
            <Field label="Wake" value={ov("wake", ex.sleep_waking_time)} editing={editing} onChange={(v) => setOverride("wake", v)} />
            <Field label="Deep sleep" value={ov("deep", onboarding.deep_sleep_percent ? `${onboarding.deep_sleep_percent}%` : "")} editing={editing} onChange={(v) => setOverride("deep", v)} />
            <Field
              label="Disorders"
              value={ov("sd", ex.sleep_apnea || ex.restless_legs ? [ex.sleep_apnea ? "Sleep apnea" : null, ex.restless_legs ? "Restless legs" : null].filter(Boolean).join(", ") : "None")}
              editing={editing}
              onChange={(v) => setOverride("sd", v)}
            />
          </Section>

          <Section title="Mental Health">
            <Field label="Stress" value={ov("stress", onboarding.stress_perceived ? `${onboarding.stress_perceived}/10` : "")} editing={editing} onChange={(v) => setOverride("stress", v)} />
            <Field label="Workload" value={ov("workload", ex.workload_perceived ? `${ex.workload_perceived}/10` : "")} editing={editing} onChange={(v) => setOverride("workload", v)} />
            <Field label="Recovery" value={ov("recovery", ex.recovery_perceived ? `${ex.recovery_perceived}/10` : "")} editing={editing} onChange={(v) => setOverride("recovery", v)} />
            <Field label="Social support" value={ov("ss", onboarding.social_support_perceived ? `${onboarding.social_support_perceived}/10` : "")} editing={editing} onChange={(v) => setOverride("ss", v)} />
            <Field label="GAD-2" value={ov("gad2", onboarding.gad2_score)} editing={editing} onChange={(v) => setOverride("gad2", v)} />
            <Field label="PHQ-2" value={ov("phq2", onboarding.phq2_score)} editing={editing} onChange={(v) => setOverride("phq2", v)} />
          </Section>

          <Section title="Cancer Screenings">
            <Field label="Breast" value={ov("scr_b", ex.screen_breast_year)} editing={editing} onChange={(v) => setOverride("scr_b", v)} />
            <Field label="Cervix" value={ov("scr_c", ex.screen_cervix_year)} editing={editing} onChange={(v) => setOverride("scr_c", v)} />
            <Field label="Colorectum" value={ov("scr_co", ex.screen_colorectum_year)} editing={editing} onChange={(v) => setOverride("scr_co", v)} />
            <Field label="Skin" value={ov("scr_s", ex.screen_skin_year)} editing={editing} onChange={(v) => setOverride("scr_s", v)} />
            <Field label="Sun exposure" value={ov("sun", onboarding.sun_exposure === true ? "Yes" : onboarding.sun_exposure === false ? "No" : "")} editing={editing} onChange={(v) => setOverride("sun", v)} />
            <Field label="Protection" value={ov("sun_p", ex.sun_protection_method)} editing={editing} onChange={(v) => setOverride("sun_p", v)} />
          </Section>

          <Section title="Physical Examination / Moles">
            {moles.length === 0 ? (
              <p className="text-sm text-muted-foreground">No moles recorded</p>
            ) : (
              moles.map((m: any) => {
                const flags = [m.asymmetry, m.borders, m.color, m.size, m.change, m.symptoms].filter(
                  (v) => v && v !== "Symmetrical" && v !== "Regular" && v !== "Single color" && v !== "No change" && v !== "None"
                );
                return (
                  <div key={m.id} className="text-sm">
                    <div className="font-medium flex items-center gap-2">
                      {m.label}: {m.location}
                      {flags.length > 0 && (
                        <Badge variant="outline" className="text-[11px] gap-1 border-amber-300 text-amber-900 bg-amber-50">
                          <AlertTriangle className="h-3 w-3" /> {flags.length} ABCDE flag{flags.length === 1 ? "" : "s"}
                        </Badge>
                      )}
                    </div>
                    <div className="text-muted-foreground text-xs mt-0.5">
                      {[m.asymmetry, m.borders, m.color, m.size, m.change, m.symptoms].filter(Boolean).join(" · ")}
                    </div>
                  </div>
                );
              })
            )}
          </Section>

          <Card className="md:col-span-2">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Clinical Synthesis
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label className="text-sm text-muted-foreground mb-1 block">Doctor's Summary</Label>
                {editing ? (
                  <Textarea
                    value={doc.doctor_summary ?? ""}
                    onChange={(e) => setDoc({ ...doc, doctor_summary: e.target.value })}
                    placeholder="Summarise the patient's clinical baseline…"
                    className="min-h-[100px]"
                  />
                ) : (
                  <p className="text-sm whitespace-pre-wrap">
                    {doc.doctor_summary?.trim() ? doc.doctor_summary : <span className="italic text-muted-foreground">(empty)</span>}
                  </p>
                )}
              </div>
              <Separator />
              <div>
                <Label className="text-sm text-muted-foreground mb-1 block">Recommendations</Label>
                {editing ? (
                  <Textarea
                    value={doc.recommendations ?? ""}
                    onChange={(e) => setDoc({ ...doc, recommendations: e.target.value })}
                    placeholder="Clinical recommendations and next steps…"
                    className="min-h-[100px]"
                  />
                ) : (
                  <p className="text-sm whitespace-pre-wrap">
                    {doc.recommendations?.trim() ? doc.recommendations : <span className="italic text-muted-foreground">(empty)</span>}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Edit history */}
          <Card className="md:col-span-2">
            <CardContent className="pt-4">
              <Accordion type="single" collapsible>
                <AccordionItem value="history" className="border-0">
                  <AccordionTrigger className="py-2 hover:no-underline">
                    <span className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                      <History className="h-4 w-4" /> Edit History ({doc.edit_log.length})
                    </span>
                  </AccordionTrigger>
                  <AccordionContent>
                    {doc.edit_log.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No changes recorded yet.</p>
                    ) : (
                      <div className="space-y-2">
                        {[...doc.edit_log].reverse().map((e, i) => (
                          <div key={i} className="text-sm border-l-2 border-muted pl-3 py-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-medium">{e.action}</span>
                              <span className="text-xs text-muted-foreground">· {e.editor}</span>
                              <span className="text-xs text-muted-foreground">· {fmtDateTime(e.ts)}</span>
                            </div>
                            {e.reason && (
                              <div className="text-xs text-muted-foreground mt-0.5">Reason: {e.reason}</div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Re-open dialog */}
      <Dialog open={reopenOpen} onOpenChange={setReopenOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Re-open document for editing</DialogTitle>
            <DialogDescription>
              Please provide a reason. The document will return to "Draft" and the reason will be recorded in the edit history.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-sm">Reason</Label>
              <Select value={reopenReason} onValueChange={setReopenReason}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {REOPEN_REASONS.map((r) => (
                    <SelectItem key={r} value={r}>{r}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {reopenReason === "Other" && (
              <div>
                <Label className="text-sm">Please specify</Label>
                <Textarea
                  value={reopenOther}
                  onChange={(e) => setReopenOther(e.target.value)}
                  placeholder="Describe the reason…"
                  className="mt-1"
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReopenOpen(false)}>Cancel</Button>
            <Button onClick={handleConfirmReopen} disabled={saving}>Confirm & Re-open</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
