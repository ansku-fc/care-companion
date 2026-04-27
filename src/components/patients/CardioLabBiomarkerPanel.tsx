import { useMemo, useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceArea,
  ReferenceLine,
} from "recharts";
import { MessageSquarePlus, StickyNote, Pencil, Trash2, Flag, ListChecks } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTaskActions } from "@/components/tasks/TaskProvider";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// ──────────────────────────────────────────────────────────────────────
// Annotations — patient-scoped, persisted in `marker_annotations` table.
// All reads/writes are scoped by (patient_id, marker_key).
// ──────────────────────────────────────────────────────────────────────
export type LabAnnotation = {
  id: string;
  biomarkerKey: string;
  biomarkerLabel: string;
  date: string; // ISO yyyy-mm-dd
  text: string;
  doctor: string;
  createdAt: string;
  updatedAt?: string;
};

export type AnnotationDeletionLog = {
  id: string;
  annotationId: string;
  biomarkerKey: string;
  biomarkerLabel: string;
  date: string;
  text: string;
  doctor: string;
  deletedBy: string;
  deletedAt: string;
  reason: string;
};

// In-memory deletion log (audit only, not persisted yet).
const annotationDeletionLog: AnnotationDeletionLog[] = [];

export function getAnnotationDeletionLog(): AnnotationDeletionLog[] {
  return [...annotationDeletionLog];
}

