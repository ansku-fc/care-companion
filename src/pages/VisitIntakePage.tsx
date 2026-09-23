// Immersive (ProtectedBare) clinical visit intake for onboarded patients.
// Routes: /patients/:id/visit/new and /patients/:id/visit/:visitId.
// Loads patient context + draft through the repository seam, then runs the
// workspace -> review two-phase flow.
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { ArrowLeft, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { formatLastFirst } from "@/lib/patientName";
import { VISIT_TYPE_META } from "@/lib/episodes";
import { isCarter, CARTER_MEDICATIONS } from "@/lib/patientClinicalData";
import {
  getVisits,
  getVisit,
  getLatestVisit,
  createDraftVisit,
  saveVisit,
  type ClinicalVisit,
} from "@/lib/visits";
import { VisitFormProvider, useVisitForm } from "@/components/visits/VisitFormProvider";
import { VisitContextSidebar } from "@/components/visits/VisitContextSidebar";
import { VisitWorkspace } from "@/components/visits/VisitWorkspace";
import { VisitReviewScreen } from "@/components/visits/VisitReviewScreen";

type Baseline = { lastVisit: ClinicalVisit | null; meds: string[]; allergies: string[] };

export default function VisitIntakePage() {
  const { id, visitId } = useParams<{ id: string; visitId?: string }>();
  const { profile } = useAuth();
  const clinician = profile?.full_name || "Dr. Laine";

  const [loading, setLoading] = useState(true);
  const [patientName, setPatientName] = useState("Patient");
  const [initial, setInitial] = useState<ClinicalVisit | null>(null);
  const [priorVisits, setPriorVisits] = useState<ClinicalVisit[]>([]);
  const [baseline, setBaseline] = useState<Baseline>({ lastVisit: null, meds: [], allergies: [] });

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

      const carter = isCarter(id, name);
      const meds = carter
        ? CARTER_MEDICATIONS.filter((m) => m.status === "active").map((m) => `${m.name} · ${m.dose} · ${m.frequency}`)
        : [];
      const allergies = carter ? ["NSAIDs", "Penicillin", "Tree nuts"] : [];

      if (cancelled) return;
      setPatientName(name);
      setPriorVisits(prior);
      setBaseline({ lastVisit, meds, allergies });
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
  const f = useVisitForm();
  const [view, setView] = useState<"workspace" | "review">("workspace");
  const [saving, setSaving] = useState(false);
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
          <span className="text-[14px] text-[#9B8775]">· {VISIT_TYPE_META[f.draft.reason].label} · New visit</span>
        </div>
        <button
          onClick={() => setView("review")}
          className="h-8 px-4 rounded-[6px] text-[13px] font-medium text-white transition-opacity hover:opacity-90"
          style={{ background: "#2E1F14" }}
        >
          Review &amp; Save
        </button>
      </header>

      <div className="flex-1 min-h-0 flex">
        <VisitContextSidebar
          patientName={patientName}
          lastVisit={baseline.lastVisit}
          meds={baseline.meds}
          allergies={baseline.allergies}
        />
        <main className="flex-1 min-w-0 overflow-y-auto px-8 py-6">
          <div className="max-w-[860px] mx-auto">
            <VisitWorkspace priorVisits={priorVisits} />
          </div>
        </main>
      </div>
    </div>
  );
}
