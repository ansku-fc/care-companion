import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { formatLastFirst, sortByLastFirst } from "@/lib/patientName";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format } from "date-fns";

interface AddAppointmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedDate?: Date;
  editingAppointment?: any;
}

interface PatientOption {
  id: string;
  full_name: string;
  email: string | null;
}

interface NurseOption {
  user_id: string;
  full_name: string;
}

export function AddAppointmentDialog({ open, onOpenChange, selectedDate, editingAppointment }: AddAppointmentDialogProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [patients, setPatients] = useState<PatientOption[]>([]);
  const [nurses, setNurses] = useState<NurseOption[]>([]);
  const [loading, setLoading] = useState(false);

  // Form state
  const [title, setTitle] = useState("");
  const [patientId, setPatientId] = useState("");
  const [assignedNurseId, setAssignedNurseId] = useState("");
  const [visitModality, setVisitModality] = useState("in_person");
  const [isOnboarding, setIsOnboarding] = useState(false);
  const [isNurseVisit, setIsNurseVisit] = useState(false);
  const [isLabs, setIsLabs] = useState(false);
  const [isExternalSpecialist, setIsExternalSpecialist] = useState(false);
  const [specialistName, setSpecialistName] = useState("");
  const [specialistLocation, setSpecialistLocation] = useState("");
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("10:00");
  const [notes, setNotes] = useState("");
  const [fastingRequired, setFastingRequired] = useState(false);
  const [sendInvite, setSendInvite] = useState(false);
  const [labPackage, setLabPackage] = useState("custom");
  const [selectedLabTests, setSelectedLabTests] = useState<string[]>([]);

  useEffect(() => {
    if (!open) return;
    // Fetch patients and nurses
    const fetchData = async () => {
      const [patientsRes, rolesRes] = await Promise.all([
        supabase.from("patients").select("id, full_name, email").order("full_name"),
        supabase.from("user_roles").select("user_id, role").eq("role", "nurse"),
      ]);

      if (patientsRes.data) setPatients(patientsRes.data);

      if (rolesRes.data && rolesRes.data.length > 0) {
        const nurseIds = rolesRes.data.map((r) => r.user_id);
        const profilesRes = await supabase
          .from("profiles")
          .select("user_id, full_name")
          .in("user_id", nurseIds);
        if (profilesRes.data) setNurses(profilesRes.data);
      }
    };
    fetchData();
  }, [open]);

  // Pre-fill form when editing
  useEffect(() => {
    if (!editingAppointment) return;
    setTitle(editingAppointment.title || "");
    setPatientId(editingAppointment.patient_id || "");
    setVisitModality(editingAppointment.is_home_visit ? "home_visit" : editingAppointment.visit_modality || "in_person");
    setIsOnboarding(editingAppointment.is_onboarding || false);
    setIsNurseVisit(editingAppointment.is_nurse_visit || false);
    setIsLabs(editingAppointment.is_labs || false);
    setIsExternalSpecialist(editingAppointment.is_external_specialist || false);
    setSpecialistName(editingAppointment.specialist_name || "");
    setSpecialistLocation(editingAppointment.specialist_location || "");
    setStartTime(editingAppointment.start_time ? format(new Date(editingAppointment.start_time), "HH:mm") : "09:00");
    setEndTime(editingAppointment.end_time ? format(new Date(editingAppointment.end_time), "HH:mm") : "10:00");
    setNotes(editingAppointment.notes || "");
    setLabPackage(editingAppointment.lab_package || "custom");
    setSelectedLabTests(Array.isArray(editingAppointment.lab_tests_selected) ? editingAppointment.lab_tests_selected : []);
  }, [editingAppointment]);

  const resetForm = () => {
    setTitle("");
    setPatientId("");
    setAssignedNurseId("");
    setVisitModality("in_person");
    setIsOnboarding(false);
    setIsNurseVisit(false);
    setIsLabs(false);
    setIsExternalSpecialist(false);
    setSpecialistName("");
    setSpecialistLocation("");
    setStartTime("09:00");
    setEndTime("10:00");
    setNotes("");
    setFastingRequired(false);
    setSendInvite(false);
    setLabPackage("custom");
    setSelectedLabTests([]);
  };

  const handleSubmit = async () => {
    if (!user || !patientId || !title) {
      toast({ title: "Missing fields", description: "Please fill in title and select a patient.", variant: "destructive" });
      return;
    }

    const dateStr = selectedDate ? format(selectedDate, "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd");
    const providerId = assignedNurseId || user.id;

    const prepNotes = [
      notes,
      fastingRequired ? "⚠️ Fasting required before this visit." : "",
    ].filter(Boolean).join("\n\n");

    const payload = {
      title,
      patient_id: patientId,
      provider_id: providerId,
      start_time: `${dateStr}T${startTime}:00`,
      end_time: `${dateStr}T${endTime}:00`,
      visit_modality: visitModality === "home_visit" ? "in_person" : visitModality,
      is_home_visit: visitModality === "home_visit",
      is_onboarding: isOnboarding,
      is_nurse_visit: isNurseVisit,
      is_labs: isLabs,
      is_external_specialist: isExternalSpecialist,
      specialist_name: isExternalSpecialist ? specialistName : null,
      specialist_location: isExternalSpecialist ? specialistLocation : null,
      notes: prepNotes || null,
      lab_package: isLabs ? labPackage : null,
      lab_tests_selected: isLabs ? selectedLabTests : null,
    };

    setLoading(true);
    let error;
    if (editingAppointment) {
      ({ error } = await supabase.from("appointments").update(payload).eq("id", editingAppointment.id));
    } else {
      ({ error } = await supabase.from("appointments").insert(payload));
    }
    setLoading(false);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }

    if (sendInvite) {
      toast({ title: "Note", description: "Calendar invite sending requires email integration (not yet configured)." });
    }

    toast({ title: editingAppointment ? "Appointment updated" : "Appointment created" });
    queryClient.invalidateQueries({ queryKey: ["appointments"] });
    resetForm();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editingAppointment ? "Edit Appointment" : "New Appointment"}</DialogTitle>
          <DialogDescription>
            {selectedDate ? format(selectedDate, "EEEE, MMMM d, yyyy") : "Select a date"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Title */}
          <div className="space-y-1.5">
            <Label htmlFor="title">Title</Label>
            <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Annual Check-up" />
          </div>

          {/* Patient */}
          <div className="space-y-1.5">
            <Label>Patient</Label>
            <Select value={patientId} onValueChange={setPatientId}>
              <SelectTrigger><SelectValue placeholder="Select patient" /></SelectTrigger>
              <SelectContent>
                {sortByLastFirst(patients).map((p) => (
                  <SelectItem key={p.id} value={p.id}>{formatLastFirst(p.full_name)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Time */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="startTime">Start Time</Label>
              <Input id="startTime" type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="endTime">End Time</Label>
              <Input id="endTime" type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
            </div>
          </div>

          {/* Visit Modality */}
          <div className="space-y-1.5">
            <Label>Visit Type</Label>
            <Select value={visitModality} onValueChange={setVisitModality}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="in_person">In-Person</SelectItem>
                <SelectItem value="remote">Remote</SelectItem>
                <SelectItem value="home_visit">Home Visit</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Flags */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Visit Flags</Label>
            <div className="grid grid-cols-2 gap-3">
              <label className="flex items-center gap-2 text-sm">
                <Checkbox checked={isOnboarding} onCheckedChange={(v) => setIsOnboarding(!!v)} />
                Onboarding
              </label>
              <label className="flex items-center gap-2 text-sm">
                <Checkbox checked={isNurseVisit} onCheckedChange={(v) => setIsNurseVisit(!!v)} />
                Nurse Visit
              </label>
              <label className="flex items-center gap-2 text-sm">
                <Checkbox checked={isLabs} onCheckedChange={(v) => setIsLabs(!!v)} />
                Labs
              </label>
              <label className="flex items-center gap-2 text-sm">
                <Checkbox checked={isExternalSpecialist} onCheckedChange={(v) => setIsExternalSpecialist(!!v)} />
                External Specialist
              </label>
            </div>
          </div>

          {/* External Specialist Details */}
          {isExternalSpecialist && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="specName">Specialist Name</Label>
                <Input id="specName" value={specialistName} onChange={(e) => setSpecialistName(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="specLoc">Location</Label>
                <Input id="specLoc" value={specialistLocation} onChange={(e) => setSpecialistLocation(e.target.value)} />
              </div>
            </div>
          )}

          {/* Lab Package & Tests */}
          {isLabs && (
            <div className="space-y-3 border rounded-lg p-3 bg-muted/30">
              <Label className="text-sm font-medium">Lab Configuration</Label>
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
                  <SelectItem value="basic">Basic (BP, HbA1c, LDL)</SelectItem>
                  <SelectItem value="comprehensive">Comprehensive (All core)</SelectItem>
                  <SelectItem value="metabolic">Metabolic (HbA1c, LDL, Liver)</SelectItem>
                  <SelectItem value="hormone">Hormone (Thyroid, Sex hormones)</SelectItem>
                  <SelectItem value="custom">Custom selection</SelectItem>
                </SelectContent>
              </Select>

              <div className="grid grid-cols-2 gap-2">
                {[
                  { key: "blood_pressure", label: "Blood Pressure" },
                  { key: "hba1c", label: "HbA1c" },
                  { key: "ldl", label: "LDL Cholesterol" },
                  { key: "liver", label: "Liver (ALAT, GT, AFOS)" },
                  { key: "kidney", label: "Kidney (eGFR, Cystatin C)" },
                  { key: "thyroid", label: "TSH (Thyroid)" },
                  { key: "testosterone_estrogen", label: "Sex Hormones" },
                  { key: "lung_function", label: "Lung Function (FEV1, FVC, PEF)" },
                  { key: "apoe", label: "ApoE ε4" },
                  { key: "u_alb_krea", label: "U-Alb/Krea" },
                ].map((test) => (
                  <label key={test.key} className="flex items-center gap-2 text-xs">
                    <Checkbox
                      checked={selectedLabTests.includes(test.key)}
                      onCheckedChange={(checked) => {
                        setLabPackage("custom");
                        setSelectedLabTests((prev) =>
                          checked ? [...prev, test.key] : prev.filter((t) => t !== test.key)
                        );
                      }}
                    />
                    {test.label}
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Assign Nurse */}
          <div className="space-y-1.5">
            <Label>Assign to Nurse (optional)</Label>
            <Select value={assignedNurseId} onValueChange={setAssignedNurseId}>
              <SelectTrigger><SelectValue placeholder="Select nurse" /></SelectTrigger>
              <SelectContent>
                {nurses.map((n) => (
                  <SelectItem key={n.user_id} value={n.user_id}>{n.full_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Prep Details */}
          <div className="space-y-1.5">
            <Label htmlFor="notes">Preparation Details</Label>
            <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Instructions for the patient, e.g. bring previous records..." rows={3} />
          </div>

          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={fastingRequired} onCheckedChange={(v) => setFastingRequired(!!v)} />
            Fasting required
          </label>

          {/* Send Invite */}
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={sendInvite} onCheckedChange={(v) => setSendInvite(!!v)} />
            Send calendar invite to patient
          </label>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? "Saving..." : editingAppointment ? "Update Appointment" : "Create Appointment"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
