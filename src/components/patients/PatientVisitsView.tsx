import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Calendar, Clock, Plus, Video, MapPin, Home, UserCheck, FlaskConical, Stethoscope, CheckCircle2, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { OnboardingVisitDetailView } from "./OnboardingVisitDetailView";
import { NewVisitDialog } from "./visits/NewVisitDialog";
import { VisitDetailView } from "./visits/VisitDetailView";
import { visitTypeLabel, visitModeLabel, labOrderStatusLabel, type LabOrderStatus } from "@/lib/labOrders";

interface Props {
  patient: Tables<"patients">;
  appointments: Tables<"appointments">[];
  visitNotes: Tables<"visit_notes">[];
  onDataChanged: () => void;
}

function isOnboardingVisit(vn: Tables<"visit_notes">): boolean {
  const v = vn as any;
  if (v.visit_type === "onboarding") return true;
  if (vn.chief_complaint === "Initial Consultation / Onboarding") return true;
  const vit = (vn.vitals as any) ?? {};
  return vit?.visit_type === "onboarding";
}

function modeChip(mode?: string | null) {
  if (mode === "remote") return <Badge variant="secondary" className="text-xs gap-1 shrink-0"><Video className="h-3 w-3" /> Phone / Remote</Badge>;
  if (mode === "home") return <Badge variant="secondary" className="text-xs gap-1 shrink-0"><Home className="h-3 w-3" /> Home Visit</Badge>;
  return <Badge variant="secondary" className="text-xs gap-1 shrink-0"><MapPin className="h-3 w-3" /> In-person</Badge>;
}

function labStatusChip(s?: LabOrderStatus | null) {
  if (!s) return null;
  if (s === "results_received") return <Badge className="text-xs gap-1 shrink-0 bg-success text-success-foreground border-transparent"><CheckCircle2 className="h-3 w-3" /> Results</Badge>;
  if (s === "sent") return <Badge className="text-xs gap-1 shrink-0 bg-primary text-primary-foreground border-transparent"><Send className="h-3 w-3" /> Sent</Badge>;
  return <Badge variant="outline" className="text-xs gap-1 shrink-0"><FlaskConical className="h-3 w-3" /> Lab pending</Badge>;
}

export function PatientVisitsView({ patient, appointments, visitNotes, onDataChanged }: Props) {
  const [newOpen, setNewOpen] = useState(false);
  const [openVisitNote, setOpenVisitNote] = useState<Tables<"visit_notes"> | null>(null);
  const [labOrders, setLabOrders] = useState<Record<string, { status: LabOrderStatus }>>({});

  // Load status for any lab orders referenced by visits.
  useEffect(() => {
    const ids = visitNotes.map((v) => (v as any).lab_order_id).filter(Boolean) as string[];
    if (ids.length === 0) { setLabOrders({}); return; }
    supabase.from("lab_orders").select("id,status").in("id", ids).then(({ data }) => {
      const map: Record<string, { status: LabOrderStatus }> = {};
      (data ?? []).forEach((r: any) => { map[r.id] = { status: r.status }; });
      setLabOrders(map);
    });
  }, [visitNotes]);

  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);
  // A visit is "completed" if its vitals.status flag is set, OR if it's an
  // onboarding visit (those are always finalized at the moment they're created).
  const isCompleted = (v: Tables<"visit_notes">) => {
    if (isOnboardingVisit(v)) return true;
    const status = ((v as any).vitals?.status as string | undefined) ?? null;
    return status === "completed";
  };
  const upcomingVisits = visitNotes
    .filter((v) => !isCompleted(v) && v.visit_date >= todayStr)
    .sort((a, b) => a.visit_date.localeCompare(b.visit_date));
  const pastVisits = visitNotes
    .filter((v) => isCompleted(v) || v.visit_date < todayStr)
    .sort((a, b) => b.visit_date.localeCompare(a.visit_date));

  if (openVisitNote) {
    if (isOnboardingVisit(openVisitNote)) {
      return <OnboardingVisitDetailView patient={patient} visit={openVisitNote} onBack={() => setOpenVisitNote(null)} />;
    }
    return (
      <VisitDetailView
        patient={patient}
        visit={openVisitNote as any}
        onBack={() => setOpenVisitNote(null)}
        onChanged={onDataChanged}
      />
    );
  }

  const renderRow = (vn: Tables<"visit_notes">) => {
    const v = vn as any;
    const isOnb = isOnboardingVisit(vn);
    const typeLabel = isOnb ? "Initial Consultation" : (v.visit_type ? visitTypeLabel(v.visit_type) : (vn.chief_complaint ?? "Visit"));
    const modeLab = v.visit_mode ? visitModeLabel(v.visit_mode) : null;
    const dateStr = new Date(vn.visit_date).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
    const labOrder = v.lab_order_id ? labOrders[v.lab_order_id] : null;
    return (
      <div
        key={vn.id}
        className="flex items-start justify-between p-3 rounded-lg border cursor-pointer hover:bg-muted/50 transition-colors"
        onClick={() => setOpenVisitNote(vn)}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-medium">{typeLabel}</p>
            {isOnb ? (
              <>
                <Badge variant="secondary" className="text-xs gap-1"><UserCheck className="h-3 w-3" /> Onboarding</Badge>
                <Badge variant="secondary" className="text-xs gap-1"><CheckCircle2 className="h-3 w-3" /> Completed</Badge>
              </>
            ) : (
              modeChip(v.visit_mode)
            )}
            {labStatusChip(labOrder?.status as LabOrderStatus | undefined)}
          </div>
          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
            <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {dateStr}</span>
            {v.visit_time && <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {String(v.visit_time).slice(0, 5)}</span>}
            {v.attending_doctor && <span className="flex items-center gap-1"><Stethoscope className="h-3 w-3" /> {v.attending_doctor}</span>}
            {v.attending_nurse && <span>· Nurse {v.attending_nurse}</span>}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Visits</h2>
        <Button onClick={() => setNewOpen(true)} className="gap-1.5">
          <Plus className="h-4 w-4" /> New Visit
        </Button>
      </div>

      {/* Upcoming */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            Upcoming Visits ({upcomingVisits.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {upcomingVisits.length === 0 ? (
            <p className="text-sm text-muted-foreground">No upcoming visits scheduled.</p>
          ) : (
            <div className="space-y-3">{upcomingVisits.map(renderRow)}</div>
          )}
        </CardContent>
      </Card>

      {/* History */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Clock className="h-5 w-5 text-muted-foreground" />
            Visit History ({pastVisits.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {pastVisits.length === 0 ? (
            <p className="text-sm text-muted-foreground">No visit history yet.</p>
          ) : (
            <div className="space-y-3">{pastVisits.map(renderRow)}</div>
          )}
        </CardContent>
      </Card>

      <NewVisitDialog
        open={newOpen}
        onOpenChange={setNewOpen}
        patientId={patient.id}
        patientName={patient.full_name}
        onCreated={onDataChanged}
      />
    </div>
  );
}
