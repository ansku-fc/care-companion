// Shared dummy appointment generator used by Calendar and Dashboard so both
// views display the same demo schedule. Builds a deterministic set of demo
// appointments for the given month.

export const TYPE_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  onboarding: { bg: "bg-primary/10", text: "text-primary", label: "Onboarding" },
  acute: { bg: "bg-destructive/10", text: "text-destructive", label: "Acute" },
  consultation: { bg: "bg-accent/60", text: "text-accent-foreground", label: "Consultation" },
  follow_up: { bg: "bg-success/10", text: "text-success", label: "Follow-up" },
  check_up: { bg: "bg-warning/10", text: "text-warning", label: "Check-up" },
  procedure: { bg: "bg-secondary", text: "text-secondary-foreground", label: "Procedure" },
  urgent: { bg: "bg-destructive/10", text: "text-destructive", label: "Urgent" },
  working_time: { bg: "bg-blue-500/10", text: "text-blue-600", label: "Working Time" },
  doctor_meeting: { bg: "bg-teal-500/10", text: "text-teal-700", label: "Doctor Meeting" },
};

export const typeStyle = (type: string) => TYPE_STYLES[type] ?? TYPE_STYLES.consultation;


const REAL_PATIENTS = [
  { id: "4d46d74b-9948-470f-a8d0-d040b63a2077", name: "Johnson, Sarah" },
  { id: "d343736e-90d7-4804-9691-f334788e712b", name: "Eriksson, Marcus" },
  { id: "eff2dc1b-46f1-4b55-b37f-d72e12640656", name: "Mäkinen, Aino" },
  { id: "0115115c-367e-4683-a849-414f27fe5d55", name: "Bergström, Thomas" },
  { id: "e0338b71-e278-4ecf-8db1-10ccea253658", name: "Korhonen, Elena" },
  { id: "e97ffda7-f3aa-4b34-a3e8-757e2502411f", name: "Okafor, David" },
  { id: "1614799a-55ca-495a-b41a-f510d4cefa11", name: "Carter, Jay-Z" },
  { id: "19ce1b47-f8fb-474c-9f87-4442f48ccca0", name: "Carter, Beyoncé" },
];

const patientByName = (name: string) => REAL_PATIENTS.find((p) => p.name === name)!;

export interface DummyAppointment {
  id: string;
  title: string;
  patient_name?: string;
  patient_id?: string;
  appointment_type: string;
  start_time: string;
  end_time: string;
  visit_modality: string;
  is_onboarding: boolean;
  is_home_visit: boolean;
  is_nurse_visit: boolean;
  is_labs: boolean;
  is_external_specialist: boolean;
  notes: string;
  isDummy: true;
  isWorkingTime: boolean;
  importedNoteId: string | null;
}

