import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format } from "date-fns";
import { X, ChevronLeft, Stethoscope, Phone, UserCheck, Briefcase } from "lucide-react";
import { cn } from "@/lib/utils";

type ApptKind = "patient_visit" | "doctor_meeting" | "nurse_task" | "working_time";

interface CommPrefill {
  kind: "doctor_meeting";
  otherDoctorName: string;
  linkedPatientId: string | null;
  coordinationCategory: "" | "referral" | "case_discussion" | "handover" | "specialist_consult" | "other";
  date: string | null;
  notes: string;
  sourceTaskId: string;
}

interface AppointmentFormPanelProps {
  selectedDate?: Date;
  editingAppointment?: any;
  prefill?: CommPrefill | null;
  onClose: () => void;
}

interface PatientOption {
  id: string;
  full_name: string;
}
interface NurseOption {
  user_id: string;
  full_name: string;
}

const KIND_TILES: Array<{
  key: ApptKind;
  icon: typeof Stethoscope;
  emoji: string;
  title: string;
  desc: string;
}> = [
  { key: "patient_visit", icon: Stethoscope, emoji: "🧑‍⚕️", title: "Patient Visit", desc: "Consultation, follow-up, check-up, onboarding, acute" },
  { key: "doctor_meeting", icon: Phone, emoji: "📞", title: "Doctor Call / Meeting", desc: "Coordination with another doctor or specialist" },
  { key: "nurse_task", icon: UserCheck, emoji: "👩‍⚕️", title: "Nurse Visit / Task", desc: "Assign a visit or task to a nurse" },
  { key: "working_time", icon: Briefcase, emoji: "🗂", title: "Internal / Working Time", desc: "Admin, research, documentation, meeting" },
];

