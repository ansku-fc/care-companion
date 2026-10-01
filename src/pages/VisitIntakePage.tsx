// Immersive (ProtectedBare) clinical visit intake for onboarded patients.
// Routes: /patients/:id/visit/new and /patients/:id/visit/:visitId.
// Loads patient context + draft through the repository seam, then runs the
// workspace -> review two-phase flow.
import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { format, parseISO } from "date-fns";
import { toast } from "sonner";
import { ArrowLeft, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { formatLastFirst } from "@/lib/patientName";
import { VISIT_TYPE_META } from "@/lib/episodes";
import { isCarter, CARTER_MEDICATIONS, CARTER_DIAGNOSES } from "@/lib/patientClinicalData";
import {
  getVisits,
  getVisit,
  getLatestVisit,
  getBaseline,
  createDraftVisit,
  saveVisit,
  fromLabel,
  type ClinicalVisit,
  type PatientBaseline,
  type DimensionKey,
} from "@/lib/visits";
import { getLabSeries, type LabSeries } from "@/lib/labs";
import { VisitFormProvider, useVisitForm } from "@/components/visits/VisitFormProvider";
import { VisitContextSidebar, type BaselineDiagnosis } from "@/components/visits/VisitContextSidebar";
import { VisitWorkspace } from "@/components/visits/VisitWorkspace";
import { VisitActionsRail, type CurrentMed } from "@/components/visits/VisitActionsRail";
import { VisitDetailPanel, type DetailItem } from "@/components/visits/VisitDetailPanel";
import { VisitReviewScreen } from "@/components/visits/VisitReviewScreen";

// PLACEHOLDER — shown in the visit header until the real appointment slot is
// wired through reliably. The query-param slot reads below still take precedence
// when present; this is the fallback so the header always shows a date/time for
// design review. TODO: remove once appointment-slot wiring is confirmed live.
const PLACEHOLDER_SLOT = "Tue 17 Jun 2026, 11:00–11:30";

/** "Tue 17 Jun 2026, 11:00–11:30" from an appointment slot, or null if none. */
function formatSlot(start?: string, end?: string): string | null {
  if (!start || !end) return null;
  try {
    const s = parseISO(start);
    const e = parseISO(end);
    return `${format(s, "EEE d MMM yyyy")}, ${format(s, "HH:mm")}–${format(e, "HH:mm")}`;
  } catch {
    return null;
  }
}

type Baseline = {
  lastVisit: ClinicalVisit | null;
  scores: PatientBaseline;
  meds: string[];
  currentMeds: CurrentMed[];
  allergies: string[];
  diagnoses: BaselineDiagnosis[];
  labs: LabSeries[];
};

export default function VisitIntakePage() {
  const { id, visitId } = useParams<{ id: string; visitId?: string }>();
  const { profile } = useAuth();
  const clinician = profile?.full_name || "Dr. Laine";

  const [loading, setLoading] = useState(true);
  const [patientName, setPatientName] = useState("Patient");
  const [initial, setInitial] = useState<ClinicalVisit | null>(null);
  const [priorVisits, setPriorVisits] = useState<ClinicalVisit[]>([]);
  const [baseline, setBaseline] = useState<Baseline>({ lastVisit: null, scores: {}, meds: [], currentMeds: [], allergies: [], diagnoses: [], labs: [] });

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data } = await supabase.from("patients").select("full_name").eq("id", id).maybeSingle();
      const name = data?.full_name ? formatLastFirst(data.full_name) : "Patient";

      const all = await getVisits(id);
      const draft: ClinicalVisit =
        (visitId ? await getVisit(visitId) : null) ??
        (await createDraftVisit({ patientId: id, clinician, reason: "FOLLOWUP_CONSULTATION" }));

      const prior = all.filter((v) => v.id !== draft.id);
      const latest = await getLatestVisit(id);
      const lastVisit = latest && latest.id !== draft.id ? latest : prior[0] ?? null;
      const scores = await getBaseline(id);

      const carter = isCarter(id, name);
      // Structured current meds (same source the sidebar Medications list uses);
      // the sidebar string list is derived from this so the two stay identical.
      const currentMeds: CurrentMed[] = carter
        ? CARTER_MEDICATIONS.filter((m) => m.status === "active").map((m) => {
            const key = fromLabel(m.dimension);
            return { id: m.id, name: m.name, dose: m.dose, frequency: m.frequency, dimensions: key ? [key] : [] };
          })
        : [];
      const meds = currentMeds.map((m) => `${m.name} · ${m.dose} · ${m.frequency}`);
      const allergies = carter ? ["NSAIDs", "Penicillin", "Tree nuts"] : [];
      const diagnoses: BaselineDiagnosis[] = carter
        ? CARTER_DIAGNOSES.filter((d) => d.status === "active").map((d) => ({
            name: d.name,
            icd10: d.icd10,
            dimension: d.dimension,
          }))
        : [];

      // Shared lab repository (Carter-gated inside the repo); canonical dummy
      // source for the sidebar labs mirror.
      const labs = await getLabSeries(id, name);

      if (cancelled) return;
      setPatientName(name);
      setPriorVisits(prior);
      setBaseline({ lastVisit, scores, meds, currentMeds, allergies, diagnoses, labs });
      setInitial(draft);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [id, visitId, clinician]);

  if (!id) return null;
  if (loading || !initial) {
    return (
      <div className="fixed inset-0 flex items-center justify-center" style={{ background: "#F9F7F4" }}>
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <VisitFormProvider initial={initial}>
      <VisitIntakeInner patientName={patientName} priorVisits={priorVisits} baseline={baseline} patientId={id} />
    </VisitFormProvider>
  );
}