function useAnnotations(patientId: string | undefined, biomarkerKey: string, label: string) {
  const [annotations, setAnnotations] = useState<LabAnnotation[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!patientId) {
      setAnnotations([]);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from("marker_annotations")
      .select("*")
      .eq("patient_id", patientId)
      .eq("marker_key", biomarkerKey)
      .order("annotation_date", { ascending: true });
    setLoading(false);
    if (error) {
      console.error("[marker_annotations] load failed", error);
      setAnnotations([]);
      return;
    }
    setAnnotations(
      (data ?? []).map((r: any) => ({
        id: r.id,
        biomarkerKey: r.marker_key,
        biomarkerLabel: label,
        date: r.annotation_date,
        text: r.text,
        doctor: r.author_name ?? "Dr. Laine",
        createdAt: r.created_at,
        updatedAt: r.updated_at !== r.created_at ? r.updated_at : undefined,
      })),
    );
  }, [patientId, biomarkerKey, label]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const add = useCallback(
    async (date: string, text: string, doctor: string) => {
      if (!patientId) return;
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData.user?.id;
      if (!uid) {
        toast.error("Not signed in");
        return;
      }
      const { error } = await supabase.from("marker_annotations").insert({
        patient_id: patientId,
        marker_key: biomarkerKey,
        annotation_date: date,
        text,
        author_name: doctor,
        created_by: uid,
      });
      if (error) {
        toast.error(error.message);
        return;
      }
      await refresh();
    },
    [patientId, biomarkerKey, refresh],
  );

  const update = useCallback(
    async (id: string, patch: { text?: string; date?: string }) => {
      const upd: Record<string, unknown> = {};
      if (patch.text !== undefined) upd.text = patch.text;
      if (patch.date !== undefined) upd.annotation_date = patch.date;
      const { error } = await supabase.from("marker_annotations").update(upd).eq("id", id);
      if (error) {
        toast.error(error.message);
        return;
      }
      await refresh();
    },
    [refresh],
  );

  const remove = useCallback(
    async (id: string, reason: string, deletedBy: string) => {
      const target = annotations.find((a) => a.id === id);
      const { error } = await supabase.from("marker_annotations").delete().eq("id", id);
      if (error) {
        toast.error(error.message);
        return;
      }
      if (target) {
        annotationDeletionLog.push({
          id: `del-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          annotationId: target.id,
          biomarkerKey: target.biomarkerKey,
          biomarkerLabel: target.biomarkerLabel,
          date: target.date,
          text: target.text,
          doctor: target.doctor,
          deletedBy,
          deletedAt: new Date().toISOString(),
          reason,
        });
      }
      await refresh();
    },
    [annotations, refresh],
  );

  return { annotations, loading, add, update, remove };
}

// ──────────────────────────────────────────────────────────────────────
// Backward-compat module-level annotation API (patient-scoped).
// Older callers used `getAnnotations()`/`addAnnotation()` etc. without
// passing a patient id. They now operate on whichever patient is the
// "active" one — set via `setActiveAnnotationPatient(patientId)`.
// All data still comes from `marker_annotations` filtered by patient_id.
// ──────────────────────────────────────────────────────────────────────
type LegacyAnn = LabAnnotation & {
  includedInSummary?: boolean;
  includedInRecommendations?: boolean;
};

let activePatientId: string | undefined;
const legacyCache: LegacyAnn[] = [];
const legacyListeners = new Set<() => void>();
const legacyNotify = () => legacyListeners.forEach((l) => l());

async function reloadLegacyCache() {
  legacyCache.length = 0;
  if (!activePatientId) {
    legacyNotify();
    return;
  }
  const { data, error } = await supabase
    .from("marker_annotations")
    .select("*")
    .eq("patient_id", activePatientId)
    .order("annotation_date", { ascending: true });
  if (error) {
    console.error("[marker_annotations] legacy load failed", error);
    legacyNotify();
    return;
  }
  for (const r of data ?? []) {
    legacyCache.push({
      id: (r as any).id,
      biomarkerKey: (r as any).marker_key,
      biomarkerLabel: (r as any).marker_key,
      date: (r as any).annotation_date,
      text: (r as any).text,
      doctor: (r as any).author_name ?? "Dr. Laine",
      createdAt: (r as any).created_at,
      updatedAt:
        (r as any).updated_at !== (r as any).created_at ? (r as any).updated_at : undefined,
    });
  }
  legacyNotify();
}

export function setActiveAnnotationPatient(patientId: string | undefined) {
  if (activePatientId === patientId) return;
  activePatientId = patientId;
  void reloadLegacyCache();
}

export function getAnnotations(): LegacyAnn[] {
  return [...legacyCache];
}

export function getAnnotationsForBiomarker(key: string): LegacyAnn[] {
  return legacyCache.filter((a) => a.biomarkerKey === key);
}

export async function addAnnotation(a: {
  biomarkerKey: string;
  biomarkerLabel: string;
  date: string;
  text: string;
  doctor: string;
}): Promise<void> {
  if (!activePatientId) {
    toast.error("No active patient — cannot add annotation");
    return;
  }
  const { data: userData } = await supabase.auth.getUser();
  const uid = userData.user?.id;
  if (!uid) {
    toast.error("Not signed in");
    return;
  }
  const { error } = await supabase.from("marker_annotations").insert({
    patient_id: activePatientId,
    marker_key: a.biomarkerKey,
    annotation_date: a.date,
    text: a.text,
    author_name: a.doctor,
    created_by: uid,
  });
  if (error) {
    toast.error(error.message);
    return;
  }
  await reloadLegacyCache();
}

export async function updateAnnotation(
  id: string,
  patch: { text?: string; date?: string },
): Promise<void> {
  const upd: Record<string, unknown> = {};
  if (patch.text !== undefined) upd.text = patch.text;
  if (patch.date !== undefined) upd.annotation_date = patch.date;
  const { error } = await supabase.from("marker_annotations").update(upd).eq("id", id);
  if (error) {
    toast.error(error.message);
    return;
  }
  await reloadLegacyCache();
}

export async function deleteAnnotation(
  id: string,
  reason: string,
  deletedBy: string,
): Promise<void> {
  const target = legacyCache.find((a) => a.id === id);
  const { error } = await supabase.from("marker_annotations").delete().eq("id", id);
  if (error) {
    toast.error(error.message);
    return;
  }
  if (target) {
    annotationDeletionLog.push({
      id: `del-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      annotationId: target.id,
      biomarkerKey: target.biomarkerKey,
      biomarkerLabel: target.biomarkerLabel,
      date: target.date,
      text: target.text,
      doctor: target.doctor,
      deletedBy,
      deletedAt: new Date().toISOString(),
      reason,
    });
  }
  await reloadLegacyCache();
}

export function markIncluded(ids: string[], target: "summary" | "recommendations") {
  for (const a of legacyCache) {
    if (ids.includes(a.id)) {
      if (target === "summary") a.includedInSummary = true;
      else a.includedInRecommendations = true;
    }
  }
  legacyNotify();
}

export function useAnnotationsVersion() {
  const [, setV] = useState(0);
  useEffect(() => {
    const fn = () => setV((x) => x + 1);
    legacyListeners.add(fn);
    seriesListeners.add(fn);
    return () => {
      legacyListeners.delete(fn);
      seriesListeners.delete(fn);
    };
  }, []);
  return null;
}

// Backward-compat empty series export — older code imported this. Now
// that lab data is fetched per-patient from the database, no demo
// series exist. Kept to preserve the import surface.
export const CARDIO_DUMMY_SERIES: Record<string, { single?: Point[]; bp?: BPPoint[] }> = {};

// ──────────────────────────────────────────────────────────────────────
// Patient-scoped lab series — reads from `patient_lab_results`.
// ──────────────────────────────────────────────────────────────────────
type Point = { date: string; value: number };
type BPPoint = { date: string; systolic: number; diastolic: number };
type Series = { single?: Point[]; bp?: BPPoint[] };

// Map biomarker key → column in `patient_lab_results`.
const BIOMARKER_COLUMN: Record<string, string> = {
  ldl_mmol_l: "ldl_mmol_l",
  hba1c_mmol_mol: "hba1c_mmol_mol",
  hba1c_metabolic: "hba1c_mmol_mol",
  alat_u_l: "alat_u_l",
  afos_alp_u_l: "afos_alp_u_l",
  gt_u_l: "gt_u_l",
  alat_asat_ratio: "alat_asat_ratio",
  egfr: "egfr",
  creatinine_umol_l: "creatinine_umol_l",
  tsh_mu_l: "tsh_mu_l",
  free_t4_pmol_l: "free_t4_pmol_l",
  vitamin_d_25oh_nmol_l: "vitamin_d_25oh_nmol_l",
  vitamin_b12_total_ng_l: "vitamin_b12_total_ng_l",
  ferritin_ug_l: "ferritin_ug_l",
  folate_ug_l: "folate_ug_l",
  potassium_mmol_l: "potassium_mmol_l",
  sodium_mmol_l: "sodium_mmol_l",
  calcium_mmol_l: "calcium_mmol_l",
  cystatin_c: "cystatin_c",
  magnesium_mmol_l: "magnesium_mmol_l",
  phosphate_mmol_l: "phosphate_mmol_l",
  iron_serum_umol_l: "iron_serum_umol_l",
  transferrin_g_l: "transferrin_g_l",
  transferrin_saturation_pct: "transferrin_saturation_pct",
  total_protein_g_l: "total_protein_g_l",
  prealbumin_g_l: "prealbumin_g_l",
  fev1_percent: "fev1_percent",
  fvc_percent: "fvc_percent",
  pef_percent: "pef_percent",
  urine_acr_mg_mmol: "urine_acr_mg_mmol",
};

// Module-scope cache so the (panel, sidebar) can share a single fetch
// per (patientId, biomarkerKey). Cache key: `${patientId}|${biomarkerKey}`.
const seriesCache = new Map<string, Series>();
const seriesListeners = new Set<() => void>();
const notifySeries = () => seriesListeners.forEach((l) => l());

/**
 * Single source of truth: build a Series for a biomarker directly from
 * the parent-fetched `patient_lab_results` array. Both the chart panel
 * and the table sidebar derive their data from this so the two views
 * can never disagree.
 */
export function buildSeriesFromLabs(
  labResults: Array<Record<string, any>> | null | undefined,
  biomarkerKey: string,
): Series {
  if (!labResults || labResults.length === 0) return {};
  const sorted = [...labResults].sort((a, b) =>
    String(a.result_date).localeCompare(String(b.result_date)),
  );
  if (biomarkerKey === "blood_pressure_systolic" || biomarkerKey === "blood_pressure_diastolic") {
    const bp: BPPoint[] = sorted
      .filter((r) => r.blood_pressure_systolic != null && r.blood_pressure_diastolic != null)
      .map((r) => ({
        date: r.result_date,
        systolic: Number(r.blood_pressure_systolic),
        diastolic: Number(r.blood_pressure_diastolic),
      }));
    return { bp };
  }
  const col = BIOMARKER_COLUMN[biomarkerKey];
  if (!col) return {};
  const single: Point[] = sorted
    .filter((r) => r[col] != null && typeof r[col] !== "boolean")
    .map((r) => ({ date: r.result_date, value: Number(r[col]) }));
  return { single };
}

async function loadSeries(patientId: string, biomarkerKey: string): Promise<Series> {
  // Blood pressure is a special case (two columns).
  if (biomarkerKey === "blood_pressure_systolic" || biomarkerKey === "blood_pressure_diastolic") {
    const { data, error } = await supabase
      .from("patient_lab_results")
      .select("result_date, blood_pressure_systolic, blood_pressure_diastolic")
      .eq("patient_id", patientId)
      .order("result_date", { ascending: true });
    if (error) {
      console.error("[patient_lab_results] BP load failed", error);
      return {};
    }
    const bp: BPPoint[] = (data ?? [])
      .filter((r: any) => r.blood_pressure_systolic != null && r.blood_pressure_diastolic != null)
      .map((r: any) => ({
        date: r.result_date,
        systolic: Number(r.blood_pressure_systolic),
        diastolic: Number(r.blood_pressure_diastolic),
      }));
    return { bp };
  }

  const col = BIOMARKER_COLUMN[biomarkerKey];
  if (!col) return {};
  const { data, error } = await supabase
    .from("patient_lab_results")
    .select(`result_date, ${col}`)
    .eq("patient_id", patientId)
    .order("result_date", { ascending: true });
  if (error) {
    console.error(`[patient_lab_results] ${biomarkerKey} load failed`, error);
    return {};
  }
  const single: Point[] = (data ?? [])
    .filter((r: any) => r[col] != null)
    .map((r: any) => ({ date: r.result_date, value: Number(r[col]) }));
  return { single };
}

function usePatientSeries(
  patientId: string | undefined,
  biomarkerKey: string,
  labResults?: Array<Record<string, any>> | null,
): Series {
  const cacheKey = patientId ? `${patientId}|${biomarkerKey}` : "";
  const [, setV] = useState(0);

  useEffect(() => {
    const fn = () => setV((x) => x + 1);
    seriesListeners.add(fn);
    return () => {
      seriesListeners.delete(fn);
    };
  }, []);

  // When the parent supplies the canonical labResults array, derive the
  // series directly from it (single source of truth) and refresh the
  // shared cache so the sidebar/getSeriesRowsForBiomarker stays in sync.
  const derived = useMemo(
    () => (labResults ? buildSeriesFromLabs(labResults, biomarkerKey) : null),
    [labResults, biomarkerKey],
  );

  useEffect(() => {
    if (derived && patientId) {
      seriesCache.set(cacheKey, derived);
      notifySeries();
    }
  }, [derived, cacheKey, patientId]);

  useEffect(() => {
    if (!patientId) return;
    if (derived) return; // parent provided fresh data — skip the redundant fetch
    if (seriesCache.has(cacheKey)) return;
    let cancelled = false;
    void loadSeries(patientId, biomarkerKey).then((s) => {
      if (cancelled) return;
      seriesCache.set(cacheKey, s);
      notifySeries();
    });
    return () => {
      cancelled = true;
    };
  }, [patientId, biomarkerKey, cacheKey, derived]);

  if (derived) return derived;
  return seriesCache.get(cacheKey) ?? {};
}


// ──────────────────────────────────────────────────────────────────────
// Time window
// ──────────────────────────────────────────────────────────────────────
type Window = "6m" | "1y" | "3y" | "all";
const WINDOW_LABELS: Record<Window, string> = {
  "6m": "6m",
  "1y": "1y",
  "3y": "3y",
  all: "All",
};

function filterByWindow<T extends { date: string }>(data: T[], window: Window): T[] {
  if (window === "all" || data.length === 0) return data;
  const last = new Date(data[data.length - 1].date).getTime();
  const months = window === "6m" ? 6 : window === "1y" ? 12 : 36;
  const cutoff = last - months * 30.44 * 24 * 3600 * 1000;
  return data.filter((d) => new Date(d.date).getTime() >= cutoff);
}

export type LabSidebarRow = {
  date: string;
  value: number | string;
  inRange: boolean | null;
};

/**
 * Patient-scoped sidebar series. Returns [] when no patientId is provided
 * or when the patient has no rows for this biomarker.
 *
 * Note: this reads from the same module-scope cache that the panel
 * populates. If the cache is empty (panel hasn't mounted yet for this
 * patient/marker), it kicks off a fetch and returns [] — the caller will
 * re-render via `usePatientSeries` once the data arrives.
 */
export function getSeriesRowsForBiomarker(
  key: string,
  windowKey: "6m" | "1y" | "3y" | "all",
  refLow?: number,
  refHigh?: number,
  patientId?: string,
  labResults?: Array<Record<string, any>> | null,
): LabSidebarRow[] {
  if (!patientId) return [];
  // Prefer the canonical labResults array when supplied — guarantees the
  // sidebar table shows the same data as the chart.
  if (labResults) {
    const fresh = buildSeriesFromLabs(labResults, key);
    const cacheKey = `${patientId}|${key}`;
    seriesCache.set(cacheKey, fresh);
    return rowsFromSeries(fresh, windowKey, refLow, refHigh);
  }
  const cacheKey = `${patientId}|${key}`;
  const series = seriesCache.get(cacheKey);
  if (!series) {
    void loadSeries(patientId, key).then((s) => {
      seriesCache.set(cacheKey, s);
      notifySeries();
    });
    return [];
  }
  return rowsFromSeries(series, windowKey, refLow, refHigh);
}

function rowsFromSeries(
  series: Series,
  windowKey: "6m" | "1y" | "3y" | "all",
  refLow?: number,
  refHigh?: number,
): LabSidebarRow[] {
  if (series.bp) {
    const filtered = filterByWindow(series.bp, windowKey);
    return filtered.map((p) => {
      const sysOut = (refHigh !== undefined && p.systolic > refHigh) || (refLow !== undefined && p.systolic < refLow);
      const diaOut = p.diastolic > 90;
      const inRange = !(sysOut || diaOut);
      return {
        date: p.date,
        value: `${p.systolic}/${p.diastolic}`,
        inRange: refLow !== undefined || refHigh !== undefined ? inRange : null,
      };
    });
  }
  const filtered = filterByWindow(series.single ?? [], windowKey);
  return filtered.map((p) => {
    const out = (refHigh !== undefined && p.value > refHigh) || (refLow !== undefined && p.value < refLow);
    return {
      date: p.date,
      value: p.value,
      inRange: refLow !== undefined || refHigh !== undefined ? !out : null,
    };
  });
}

// ──────────────────────────────────────────────────────────────────────
// Component
// ──────────────────────────────────────────────────────────────────────
type Props = {
  biomarkerKey: string;
  label: string;
  unit: string;
  refLow?: number;
  refHigh?: number;
  selected?: boolean;
  onSelect?: () => void;
  doctor?: string;
  accentColorVar?: string;
  patientId?: string;
  patientName?: string;
};

export function CardioLabBiomarkerPanel({
  accentColorVar = "hsl(var(--primary))",
  biomarkerKey,
  label,
  unit,
  refLow,
  refHigh,
  selected,
  onSelect,
  doctor = "Dr. Laine",
  patientId,
  patientName,
}: Props) {
  const { openNewTask } = useTaskActions();
  const [window, setWindow] = useState<Window>("3y");

  const series = usePatientSeries(patientId, biomarkerKey);
  const isBP = !!series?.bp;
  const rawData: Array<{ date: string }> = isBP ? series!.bp! : series?.single ?? [];
  const data = useMemo(() => filterByWindow(rawData, window), [rawData, window]);

  const { annotations, add, update, remove } = useAnnotations(patientId, biomarkerKey, label);

  // Active popover for adding/viewing/editing annotations.
  type ActivePopover =
    | { kind: "add"; date: string }
    | { kind: "view"; id: string }
    | { kind: "edit"; id: string }
    | { kind: "delete"; id: string }
    | null;
  const [activePopover, setActivePopover] = useState<ActivePopover>(null);
  const [draftText, setDraftText] = useState("");
  const [draftDate, setDraftDate] = useState<string>("");
  const [editText, setEditText] = useState("");
  const [deleteReason, setDeleteReason] = useState("");

  // Map annotation date → annotation list (multiple per date possible)
  const annByDate = useMemo(() => {
    const m = new Map<string, LabAnnotation[]>();
    for (const a of annotations) {
      const arr = m.get(a.date) ?? [];
      arr.push(a);
      m.set(a.date, arr);
    }
    return m;
  }, [annotations]);

  const closestDateTo = (targetDate: string): string => {
    if (data.length === 0) return targetDate;
    const t = new Date(targetDate).getTime();
    let best = data[0].date;
    let bestDiff = Math.abs(new Date(best).getTime() - t);
    for (const d of data) {
      const diff = Math.abs(new Date(d.date).getTime() - t);
      if (diff < bestDiff) {
        bestDiff = diff;
        best = d.date;
      }
    }
    return best;
  };

  const openAddAt = (date: string) => {
    setDraftDate(date);
    setDraftText("");
    setActivePopover({ kind: "add", date });
  };

  const handleSaveAdd = async () => {
    if (!draftText.trim()) return;
    const date = draftDate || new Date().toISOString().slice(0, 10);
    await add(date, draftText.trim(), doctor);
    setDraftText("");
    setDraftDate("");
    setActivePopover(null);
  };

  const handleSaveEdit = async (id: string) => {
    if (!editText.trim()) return;
    await update(id, { text: editText.trim() });
    setEditText("");
    setActivePopover({ kind: "view", id });
  };

  const handleConfirmDelete = async (id: string) => {
    if (!deleteReason.trim()) return;
    await remove(id, deleteReason.trim(), doctor);
    setDeleteReason("");
    setActivePopover(null);
  };

  // Recharts onClick handler.
  const handleChartClick = (e: any) => {
    if (!e) return;
    if (e.activeLabel) {
      const date = e.activeLabel as string;
      const existing = annByDate.get(date);
      if (existing && existing.length > 0) {
        setActivePopover({ kind: "view", id: existing[0].id });
      } else {
        openAddAt(date);
      }
      return;
    }
    if (e.chartX !== undefined && data.length > 0) {
      openAddAt(closestDateTo(new Date().toISOString().slice(0, 10)));
    }
  };

  const renderTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    const date = payload[0].payload.date as string;
    const dayAnns = annByDate.get(date) ?? [];
    return (
      <div className="rounded-md border bg-background px-2.5 py-1.5 text-xs shadow-md">
        <p className="font-medium">{date}</p>
        {isBP ? (
          <>
            <p style={{ color: "#2C1A0E" }}>Systolic: {payload[0].payload.systolic} mmHg</p>
            <p style={{ color: "#7A5C3A" }}>Diastolic: {payload[0].payload.diastolic} mmHg</p>
          </>
        ) : (
          <p>
            {label}: {payload[0].value} {unit}
          </p>
        )}
        {dayAnns.length > 0 ? (
          <div className="mt-1 pt-1 border-t">
            {dayAnns.map((a) => (
              <p key={a.id} className="text-[11px] italic text-muted-foreground max-w-[220px]">
                <StickyNote className="inline h-3 w-3 mr-1" />
                {a.text}
              </p>
            ))}
            <p className="text-[10px] text-muted-foreground mt-1">Click point to manage</p>
          </div>
        ) : (
          <p className="text-[10px] text-muted-foreground mt-1 pt-1 border-t">Click to add annotation</p>
        )}
      </div>
    );
  };

  const activeAnn =
    activePopover && (activePopover.kind === "view" || activePopover.kind === "edit" || activePopover.kind === "delete")
      ? annotations.find((a) => a.id === activePopover.id)
      : null;

  const annotationDates = useMemo(() => {
    const visibleDates = new Set(data.map((d) => d.date));
    return annotations
      .filter((a) => visibleDates.has(a.date))
      .map((a) => ({ ...a, idx: data.findIndex((d) => d.date === a.date) }))
      .filter((a) => a.idx !== -1);
  }, [annotations, data]);

  const PRIMARY_LINE = "#2C1A0E";
  const SECONDARY_LINE = "#7A5C3A";

  const renderDot = (props: any) => {
    const { cx, cy, payload, index } = props;
    if (cx == null || cy == null) return null;
    const v = payload?.value;
    const out =
      typeof v === "number" &&
      ((refHigh !== undefined && v > refHigh) || (refLow !== undefined && v < refLow));
    return (
      <circle
        key={`dot-${index}`}
        cx={cx}
        cy={cy}
        r={4}
        fill={out ? "hsl(var(--destructive))" : PRIMARY_LINE}
        stroke="hsl(var(--background))"
        strokeWidth={1}
      />
    );
  };

  return (
    <Card
      className={cn(
        "transition-colors relative overflow-hidden",
        selected ? "border-primary shadow-sm" : "hover:border-primary/50",
        onSelect && "cursor-pointer",
      )}
      onClick={onSelect}
    >
      {selected && (
        <div
          className="absolute left-0 top-0 bottom-0 w-1"
          style={{ backgroundColor: accentColorVar }}
          aria-hidden
        />
      )}
      <CardHeader className={cn("pb-2 flex-row items-center justify-between space-y-0", selected && "pl-5")}>
        <CardTitle className="text-base">
          {label} {unit && <span className="text-xs font-normal text-muted-foreground">({unit})</span>}
        </CardTitle>

        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          <div className="inline-flex rounded-md border bg-muted/50 p-0.5 text-[10px]">
            {(["6m", "1y", "3y", "all"] as Window[]).map((w) => (
              <button
                key={w}
                onClick={() => setWindow(w)}
                className={cn(
                  "px-1.5 py-0.5 rounded-sm transition-colors",
                  window === w
                    ? "bg-background text-foreground shadow-sm font-medium"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {WINDOW_LABELS[w]}
              </button>
            ))}
          </div>

          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            title="Add annotation"
            onClick={() => openAddAt(new Date().toISOString().slice(0, 10))}
            disabled={!patientId}
          >
            <MessageSquarePlus className="h-3.5 w-3.5" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            title="Create task from this result"
            onClick={() =>
              openNewTask({
                title: `Review ${label} result${patientName ? ` — ${patientName}` : ""}`,
                patient_id: patientId ?? null,
                category: "clinical",
                created_from: `${label} lab result`,
              })
            }
          >
            <ListChecks className="h-3.5 w-3.5" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className={cn(selected && "pl-5")}>
        {data.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">No data in this time window.</p>
        ) : (
          <div onClick={(e) => e.stopPropagation()}>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={data}
                  margin={{ top: 8, right: 56, left: 0, bottom: 0 }}
                  onClick={handleChartClick}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} domain={["auto", "auto"]} />
                  <Tooltip content={renderTooltip} />

                  {(refLow !== undefined || refHigh !== undefined) && (
                    <ReferenceArea
                      y1={refLow ?? 0}
                      y2={refHigh ?? 9999}
                      fill="hsl(142 70% 45%)"
                      fillOpacity={0.1}
                    />
                  )}
                  {refLow !== undefined && (
                    <ReferenceLine
                      y={refLow}
                      stroke="hsl(142 60% 40%)"
                      strokeDasharray="4 3"
                      label={{
                        value: `Low ${refLow}`,
                        position: "right",
                        fontSize: 9,
                        fill: "hsl(var(--muted-foreground))",
                      }}
                    />
                  )}
                  {refHigh !== undefined && (
                    <ReferenceLine
                      y={refHigh}
                      stroke="hsl(142 60% 40%)"
                      strokeDasharray="4 3"
                      label={{
                        value: `High ${refHigh}`,
                        position: "right",
                        fontSize: 9,
                        fill: "hsl(var(--muted-foreground))",
                      }}
                    />
                  )}

                  {isBP ? (
                    <>
                      <Line
                        type="monotone"
                        dataKey="systolic"
                        stroke={PRIMARY_LINE}
                        strokeWidth={2}
                        dot={{ r: 4, fill: PRIMARY_LINE }}
                        name="Systolic"
                      />
                      <Line
                        type="monotone"
                        dataKey="diastolic"
                        stroke={SECONDARY_LINE}
                        strokeWidth={2}
                        dot={{ r: 4, fill: SECONDARY_LINE }}
                        name="Diastolic"
                      />
                    </>
                  ) : (
                    <Line
                      type="monotone"
                      dataKey="value"
                      stroke={PRIMARY_LINE}
                      strokeWidth={2}
                      dot={renderDot as any}
                      activeDot={{ r: 5 }}
                      name={label}
                    />
                  )}
                </LineChart>
              </ResponsiveContainer>
            </div>

            {annotationDates.length > 0 && (
              <div
                className="relative mt-1 h-5"
                style={{ marginLeft: 50, marginRight: 56 }}
              >
                {annotationDates.map((a) => {
                  const left = data.length === 1 ? 50 : (a.idx / (data.length - 1)) * 100;
                  return (
                    <button
                      key={a.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        setActivePopover({ kind: "view", id: a.id });
                      }}
                      title={`${a.date} — ${a.text}`}
                      className="absolute -translate-x-1/2 top-0 inline-flex flex-col items-center text-foreground hover:text-primary transition-colors"
                      style={{ left: `${left}%` }}
                    >
                      <span className="block w-px h-2 bg-foreground/60" aria-hidden />
                      <Flag className="h-3 w-3 -mt-0.5 fill-primary/30 text-primary" />
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Annotation count + manageable list */}
        <div className="mt-2 space-y-1.5" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <StickyNote className="h-3 w-3" />
            <span>
              {annotations.length} annotation{annotations.length === 1 ? "" : "s"} on this biomarker
            </span>
          </div>
          {annotations.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {annotations
                .slice()
                .sort((a, b) => a.date.localeCompare(b.date))
                .map((a) => (
                  <button
                    key={a.id}
                    onClick={() => setActivePopover({ kind: "view", id: a.id })}
                    className="inline-flex items-center gap-1 rounded-full border bg-muted/40 px-2 py-0.5 text-[10px] text-foreground hover:bg-muted transition-colors"
                    title={a.text}
                  >
                    <span className="font-medium">{a.date}</span>
                    <span className="max-w-[120px] truncate text-muted-foreground">{a.text}</span>
                  </button>
                ))}
            </div>
          )}
        </div>

        <Popover
          open={activePopover !== null}
          onOpenChange={(o) => {
            if (!o) {
              setActivePopover(null);
              setEditText("");
              setDeleteReason("");
            }
          }}
        >
          <PopoverTrigger asChild>
            <span className="sr-only" aria-hidden>
              annotation popover anchor
            </span>
          </PopoverTrigger>
          <PopoverContent className="w-80" align="center" onClick={(e) => e.stopPropagation()}>
            {activePopover?.kind === "add" && (
              <div className="space-y-2">
                <p className="text-xs font-medium">Add annotation — {label}</p>
                <input
                  type="date"
                  value={draftDate}
                  onChange={(e) => setDraftDate(e.target.value)}
                  className="w-full h-8 px-2 text-xs border rounded-md bg-background"
                />
                <Textarea
                  value={draftText}
                  onChange={(e) => setDraftText(e.target.value)}
                  placeholder="Add a clinical note for this biomarker"
                  className="min-h-[70px] text-xs resize-none"
                  autoFocus
                />
                <div className="flex justify-end gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setActivePopover(null)}>
                    Cancel
                  </Button>
                  <Button size="sm" onClick={handleSaveAdd} disabled={!draftText.trim()}>
                    Save annotation
                  </Button>
                </div>
              </div>
            )}

            {activePopover?.kind === "view" && activeAnn && (
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-medium">{activeAnn.biomarkerLabel} — {activeAnn.date}</p>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => {
                        setEditText(activeAnn.text);
                        setActivePopover({ kind: "edit", id: activeAnn.id });
                      }}
                      title="Edit"
                    >
                      <Pencil className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-destructive hover:text-destructive"
                      onClick={() => setActivePopover({ kind: "delete", id: activeAnn.id })}
                      title="Delete"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
                <p className="text-sm text-foreground whitespace-pre-wrap">{activeAnn.text}</p>
                <p className="text-[11px] text-muted-foreground">
                  — {activeAnn.doctor}
                  {activeAnn.updatedAt ? " (edited)" : ""}
                </p>
              </div>
            )}

            {activePopover?.kind === "edit" && activeAnn && (
              <div className="space-y-2">
                <p className="text-xs font-medium">Edit annotation — {activeAnn.date}</p>
                <Textarea
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  className="min-h-[70px] text-xs resize-none"
                  autoFocus
                />
                <div className="flex justify-end gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setActivePopover({ kind: "view", id: activeAnn.id })}
                  >
                    Cancel
                  </Button>
                  <Button size="sm" onClick={() => handleSaveEdit(activeAnn.id)} disabled={!editText.trim()}>
                    Save changes
                  </Button>
                </div>
              </div>
            )}

            {activePopover?.kind === "delete" && activeAnn && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-destructive">Delete annotation</p>
                <p className="text-[11px] text-muted-foreground">
                  Annotations are part of the audit trail. A reason is required and will be logged.
                </p>
                <div className="rounded-md border bg-muted/40 p-2 text-xs">
                  <p className="font-medium">{activeAnn.date} — {activeAnn.biomarkerLabel}</p>
                  <p className="text-muted-foreground italic">{activeAnn.text}</p>
                </div>
                <Textarea
                  value={deleteReason}
                  onChange={(e) => setDeleteReason(e.target.value)}
                  placeholder="Reason for deletion (required)"
                  className="min-h-[60px] text-xs resize-none"
                  autoFocus
                />
                <div className="flex justify-end gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setActivePopover({ kind: "view", id: activeAnn.id })}
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleConfirmDelete(activeAnn.id)}
                    disabled={!deleteReason.trim()}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            )}
          </PopoverContent>
        </Popover>
      </CardContent>
    </Card>
  );
}
