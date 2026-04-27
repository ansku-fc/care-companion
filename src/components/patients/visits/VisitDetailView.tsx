// Detail view for any non-onboarding visit. Shows visit info, internal notes,
// clinical notes, lab order section, outcomes, and tasks generated from this visit.

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Calendar, Clock, Stethoscope, HeartPulse, Save, ListChecks } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { visitTypeLabel, visitModeLabel } from "@/lib/labOrders";
import { VisitLabOrderSection } from "./VisitLabOrderSection";
import type { Tables } from "@/integrations/supabase/types";

interface Props {
  patient: Tables<"patients">;
  visit: Tables<"visit_notes"> & {
    visit_type?: string | null;
    visit_mode?: string | null;
    visit_time?: string | null;
    attending_doctor?: string | null;
    attending_nurse?: string | null;
    internal_note_to_nurse?: string | null;
    clinical_notes?: string | null;
    outcomes?: string | null;
    lab_order_id?: string | null;
  };
  onBack: () => void;
  onChanged?: () => void;
}

export function VisitDetailView({ patient, visit, onBack, onChanged }: Props) {
  const [clinicalNotes, setClinicalNotes] = useState(visit.clinical_notes ?? visit.notes ?? "");
  const [outcomes, setOutcomes] = useState(visit.outcomes ?? "");
  const [savingNotes, setSavingNotes] = useState(false);
  const [tasks, setTasks] = useState<Tables<"tasks">[]>([]);

  useEffect(() => {
    (async () => {
      // Fetch tasks linked to this visit's lab order
      if (visit.lab_order_id) {
        const { data } = await supabase
          .from("tasks")
          .select("*")
          .eq("patient_id", patient.id)
          .filter("referral_progress->>lab_order_id", "eq", visit.lab_order_id);
        setTasks(data ?? []);
      } else {
        setTasks([]);
      }
    })();
  }, [visit.id, visit.lab_order_id, patient.id]);

  const saveClinical = async () => {
    setSavingNotes(true);
    const { error } = await supabase
      .from("visit_notes")
      .update({ clinical_notes: clinicalNotes || null, outcomes: outcomes || null })
      .eq("id", visit.id);
    setSavingNotes(false);
    if (error) { toast.error("Could not save"); return; }
    toast.success("Visit notes saved");
    onChanged?.();
  };

  const dateStr = new Date(visit.visit_date).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  const timeStr = visit.visit_time?.slice(0, 5) ?? "";
  const typeLabel = visit.visit_type ? visitTypeLabel(visit.visit_type) : (visit.chief_complaint ?? "Visit");
  const modeLabel = visit.visit_mode ? visitModeLabel(visit.visit_mode) : null;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onBack} className="gap-1.5">
          <ArrowLeft className="h-4 w-4" /> Back to Visits
        </Button>
      </div>

      {/* Header */}
      <Card>
        <CardContent className="py-4 flex items-center justify-between flex-wrap gap-3">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg font-semibold">{typeLabel}</h2>
              {modeLabel && <Badge variant="secondary" className="text-xs">{modeLabel}</Badge>}
            </div>
            <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground flex-wrap">
              <span className="flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" /> {dateStr}</span>
              {timeStr && <span className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" /> {timeStr}</span>}
              {visit.attending_doctor && (
                <span className="flex items-center gap-1.5"><Stethoscope className="h-3.5 w-3.5" /> {visit.attending_doctor}</span>
              )}
              {visit.attending_nurse && (
                <span className="flex items-center gap-1.5"><HeartPulse className="h-3.5 w-3.5" /> {visit.attending_nurse}</span>
              )}
            </div>
          </div>
          <div className="text-right text-sm text-muted-foreground">{patient.full_name}</div>
        </CardContent>
      </Card>

      {/* Internal notes */}
      {visit.internal_note_to_nurse && (
        <Card className="border-warning/40 bg-warning/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wide text-warning-foreground/80">
              Internal note — not visible to patient
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm">{visit.internal_note_to_nurse}</CardContent>
        </Card>
      )}

      {/* Clinical notes */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Clinical Consultation Notes
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea
            value={clinicalNotes}
            onChange={(e) => setClinicalNotes(e.target.value)}
            placeholder="Free-text consultation notes…"
            className="min-h-[120px]"
          />
          <div>
            <div className="text-xs text-muted-foreground mb-1.5">Outcomes / next steps</div>
            <Textarea
              value={outcomes}
              onChange={(e) => setOutcomes(e.target.value)}
              placeholder="Plan, recommendations, follow-up…"
              className="min-h-[80px]"
            />
          </div>
          <div className="flex justify-end">
            <Button size="sm" onClick={saveClinical} disabled={savingNotes} className="gap-1.5">
              <Save className="h-3.5 w-3.5" /> {savingNotes ? "Saving…" : "Save"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Lab order */}
      {visit.lab_order_id && (
        <VisitLabOrderSection
          patient={patient}
          labOrderId={visit.lab_order_id}
          onChanged={onChanged}
        />
      )}

      {/* Generated tasks */}
      {tasks.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-2">
              <ListChecks className="h-4 w-4" /> Tasks from this visit
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {tasks.map((t) => (
              <div key={t.id} className="flex items-center justify-between p-2 rounded border text-sm">
                <div>
                  <div className="font-medium">{t.title}</div>
                  <div className="text-xs text-muted-foreground">
                    {t.assignee_name ?? "Unassigned"} · {t.status} · due {t.due_date ?? "—"}
                  </div>
                </div>
                <Badge variant="outline" className="text-[10px]">{t.priority}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