export function AppointmentFormPanel({ selectedDate, editingAppointment, prefill, onClose }: AppointmentFormPanelProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [patients, setPatients] = useState<PatientOption[]>([]);
  const [nurses, setNurses] = useState<NurseOption[]>([]);
  const [loading, setLoading] = useState(false);

  const [kind, setKind] = useState<ApptKind | null>(null);

  // Shared
  const [title, setTitle] = useState("");
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("10:00");
  const [notes, setNotes] = useState("");

  // Patient visit
  const [patientId, setPatientId] = useState("");
  const [visitCategory, setVisitCategory] = useState<string>("consultation");
  const [visitModality, setVisitModality] = useState("in_person");
  const [isLabs, setIsLabs] = useState(false);
  const [labPackage, setLabPackage] = useState("custom");
  const [selectedLabTests, setSelectedLabTests] = useState<string[]>([]);
  const [assignedNurseId, setAssignedNurseId] = useState("");
  const [fastingRequired, setFastingRequired] = useState(false);
  const [sendInvite, setSendInvite] = useState(false);

  // Doctor meeting
  const [otherDoctorName, setOtherDoctorName] = useState("");
  const [coordinationCategory, setCoordinationCategory] = useState("case_discussion");
  const [linkedPatientId, setLinkedPatientId] = useState("");

  // Nurse task
  const [nurseId, setNurseId] = useState("");
  const [taskDescription, setTaskDescription] = useState("");

  // Internal
  const [internalCategory, setInternalCategory] = useState("admin");

  useEffect(() => {
    const fetchData = async () => {
      const [patientsRes, rolesRes] = await Promise.all([
        supabase.from("patients").select("id, full_name").order("full_name"),
        supabase.from("user_roles").select("user_id, role").eq("role", "nurse"),
      ]);
      if (patientsRes.data) setPatients(patientsRes.data);
      if (rolesRes.data && rolesRes.data.length > 0) {
        const ids = rolesRes.data.map((r) => r.user_id);
        const profilesRes = await supabase
          .from("profiles")
          .select("user_id, full_name")
          .in("user_id", ids);
        if (profilesRes.data) setNurses(profilesRes.data);
      }
    };
    fetchData();
  }, []);

  // Pre-fill when editing (mostly patient_visit shape)
  useEffect(() => {
    if (!editingAppointment) return;
    setKind("patient_visit");
    setTitle(editingAppointment.title || "");
    setPatientId(editingAppointment.patient_id || "");
    setVisitModality(editingAppointment.is_home_visit ? "home_visit" : editingAppointment.visit_modality || "in_person");
    setVisitCategory(editingAppointment.appointment_type || "consultation");
    setIsLabs(editingAppointment.is_labs || false);
    setStartTime(editingAppointment.start_time ? format(new Date(editingAppointment.start_time), "HH:mm") : "09:00");
    setEndTime(editingAppointment.end_time ? format(new Date(editingAppointment.end_time), "HH:mm") : "10:00");
    setNotes(editingAppointment.notes || "");
    setLabPackage(editingAppointment.lab_package || "custom");
    setSelectedLabTests(Array.isArray(editingAppointment.lab_tests_selected) ? editingAppointment.lab_tests_selected : []);
  }, [editingAppointment]);

  // Apply prefill (e.g. from a communication task → "Schedule")
  useEffect(() => {
    if (!prefill) return;
    if (prefill.kind === "doctor_meeting") {
      setKind("doctor_meeting");
      setOtherDoctorName(prefill.otherDoctorName || "");
      setLinkedPatientId(prefill.linkedPatientId || "");
      if (prefill.coordinationCategory) setCoordinationCategory(prefill.coordinationCategory);
      setNotes(prefill.notes || "");
    }
  }, [prefill]);

  const handleSubmit = async () => {
    if (!user || !kind) return;

    const dateStr = selectedDate ? format(selectedDate, "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd");

    // Validation per kind
    if (kind === "patient_visit" && !patientId) {
      toast({ title: "Missing patient", description: "Please select a patient.", variant: "destructive" });
      return;
    }
    if (kind === "doctor_meeting" && !otherDoctorName.trim()) {
      toast({ title: "Missing doctor name", description: "Please enter the other doctor or specialist.", variant: "destructive" });
      return;
    }
    if (kind === "nurse_task" && (!nurseId || !patientId)) {
      toast({ title: "Missing fields", description: "Nurse and patient are required.", variant: "destructive" });
      return;
    }

    let payload: any = {
      start_time: `${dateStr}T${startTime}:00`,
      end_time: `${dateStr}T${endTime}:00`,
      provider_id: user.id,
      notes: notes || null,
    };

    if (kind === "patient_visit") {
      const prepNotes = [notes, fastingRequired ? "⚠️ Fasting required before this visit." : ""].filter(Boolean).join("\n\n");
      payload = {
        ...payload,
        title: title || `${visitCategory.replace("_", " ")} – ${patients.find((p) => p.id === patientId)?.full_name ?? ""}`,
        patient_id: patientId,
        provider_id: assignedNurseId || user.id,
        appointment_type: visitCategory,
        visit_modality: visitModality === "home_visit" ? "in_person" : visitModality,
        is_home_visit: visitModality === "home_visit",
        is_onboarding: visitCategory === "onboarding",
        is_labs: isLabs,
        notes: prepNotes || null,
        lab_package: isLabs ? labPackage : null,
        lab_tests_selected: isLabs ? selectedLabTests : null,
      };
    } else if (kind === "doctor_meeting") {
      payload = {
        ...payload,
        title: title || `Call – ${otherDoctorName}`,
        patient_id: linkedPatientId || patientId || null,
        appointment_type: "doctor_meeting" as any,
        visit_modality: "remote",
        is_external_specialist: true,
        specialist_name: otherDoctorName,
        coordination_category: coordinationCategory,
      };
    } else if (kind === "nurse_task") {
      payload = {
        ...payload,
        title: title || taskDescription || "Nurse task",
        patient_id: patientId,
        provider_id: nurseId,
        appointment_type: "nurse_task" as any,
        is_nurse_visit: true,
        notes: [taskDescription, notes].filter(Boolean).join("\n\n") || null,
      };
    } else if (kind === "working_time") {
      payload = {
        ...payload,
        title: title || `Working Time – ${internalCategory}`,
        patient_id: null,
        appointment_type: "working_time" as any,
        working_category: internalCategory,
      };
    }

    setLoading(true);
    let error;
    let insertedId: string | null = null;
    if (editingAppointment) {
      ({ error } = await supabase.from("appointments").update(payload).eq("id", editingAppointment.id));
    } else {
      const { data, error: insErr } = await supabase
        .from("appointments")
        .insert(payload)
        .select("id")
        .single();
      error = insErr;
      insertedId = data?.id ?? null;
    }
    setLoading(false);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }

    // If created from a task prefill, link the new appointment back to the task
    if (insertedId && prefill?.sourceTaskId) {
      await supabase
        .from("tasks")
        .update({ scheduled_appointment_id: insertedId } as any)
        .eq("id", prefill.sourceTaskId);
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    }

    if (kind === "patient_visit" && sendInvite) {
      toast({ title: "Note", description: "Calendar invite sending requires email integration." });
    }

    toast({ title: editingAppointment ? "Appointment updated" : "Appointment created" });
    queryClient.invalidateQueries({ queryKey: ["appointments"] });
    onClose();
  };

  return (
    <Card className="h-fit xl:sticky xl:top-6">
      <CardHeader className="pb-3 flex-row items-center justify-between space-y-0">
        <div className="flex items-center gap-2">
          {kind && (
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setKind(null)} aria-label="Back">
              <ChevronLeft className="h-4 w-4" />
            </Button>
          )}
          <CardTitle className="text-base">
            {editingAppointment ? "Edit Appointment" : kind ? KIND_TILES.find((k) => k.key === kind)?.title : "New Appointment"}
          </CardTitle>
        </div>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose} aria-label="Close">
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>

      <CardContent>
        <p className="text-xs text-muted-foreground mb-3">
          {selectedDate ? format(selectedDate, "EEEE, MMMM d, yyyy") : "Select a date"}
        </p>

        <ScrollArea className="max-h-[calc(100vh-260px)] pr-2">
          {!kind ? (
            <div className="space-y-2">
              {KIND_TILES.map((tile) => (
                <button
                  key={tile.key}
                  onClick={() => setKind(tile.key)}
                  className={cn(
                    "w-full text-left rounded-xl border p-3 transition-colors hover:bg-accent/40 hover:border-primary/40",
                    "flex items-start gap-3",
                  )}
                >
                  <span className="text-2xl leading-none mt-0.5">{tile.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold">{tile.title}</p>
                    <p className="text-xs text-muted-foreground leading-snug mt-0.5">{tile.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {/* Patient Visit */}
              {kind === "patient_visit" && (
                <>
                  <Field label="Patient *">
                    <Select value={patientId} onValueChange={setPatientId}>
                      <SelectTrigger><SelectValue placeholder="Select patient" /></SelectTrigger>
                      <SelectContent>
                        {patients.map((p) => (
                          <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>

                  <Field label="Visit category">
                    <Select value={visitCategory} onValueChange={setVisitCategory}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="onboarding">Onboarding</SelectItem>
                        <SelectItem value="acute">Acute</SelectItem>
                        <SelectItem value="consultation">Consultation</SelectItem>
                        <SelectItem value="follow_up">Follow-up</SelectItem>
                        <SelectItem value="check_up">Check-up</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>

                  <Field label="Modality">
                    <Select value={visitModality} onValueChange={setVisitModality}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="in_person">In-Person</SelectItem>
                        <SelectItem value="remote">Remote</SelectItem>
                        <SelectItem value="home_visit">Home Visit</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>

                  <TimeRow startTime={startTime} endTime={endTime} setStartTime={setStartTime} setEndTime={setEndTime} />

                  <label className="flex items-center gap-2 text-sm">
                    <Checkbox checked={isLabs} onCheckedChange={(v) => setIsLabs(!!v)} />
                    Labs included
                  </label>

                  {isLabs && (
                    <div className="space-y-2 border rounded-lg p-3 bg-muted/30">
                      <Label className="text-xs font-medium">Lab Package</Label>
                      <Select value={labPackage} onValueChange={(v) => {
                        setLabPackage(v);
                        if (v === "basic") setSelectedLabTests(["blood_pressure", "hba1c", "ldl"]);
                        else if (v === "comprehensive") setSelectedLabTests(["blood_pressure", "hba1c", "ldl", "liver", "kidney", "thyroid"]);
                        else if (v === "metabolic") setSelectedLabTests(["hba1c", "ldl", "liver"]);
                        else if (v === "hormone") setSelectedLabTests(["thyroid", "testosterone_estrogen"]);
                        else if (v === "custom") setSelectedLabTests([]);
                      }}>
                        <SelectTrigger><SelectValue placeholder="Select package" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="basic">Basic</SelectItem>
                          <SelectItem value="comprehensive">Comprehensive</SelectItem>
                          <SelectItem value="metabolic">Metabolic</SelectItem>
                          <SelectItem value="hormone">Hormone</SelectItem>
                          <SelectItem value="custom">Custom</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  <Field label="Assign nurse (optional)">
                    <Select value={assignedNurseId} onValueChange={setAssignedNurseId}>
                      <SelectTrigger><SelectValue placeholder="Select nurse" /></SelectTrigger>
                      <SelectContent>
                        {nurses.map((n) => (
                          <SelectItem key={n.user_id} value={n.user_id}>{n.full_name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>

                  <Field label="Prep notes">
                    <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="Instructions for patient…" />
                  </Field>

                  <label className="flex items-center gap-2 text-sm">
                    <Checkbox checked={fastingRequired} onCheckedChange={(v) => setFastingRequired(!!v)} />
                    Fasting required
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <Checkbox checked={sendInvite} onCheckedChange={(v) => setSendInvite(!!v)} />
                    Send calendar invite
                  </label>
                </>
              )}

              {/* Doctor Meeting */}
              {kind === "doctor_meeting" && (
                <>
                  <Field label="Other doctor / specialist *">
                    <Input value={otherDoctorName} onChange={(e) => setOtherDoctorName(e.target.value)} placeholder="e.g. Dr. Patel (Cardiology)" />
                  </Field>

                  <Field label="Care coordination category *">
                    <Select value={coordinationCategory} onValueChange={setCoordinationCategory}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="referral">Referral</SelectItem>
                        <SelectItem value="case_discussion">Case Discussion</SelectItem>
                        <SelectItem value="handover">Handover</SelectItem>
                        <SelectItem value="specialist_consult">Specialist Consult</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>

                  <Field label="Linked patient (optional)">
                    <Select value={linkedPatientId} onValueChange={setLinkedPatientId}>
                      <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                      <SelectContent>
                        {patients.map((p) => (
                          <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>

                  <TimeRow startTime={startTime} endTime={endTime} setStartTime={setStartTime} setEndTime={setEndTime} />

                  <Field label="Notes / agenda">
                    <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
                  </Field>
                </>
              )}

              {/* Nurse Task */}
              {kind === "nurse_task" && (
                <>
                  <Field label="Nurse *">
                    <Select value={nurseId} onValueChange={setNurseId}>
                      <SelectTrigger><SelectValue placeholder="Select nurse" /></SelectTrigger>
                      <SelectContent>
                        {nurses.map((n) => (
                          <SelectItem key={n.user_id} value={n.user_id}>{n.full_name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>

                  <Field label="Patient *">
                    <Select value={patientId} onValueChange={setPatientId}>
                      <SelectTrigger><SelectValue placeholder="Select patient" /></SelectTrigger>
                      <SelectContent>
                        {patients.map((p) => (
                          <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>

                  <Field label="Task description">
                    <Textarea value={taskDescription} onChange={(e) => setTaskDescription(e.target.value)} rows={2} placeholder="What should the nurse do?" />
                  </Field>

                  <TimeRow startTime={startTime} endTime={endTime} setStartTime={setStartTime} setEndTime={setEndTime} />

                  <Field label="Notes">
                    <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
                  </Field>
                </>
              )}

              {/* Working Time */}
              {kind === "working_time" && (
                <>
                  <Field label="Category">
                    <Select value={internalCategory} onValueChange={setInternalCategory}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="research">Research</SelectItem>
                        <SelectItem value="meeting">Meeting</SelectItem>
                        <SelectItem value="conference">Conference</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>

                  <Field label="Title / description">
                    <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Documentation block" />
                  </Field>

                  <TimeRow startTime={startTime} endTime={endTime} setStartTime={setStartTime} setEndTime={setEndTime} />

                  <Field label="Notes">
                    <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
                  </Field>
                </>
              )}

              <div className="flex gap-2 pt-2">
                <Button variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
                <Button className="flex-1" onClick={handleSubmit} disabled={loading}>
                  {loading ? "Saving…" : editingAppointment ? "Update" : "Create"}
                </Button>
              </div>
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}

function TimeRow({
  startTime, endTime, setStartTime, setEndTime,
}: {
  startTime: string; endTime: string;
  setStartTime: (v: string) => void; setEndTime: (v: string) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <Field label="Start"><Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} /></Field>
      <Field label="End"><Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} /></Field>
    </div>
  );
}
