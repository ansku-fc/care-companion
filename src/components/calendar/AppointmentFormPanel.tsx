import { useState, useEffect, useRef, useLayoutEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { formatLastFirst, sortByLastFirst } from "@/lib/patientName";
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
import { format, parse } from "date-fns";
import { X, ChevronLeft, Stethoscope, Phone, UserCheck, Briefcase, Paperclip, CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

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

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [showScrollFade, setShowScrollFade] = useState(false);

  const updateScrollFade = () => {
    const el = scrollRef.current;
    if (!el) {
      setShowScrollFade(false);
      return;
    }
    const hasOverflow = el.scrollHeight - el.clientHeight > 4;
    const atBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 4;
    setShowScrollFade(hasOverflow && !atBottom);
  };
  const handleScroll = updateScrollFade;
  useLayoutEffect(() => {
    updateScrollFade();
  });
  useEffect(() => {
    const onResize = () => updateScrollFade();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // Shared
  const [title, setTitle] = useState("");
  const [dateValue, setDateValue] = useState<string>(
    selectedDate ? format(selectedDate, "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd")
  );
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
  const [doctorMeetingTitle, setDoctorMeetingTitle] = useState("");
  const [doctorMeetingTitleEdited, setDoctorMeetingTitleEdited] = useState(false);

  const CATEGORY_LABELS: Record<string, string> = {
    referral: "Referral",
    case_discussion: "Case Discussion",
    handover: "Handover",
    specialist_consult: "Specialist Consult",
    other: "Other",
  };

  // Nurse task
  const [nurseId, setNurseId] = useState("");
  const [taskDescription, setTaskDescription] = useState("");

  // Internal
  const [internalCategory, setInternalCategory] = useState("admin");

  // Attachment
  const [attachedFile, setAttachedFile] = useState<File | null>(null);

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

  // Pre-fill when editing — choose kind based on appointment_type
  useEffect(() => {
    if (!editingAppointment) return;
    const apptType = editingAppointment.appointment_type;
    let editKind: ApptKind = "patient_visit";
    if (apptType === "doctor_meeting") editKind = "doctor_meeting";
    else if (apptType === "nurse_task" || editingAppointment.is_nurse_visit) editKind = "nurse_task";
    else if (apptType === "working_time") editKind = "working_time";
    setKind(editKind);

    setTitle(editingAppointment.title || "");
    setStartTime(editingAppointment.start_time ? format(new Date(editingAppointment.start_time), "HH:mm") : "09:00");
    setEndTime(editingAppointment.end_time ? format(new Date(editingAppointment.end_time), "HH:mm") : "10:00");
    setNotes(editingAppointment.notes || "");
    if (editingAppointment.start_time) {
      setDateValue(format(new Date(editingAppointment.start_time), "yyyy-MM-dd"));
    }

    if (editKind === "patient_visit") {
      setPatientId(editingAppointment.patient_id || "");
      setVisitModality(editingAppointment.is_home_visit ? "home_visit" : editingAppointment.visit_modality || "in_person");
      setVisitCategory(editingAppointment.appointment_type || "consultation");
      setIsLabs(editingAppointment.is_labs || false);
      setLabPackage(editingAppointment.lab_package || "custom");
      setSelectedLabTests(Array.isArray(editingAppointment.lab_tests_selected) ? editingAppointment.lab_tests_selected : []);
    } else if (editKind === "doctor_meeting") {
      setOtherDoctorName(editingAppointment.other_doctor_name || editingAppointment.specialist_name || "");
      setLinkedPatientId(editingAppointment.patient_id || "");
      if (editingAppointment.coordination_category) setCoordinationCategory(editingAppointment.coordination_category);
      setDoctorMeetingTitle(editingAppointment.title || "");
      setDoctorMeetingTitleEdited(true);
    } else if (editKind === "nurse_task") {
      setPatientId(editingAppointment.patient_id || "");
      setTaskDescription(editingAppointment.notes || "");
    }
  }, [editingAppointment]);

  // Sync dateValue when selectedDate changes (e.g. user picks a new day before opening form)
  useEffect(() => {
    if (editingAppointment) return;
    if (selectedDate) setDateValue(format(selectedDate, "yyyy-MM-dd"));
  }, [selectedDate, editingAppointment]);

  // Apply prefill (e.g. from a communication task → "Schedule")
  useEffect(() => {
    if (!prefill) return;
    if (prefill.kind === "doctor_meeting") {
      setKind("doctor_meeting");
      setOtherDoctorName(prefill.otherDoctorName || "");
      setLinkedPatientId(prefill.linkedPatientId || "");
      if (prefill.coordinationCategory) setCoordinationCategory(prefill.coordinationCategory);
      setNotes(prefill.notes || "");
      if (prefill.date) {
        const d = new Date(prefill.date);
        if (!isNaN(d.getTime())) setDateValue(format(d, "yyyy-MM-dd"));
      }
    }
  }, [prefill]);

  // Auto-generate doctor meeting title from category, patient, doctor name
  useEffect(() => {
    if (kind !== "doctor_meeting") return;
    if (doctorMeetingTitleEdited) return;
    const categoryLabel = CATEGORY_LABELS[coordinationCategory] ?? "";
    const patientName = patients.find((p) => p.id === linkedPatientId)?.full_name ?? "";
    const doctorName = otherDoctorName.trim();
    const parts = [categoryLabel, patientName, doctorName].filter(Boolean);
    setDoctorMeetingTitle(parts.join(" – "));
  }, [kind, coordinationCategory, linkedPatientId, otherDoctorName, patients, doctorMeetingTitleEdited]);

  const handleSubmit = async () => {
    if (!user || !kind) return;

    const dateStr = dateValue || format(new Date(), "yyyy-MM-dd");

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
      notes: notes || null,
    };

    if (kind === "patient_visit") {
      const prepNotes = [notes, fastingRequired ? "⚠️ Fasting required before this visit." : ""].filter(Boolean).join("\n\n");
      payload = {
        ...payload,
        title: title || `${visitCategory.replace("_", " ")} – ${patients.find((p) => p.id === patientId)?.full_name ?? ""}`,
        patient_id: patientId,
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
        title: doctorMeetingTitle || title || `Call – ${otherDoctorName}`,
        patient_id: linkedPatientId || patientId || null,
        appointment_type: "doctor_meeting" as any,
        visit_modality: "remote",
        is_external_specialist: true,
        specialist_name: otherDoctorName,
        coordination_category: coordinationCategory || null,
        other_doctor_name: otherDoctorName,
      };
    } else if (kind === "nurse_task") {
      payload = {
        ...payload,
        title: title || taskDescription || "Nurse task",
        patient_id: patientId,
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

    const apptId = insertedId ?? editingAppointment?.id;

    // Upload attachment if any
    if (attachedFile && apptId) {
      try {
        const path = `${apptId}/${attachedFile.name}`;
        const { error: upErr } = await supabase.storage
          .from("appointment-attachments")
          .upload(path, attachedFile, { upsert: true });
        if (upErr) throw upErr;
        const { data: pub } = supabase.storage
          .from("appointment-attachments")
          .getPublicUrl(path);
        await supabase
          .from("appointments")
          .update({ attachment_url: pub.publicUrl } as any)
          .eq("id", apptId);
      } catch (e: any) {
        toast({
          title: "File upload not yet configured",
          description: "Appointment saved without attachment.",
        });
      }
    }

    // If created from a task prefill, link the new appointment back to the task and mark task done
    let taskCompleted = false;
    if (insertedId && prefill?.sourceTaskId) {
      await supabase
        .from("tasks")
        .update({ scheduled_appointment_id: insertedId, status: "done" } as any)
        .eq("id", prefill.sourceTaskId);
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      taskCompleted = true;
    }

    if (kind === "patient_visit" && sendInvite) {
      toast({ title: "Note", description: "Calendar invite sending requires email integration." });
    }

    toast({
      title: taskCompleted
        ? "Appointment created and task marked as done"
        : editingAppointment
          ? "Appointment updated"
          : "Appointment created",
    });
    queryClient.invalidateQueries({ queryKey: ["appointments"] });
    onClose();
  };

  return (
    <Card className="flex flex-col h-full min-h-0 overflow-hidden">
      <CardHeader className="pb-3 flex-row items-center justify-between space-y-0 shrink-0">
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

      <CardContent className="flex-1 min-h-0 flex flex-col p-0 overflow-hidden">
        <div className="relative flex-1 min-h-0">
          <div ref={scrollRef} onScroll={handleScroll} className="h-full overflow-y-auto px-4 pt-1 space-y-4">
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
              {/* Date (shared, always shown once a kind is picked) */}
              <Field label="Date">
                <DatePopover value={dateValue} onChange={setDateValue} />
              </Field>

              {/* Patient Visit */}
              {kind === "patient_visit" && (
                <>
                  <Field label="Patient *">
                    <Select value={patientId} onValueChange={setPatientId}>
                      <SelectTrigger><SelectValue placeholder="Select patient" /></SelectTrigger>
                      <SelectContent>
                        {sortByLastFirst(patients).map((p) => (
                          <SelectItem key={p.id} value={p.id}>{formatLastFirst(p.full_name)}</SelectItem>
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

                  <Field label="Category *">
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
                        {sortByLastFirst(patients).map((p) => (
                          <SelectItem key={p.id} value={p.id}>{formatLastFirst(p.full_name)}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>

                  <Field label="Appointment name">
                    <Input
                      value={doctorMeetingTitle}
                      onChange={(e) => {
                        setDoctorMeetingTitle(e.target.value);
                        setDoctorMeetingTitleEdited(true);
                      }}
                      placeholder="Auto-generated"
                    />
                  </Field>

                  <TimeRow startTime={startTime} endTime={endTime} setStartTime={setStartTime} setEndTime={setEndTime} />

                  <Field label="Attach file (optional)">
                    <AttachFileControl attachedFile={attachedFile} setAttachedFile={setAttachedFile} />
                  </Field>

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
                        {sortByLastFirst(patients).map((p) => (
                          <SelectItem key={p.id} value={p.id}>{formatLastFirst(p.full_name)}</SelectItem>
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

              {/* Attach file (shared, except doctor_meeting which has its own placement) */}
              {kind !== "doctor_meeting" && (
                <Field label="Attach file (optional)">
                  <AttachFileControl attachedFile={attachedFile} setAttachedFile={setAttachedFile} />
                </Field>
              )}
            </div>
          )}
          </div>
          {showScrollFade && (
            <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-10 bg-gradient-to-t from-background to-transparent" />
          )}
        </div>

        {kind && (
          <div className="shrink-0 border-t pt-4 px-4 pb-4 bg-background flex gap-3">
            <Button variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
            <Button className="flex-1" onClick={handleSubmit} disabled={loading}>
              {loading ? "Saving…" : editingAppointment ? "Save changes" : "Create"}
            </Button>
          </div>
        )}
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

function DatePopover({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const dateObj = value ? parse(value, "yyyy-MM-dd", new Date()) : undefined;
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn("w-full justify-start text-left font-normal", !dateObj && "text-muted-foreground")}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {dateObj ? format(dateObj, "EEEE, MMMM d, yyyy") : <span>Pick a date</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={dateObj}
          onSelect={(d) => {
            if (d) {
              onChange(format(d, "yyyy-MM-dd"));
              setOpen(false);
            }
          }}
          initialFocus
          className={cn("p-3 pointer-events-auto")}
        />
      </PopoverContent>
    </Popover>
  );
}

function AttachFileControl({
  attachedFile,
  setAttachedFile,
}: {
  attachedFile: File | null;
  setAttachedFile: (f: File | null) => void;
}) {
  if (attachedFile) {
    return (
      <div className="flex items-center justify-between gap-2 rounded-md border bg-muted/30 px-3 py-2 text-sm">
        <span className="flex items-center gap-2 truncate">
          <Paperclip className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <span className="truncate">{attachedFile.name}</span>
        </span>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-6 w-6 shrink-0"
          onClick={() => setAttachedFile(null)}
          aria-label="Remove file"
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
    );
  }
  return (
    <label className="flex items-center justify-center gap-2 w-full rounded-md border border-dashed border-input bg-background px-3 py-3 text-sm cursor-pointer hover:bg-accent/40 transition-colors">
      <Paperclip className="h-4 w-4 text-muted-foreground" />
      <span>Choose file</span>
      <input
        type="file"
        className="hidden"
        accept=".pdf,.doc,.docx,image/*"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) setAttachedFile(f);
        }}
      />
    </label>
  );
}