function VisitIntakeInner({
  patientName,
  priorVisits,
  baseline,
  patientId,
}: {
  patientName: string;
  priorVisits: ClinicalVisit[];
  baseline: Baseline;
  patientId: string;
}) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  // Appointment slot arrives as query params (?start=&end=) from the launch
  // points; survives redirects/refresh/re-nav where router state can be dropped.
  const slotStart = searchParams.get("start") ?? undefined;
  const slotEnd = searchParams.get("end") ?? undefined;
  const slotLabel = useMemo(() => formatSlot(slotStart, slotEnd), [slotStart, slotEnd]);
  const f = useVisitForm();
  const [view, setView] = useState<"workspace" | "review">("workspace");
  const [saving, setSaving] = useState(false);
  // Fourth "Detail" column: stacked lab/visit cards opened from the left rail.
  // Open iff non-empty. Newest on top; ids are stable so clicks de-dupe.
  const [detailItems, setDetailItems] = useState<DetailItem[]>([]);
  const openLab = (markerKey: string) =>
    setDetailItems((prev) => {
      const id = `lab:${markerKey}`;
      if (prev.some((i) => i.id === id)) return prev; // already open → no-op
      return [{ id, kind: "lab", markerKey }, ...prev];
    });
  const openVisit = (visitId: string) =>
    setDetailItems((prev) => {
      const id = `visit:${visitId}`;
      if (prev.some((i) => i.id === id)) return prev;
      return [{ id, kind: "visit", visitId }, ...prev];
    });
  const openDimension = (dimensionKey: DimensionKey) =>
    setDetailItems((prev) => {
      const id = `dim:${dimensionKey}`;
      if (prev.some((i) => i.id === id)) return prev;
      return [{ id, kind: "dimension", dimensionKey }, ...prev];
    });
  const closeItem = (id: string) => setDetailItems((prev) => prev.filter((i) => i.id !== id));
  const closeAll = () => setDetailItems([]);
  const donePath = `/patients/${patientId}`;

  const onSave = async () => {
    setSaving(true);
    try {
      await saveVisit({ ...f.draft, status: "completed" });
      toast.success("Visit saved (mock — not persisted)", {
        style: { background: "#E6F4F3", color: "#0EA5A0", border: "none", borderRadius: "8px" },
      });
      navigate(donePath);
    } finally {
      setSaving(false);
    }
  };

  if (view === "review") {
    return (
      <VisitReviewScreen
        draft={f.draft}
        priorVisits={priorVisits}
        baseline={baseline.scores}
        patientName={patientName}
        saving={saving}
        onBack={() => setView("workspace")}
        onSave={onSave}
      />
    );
  }

  return (
    <div className="fixed inset-0 flex flex-col" style={{ background: "#F9F7F4" }}>
      <header className="h-14 shrink-0 flex items-center justify-between px-6 bg-white" style={{ borderBottom: "1px solid #E7DCCD" }}>
        <button onClick={() => navigate(donePath)} className="inline-flex items-center gap-1.5 text-[14px] text-[#6E5A48] hover:text-[#2E1F14] transition-colors">
          <ArrowLeft className="h-4 w-4" /> Exit visit
        </button>
        <div className="flex items-baseline gap-2">
          <span className="text-[16px] font-semibold text-[#2E1F14]">{patientName}</span>
          <span className="text-[14px] text-[#9B8775]">· {VISIT_TYPE_META[f.draft.reason].label} · {slotLabel ?? PLACEHOLDER_SLOT}</span>
        </div>
        <button
          onClick={() => setView("review")}
          className="h-8 px-4 rounded-[6px] text-[13px] font-medium text-white transition-opacity hover:opacity-90"
          style={{ background: "#2E1F14" }}
        >
          Review &amp; Save
        </button>
      </header>

      {/* Body row: per-column vertical scroll; frame never scrolls vertically.
          Below ~1360px (all four columns + readable center can't fit) the row
          scrolls horizontally — columns stay full-size and live, no overlay. */}
      <div className="flex-1 min-h-0 flex overflow-x-auto overflow-y-hidden">
        <VisitContextSidebar
          patientName={patientName}
          baseline={baseline.scores}
          visits={priorVisits}
          meds={baseline.meds}
          allergies={baseline.allergies}
          diagnoses={baseline.diagnoses}
          labs={baseline.labs}
          onOpenLab={openLab}
          onOpenVisit={openVisit}
          onOpenDimension={openDimension}
        />
        {detailItems.length > 0 && (
          <VisitDetailPanel
            items={detailItems}
            onClose={closeItem}
            onCloseAll={closeAll}
            labs={baseline.labs}
            visits={priorVisits}
            baseline={baseline.scores}
          />
        )}
        <main className="flex-1 min-w-[400px] overflow-y-auto px-6 py-5">
          <div className="max-w-[880px] mx-auto">
            <VisitWorkspace baseline={baseline.scores} />
          </div>
        </main>
        <VisitActionsRail currentMeds={baseline.currentMeds} />
      </div>
    </div>
  );
}
