import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Calendar, Clock, Plus, Play, Video, MapPin, Home, UserCheck, FlaskConical, Stethoscope, CheckCircle2 } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";
import { VisitConsultationView } from "./VisitConsultationView";
import { OnboardingVisitDetailView } from "./OnboardingVisitDetailView";

interface Props {
  patient: Tables<"patients">;
  appointments: Tables<"appointments">[];
  visitNotes: Tables<"visit_notes">[];
  onDataChanged: () => void;
}

const APPOINTMENT_TYPE_LABELS: Record<string, string> = {
  consultation: "Consultation",
  follow_up: "Follow-up",
  procedure: "Procedure",
  check_up: "Check-up",
  urgent: "Urgent",
};

function isOnboardingVisit(vn: Tables<"visit_notes">): boolean {
  if (vn.chief_complaint === "Initial Consultation / Onboarding") return true;
  const v = (vn.vitals as any) ?? {};
  return v?.visit_type === "onboarding";
}

export function PatientVisitsView({ patient, appointments, visitNotes, onDataChanged }: Props) {
  const [activeVisit, setActiveVisit] = useState<{ mode: "new" | "appointment"; appointment?: Tables<"appointments"> } | null>(null);
  const [openVisitNote, setOpenVisitNote] = useState<Tables<"visit_notes"> | null>(null);


  const now = new Date();
  const upcomingAppointments = appointments
    .filter((a) => new Date(a.start_time) >= now)
    .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
  const pastAppointments = appointments
    .filter((a) => new Date(a.start_time) < now)
    .sort((a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime());

  if (openVisitNote) {
    return (
      <OnboardingVisitDetailView
        patient={patient}
        visit={openVisitNote}
        onBack={() => setOpenVisitNote(null)}
      />
    );
  }

  if (activeVisit) {
    return (
      <VisitConsultationView
        patient={patient}
        appointment={activeVisit.appointment}
        onBack={() => setActiveVisit(null)}
        onSaved={() => {
          setActiveVisit(null);
          onDataChanged();
        }}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Visits</h2>
        <Button onClick={() => setActiveVisit({ mode: "new" })} className="gap-1.5">
          <Plus className="h-4 w-4" /> New Visit
        </Button>
      </div>

      {/* Upcoming Visits */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            Upcoming Visits ({upcomingAppointments.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {upcomingAppointments.length === 0 ? (
            <p className="text-sm text-muted-foreground">No upcoming visits scheduled.</p>
          ) : (
            <div className="space-y-3">
              {upcomingAppointments.map((appt) => {
                const a = appt as any;
                return (
                  <div
                    key={appt.id}
                    className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors cursor-pointer group"
                    onClick={() => setActiveVisit({ mode: "appointment", appointment: appt })}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-medium truncate">{appt.title}</p>
                        <Badge variant="outline" className="text-xs capitalize shrink-0">
                          {APPOINTMENT_TYPE_LABELS[appt.appointment_type] || appt.appointment_type}
                        </Badge>
                        {a.visit_modality === "remote" ? (
                          <Badge variant="secondary" className="text-xs gap-1 shrink-0">
                            <Video className="h-3 w-3" /> Remote
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-xs gap-1 shrink-0">
                            <MapPin className="h-3 w-3" /> In-Person
                          </Badge>
                        )}
                        {a.is_home_visit && (
                          <Badge variant="secondary" className="text-xs gap-1 shrink-0">
                            <Home className="h-3 w-3" /> Home Visit
                          </Badge>
                        )}
                        {a.is_onboarding && (
                          <Badge variant="secondary" className="text-xs gap-1 shrink-0">
                            <UserCheck className="h-3 w-3" /> Onboarding
                          </Badge>
                        )}
                        {a.is_nurse_visit && (
                          <Badge variant="secondary" className="text-xs gap-1 shrink-0">
                            <Stethoscope className="h-3 w-3" /> Nurse
                          </Badge>
                        )}
                        {a.is_labs && (
                          <Badge variant="secondary" className="text-xs gap-1 shrink-0">
                            <FlaskConical className="h-3 w-3" /> Labs
                          </Badge>
                        )}
                        {a.is_external_specialist && (
                          <Badge className="text-xs gap-1 shrink-0 bg-accent text-accent-foreground border-transparent">
                            External Specialist
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(appt.start_time).toLocaleDateString()}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {new Date(appt.start_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          {" — "}
                          {new Date(appt.end_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                      {a.is_external_specialist && (a.specialist_name || a.specialist_location) && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {a.specialist_name}{a.specialist_name && a.specialist_location ? " · " : ""}{a.specialist_location}
                        </p>
                      )}
                      {appt.notes && <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{appt.notes}</p>}
                    </div>
                    <Button
                      size="lg"
                      className="shrink-0 ml-4 gap-2 font-semibold"
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveVisit({ mode: "appointment", appointment: appt });
                      }}
                    >
                      <Play className="h-4 w-4" />
                      Start Consultation
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Past Visits */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Clock className="h-5 w-5 text-muted-foreground" />
            Visit History ({pastAppointments.length + visitNotes.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {pastAppointments.length === 0 && visitNotes.length === 0 ? (
            <p className="text-sm text-muted-foreground">No visit history yet.</p>
          ) : (
            <div className="space-y-3">
              {pastAppointments.map((appt) => (
                <div key={appt.id} className="flex items-start justify-between p-3 rounded-lg border">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium">{appt.title}</p>
                      <Badge variant="secondary" className="text-xs capitalize">
                        {APPOINTMENT_TYPE_LABELS[appt.appointment_type] || appt.appointment_type}
                      </Badge>
                    </div>
                    {appt.notes && <p className="text-xs text-muted-foreground mt-1">{appt.notes}</p>}
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap ml-4">
                    {new Date(appt.start_time).toLocaleDateString()}
                  </span>
                </div>
              ))}
              {visitNotes.length > 0 && pastAppointments.length > 0 && <Separator />}
              {visitNotes.map((vn) => (
                <div key={vn.id} className="flex items-start justify-between p-3 rounded-lg border">
                  <div>
                    <p className="text-sm font-medium">{vn.chief_complaint || "Visit Note"}</p>
                    {vn.notes && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{vn.notes}</p>}
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap ml-4">
                    {new Date(vn.visit_date).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