export function buildDummyAppointments(month: Date): DummyAppointment[] {
  const y = month.getFullYear();
  const m = month.getMonth();

  const dummies: Array<{ day: number; hour: number; patientName?: string; type: string; modality: string; duration: number; notes: string; isWorkingTime?: boolean; importedNoteId?: string; titleOverride?: string }> = [
    // Johnson, Sarah
    { day: 3, hour: 8, patientName: "Johnson, Sarah", type: "follow_up", modality: "remote", duration: 30, notes: "Post-statin review. Check LDL levels from last labs." },
    { day: 17, hour: 9, patientName: "Johnson, Sarah", type: "consultation", modality: "in_person", duration: 45, notes: "Nutrition and lifestyle optimization session." },
    // Eriksson, Marcus
    { day: 10, hour: 9, patientName: "Eriksson, Marcus", type: "check_up", modality: "in_person", duration: 45, notes: "Annual health check. Review cardiovascular risk factors." },
    { day: 6, hour: 11, patientName: "Eriksson, Marcus", type: "acute", modality: "in_person", duration: 30, notes: "Acute chest pain, referred from GP. ECG + troponin ordered." },
    // Mäkinen, Aino
    { day: 17, hour: 11, patientName: "Mäkinen, Aino", type: "acute", modality: "in_person", duration: 30, notes: "Persistent migraine, 3rd episode this month. Consider prophylaxis." },
    { day: 21, hour: 13, patientName: "Mäkinen, Aino", type: "follow_up", modality: "remote", duration: 30, notes: "Follow-up on migraine treatment plan." },
    // Bergström, Thomas
    { day: 4, hour: 9, patientName: "Bergström, Thomas", type: "onboarding", modality: "in_person", duration: 90, notes: "Comprehensive onboarding with full lab panel and genetic screening." },
    { day: 27, hour: 10, patientName: "Bergström, Thomas", type: "check_up", modality: "in_person", duration: 45, notes: "Quarterly metabolic check. HbA1c + lipid panel." },
    // Korhonen, Elena
    { day: 10, hour: 13, patientName: "Korhonen, Elena", type: "consultation", modality: "remote", duration: 30, notes: "Discuss hormone panel results and supplementation plan." },
    { day: 14, hour: 10, patientName: "Korhonen, Elena", type: "acute", modality: "in_person", duration: 30, notes: "Acute lower back pain. MRI referral if no improvement." },
    // Okafor, David
    { day: 5, hour: 10, patientName: "Okafor, David", type: "follow_up", modality: "remote", duration: 30, notes: "Vertigo follow-up. Review ENT specialist report." },
    { day: 7, hour: 14, patientName: "Okafor, David", type: "consultation", modality: "in_person", duration: 45, notes: "Discuss exercise prescription and cardiac rehab progress." },
    // Carter, Jay-Z
    { day: 26, hour: 10, patientName: "Carter, Jay-Z", type: "check_up", modality: "in_person", duration: 45, notes: "Executive health programme check-up. Include body composition analysis." },
    { day: 24, hour: 14, patientName: "Carter, Jay-Z", type: "consultation", modality: "in_person", duration: 30, notes: "Skin lesion concern – urgent dermoscopy." },
    // Carter, Beyoncé
    { day: 19, hour: 8, patientName: "Carter, Beyoncé", type: "onboarding", modality: "in_person", duration: 90, notes: "Full onboarding. Family history of early CVD." },
    { day: 28, hour: 14, patientName: "Carter, Beyoncé", type: "follow_up", modality: "remote", duration: 30, notes: "2-week post-onboarding follow-up. Review initial lab results." },
    // Working time blocks
    { day: 4, hour: 14, type: "working_time", modality: "in_person", duration: 120, notes: "Complete patient documentation and update care plans.", isWorkingTime: true, titleOverride: "Working Time – Documentation" },
    { day: 11, hour: 9, type: "working_time", modality: "in_person", duration: 90, notes: "Review latest guidelines for Tier 2 patients.", isWorkingTime: true, importedNoteId: "n2", titleOverride: "Working Time – Research" },
    { day: 18, hour: 9, type: "working_time", modality: "in_person", duration: 120, notes: "Weekly review checklist and clinical hours logging.", isWorkingTime: true, importedNoteId: "n3", titleOverride: "Working Time – Admin" },
    { day: 25, hour: 9, type: "working_time", modality: "in_person", duration: 90, notes: "Review and summarize conference takeaways.", isWorkingTime: true, importedNoteId: "n6", titleOverride: "Working Time – Conference Notes" },
  ];

  const typeLabel: Record<string, string> = {
    onboarding: "Onboarding", acute: "Acute", consultation: "Consultation",
    follow_up: "Follow-up", check_up: "Check-up", working_time: "Working Time",
  };

  return dummies
    .filter((d) => d.day <= new Date(y, m + 1, 0).getDate())
    .map((d, i) => {
      const start = new Date(y, m, d.day, d.hour, 0);
      const end = new Date(start.getTime() + d.duration * 60000);
      const patient = d.patientName ? patientByName(d.patientName) : undefined;
      const title = d.titleOverride ?? `${typeLabel[d.type] ?? d.type} – ${d.patientName ?? ""}`.trim();
      return {
        id: `dummy-${i}`,
        title,
        patient_name: patient?.name,
        patient_id: d.isWorkingTime ? undefined : patient?.id,
        appointment_type: d.type,
        start_time: start.toISOString(),
        end_time: end.toISOString(),
        visit_modality: d.modality,
        is_onboarding: d.type === "onboarding",
        is_home_visit: false,
        is_nurse_visit: false,
        is_labs: d.type === "onboarding",
        is_external_specialist: false,
        notes: d.notes,
        isDummy: true as const,
        isWorkingTime: !!d.isWorkingTime,
        importedNoteId: d.importedNoteId || null,
      };
    });
}
