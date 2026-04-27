// Side panel for inspecting / editing a single task. Uses Sheet so it slides in
// from the right without leaving the current page.

import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar, Pencil, Trash2, User, Stethoscope, HeartPulse, ArrowRight, FlaskConical, Pill, AlertTriangle, PhoneCall, FileText, Mail, Download, Paperclip, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import {
  STATUS_OPTIONS, assigneeRole, categoryLabel, priorityMeta, statusLabel,
  type Task, type TaskStatus,
} from "@/lib/tasks";
import { isClinicalCategory, type TaskCategoryKind } from "@/lib/taskCategory";
import { useTaskActions } from "@/components/tasks/TaskProvider";
import { useAuth } from "@/hooks/useAuth";
import foundationClinicLogo from "@/assets/foundation-clinic-logo-cropped.png";

const COMM_KEYWORDS = /\b(call|contact|reach out|reach-out|debrief|discuss|phone|email|message)\b/i;
const REFERRAL_KEYWORDS = /\b(referral|refer|send\s+(?:cardiology|neurology|dermatology|hepatology|orthopaedic|orthopedic|specialist|gastro|psych|endocrin))\b/i;
function isReferralTask(task: Task): boolean {
  const tc = (task as Task & { task_category?: string | null }).task_category;
  if (tc === "referral") return true;
  if (tc && tc !== "administrative") return false; // other clinical kinds aren't referrals
  const isReferralCat = task.category === "referral";
  const hay = `${task.title ?? ""} ${task.created_from ?? ""}`;
  return isReferralCat || REFERRAL_KEYWORDS.test(hay) || /referral/i.test(hay);
}
function isCommunicationTask(task: Task): boolean {
  const isCareCoord = task.category === "care_coordination" || task.category === "client_communication";
  const matchesKeyword = COMM_KEYWORDS.test(task.title ?? "");
  return isCareCoord || matchesKeyword || isReferralTask(task);
}

// Build prefill payload for the appointment form panel from a communication task.
export interface CommPrefill {
  kind: "doctor_meeting";
  otherDoctorName: string;
  linkedPatientId: string | null;
  coordinationCategory: "" | "referral" | "case_discussion" | "handover" | "specialist_consult" | "other";
  date: string | null; // YYYY-MM-DD
  notes: string;
  sourceTaskId: string;
}

function buildCommPrefill(task: Task): CommPrefill {
  const title = task.title ?? "";
  // Extract "Dr. <Name>" / "Dr <Name>" first, fall back to text after "Call "
  let other = "";
  const drMatch = title.match(/\bDr\.?\s+[A-ZÄÖÅÜ][\wÄÖÅäöåü-]+(?:\s+[A-ZÄÖÅÜ][\wÄÖÅäöåü-]+)?/);
  if (drMatch) {
    other = drMatch[0];
  } else {
    const callMatch = title.match(/\b(?:call|contact|reach out|reach-out|phone)\s+([^,–\-:]+?)(?:\s+(?:re|about|regarding)\b|[:,–\-]|$)/i);
    if (callMatch) other = callMatch[1].trim();
  }

  const lower = title.toLowerCase();
  let cat: CommPrefill["coordinationCategory"] = "";
  if (/\b(referral|refer)\b/.test(lower)) cat = "referral";
  else if (/\bhandover\b/.test(lower)) cat = "handover";
  else if (/\b(debrief|discuss|re:)\b/.test(lower)) cat = "case_discussion";

  return {
    kind: "doctor_meeting",
    otherDoctorName: other,
    linkedPatientId: task.patient_id ?? null,
    coordinationCategory: cat,
    date: task.due_date ? task.due_date.slice(0, 10) : null,
    notes: title,
    sourceTaskId: task.id,
  };
}

const OUTCOME_TAGS = ["Informed", "Follow-up needed", "Referral initiated", "No action needed"] as const;
const REFERRAL_OUTCOME_TAGS = ["Referral sent", "Awaiting response", "Specialist booked", "No longer needed"] as const;
type OutcomeTag = string;

const URGENCY_OPTIONS = ["Routine", "Semi-urgent", "Urgent", "Emergency"] as const;
const REQUESTED_ACTION_OPTIONS = ["Consultation", "Diagnosis", "Treatment", "Second opinion"] as const;

interface ReferralForm {
  to: string;
  from: string;
  patient: string;
  dob: string;
  reason: string;
  background: string;
  medications: string;
  urgency: string;
  requestedAction: string;
  additionalNotes: string;
}

function inferReferralReason(title: string): string {
  const t = title.toLowerCase();
  const map: Record<string, string> = {
    cardiology: "Cardiology consultation requested",
    neurology: "Neurology consultation requested",
    dermatology: "Dermatology consultation requested",
    hepatology: "Hepatology consultation requested",
    orthopaedic: "Orthopaedic consultation requested",
    orthopedic: "Orthopaedic consultation requested",
    gastro: "Gastroenterology consultation requested",
    psych: "Psychiatry consultation requested",
    endocrin: "Endocrinology consultation requested",
  };
  for (const k of Object.keys(map)) {
    if (t.includes(k)) return map[k];
  }
  return "Specialist consultation requested";
}

function buildReferralForm(task: Task, patientName: string | null): ReferralForm {
  return {
    to: "",
    from: "Dr. Laine, Foundation Clinic",
    patient: patientName ?? "",
    dob: "",
    reason: inferReferralReason(task.title ?? ""),
    background: "",
    medications: "",
    urgency: "Routine",
    requestedAction: "Consultation",
    additionalNotes: "",
  };
}

function referralToText(f: ReferralForm): string {
  return [
    `REFERRAL`,
    ``,
    `To: ${f.to}`,
    `From: ${f.from}`,
    `Date: ${new Date().toLocaleDateString()}`,
    ``,
    `Patient: ${f.patient}`,
    `Date of birth: ${f.dob}`,
    ``,
    `Referral reason: ${f.reason}`,
    `Urgency: ${f.urgency}`,
    `Requested action: ${f.requestedAction}`,
    ``,
    `Clinical background:`,
    f.background || "—",
    ``,
    `Current medications:`,
    f.medications || "—",
    ``,
    `Additional notes:`,
    f.additionalNotes || "—",
  ].join("\n");
}

interface Props {
  task: Task | null;
  patientName: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TaskDetailPanel({ task, patientName, open, onOpenChange }: Props) {
  const navigate = useNavigate();
  const { openEditTask, notifyChanged } = useTaskActions();
  const { user } = useAuth();
  const [notes, setNotes] = useState("");
  const [savingNote, setSavingNote] = useState(false);

  // Inline "Log outcome" form state for communication tasks
  const [logOpen, setLogOpen] = useState(false);
  const [outcomeText, setOutcomeText] = useState("");
  const [outcomeTag, setOutcomeTag] = useState<OutcomeTag | "">("");
  const [savingOutcome, setSavingOutcome] = useState(false);

  // Inline referral form state
  const [referralOpen, setReferralOpen] = useState(false);
  const [referralForm, setReferralForm] = useState<ReferralForm | null>(null);

  useEffect(() => {
    setNotes(task?.description ?? "");
    setLogOpen(false);
    setOutcomeText("");
    setOutcomeTag("");
    setReferralOpen(false);
    setReferralForm(task ? buildReferralForm(task, patientName) : null);
  }, [task, patientName]);

  if (!task) return null;
  const meta = priorityMeta(task.priority);
  const role = assigneeRole(task.assignee_name);
  const kind = detectKind(task);
  const isClinical = kind !== null;
  const isComm = !isClinical && isCommunicationTask(task);
  const isReferral = !isClinical && isReferralTask(task);
  const activeOutcomeTags = isReferral ? REFERRAL_OUTCOME_TAGS : OUTCOME_TAGS;

  const updateStatus = async (status: TaskStatus) => {
    const { error } = await supabase.from("tasks").update({ status }).eq("id", task.id);
    if (error) { toast.error("Could not update status"); return; }
    toast.success("Status updated");
    notifyChanged();
  };

  const saveNotes = async () => {
    setSavingNote(true);
    const { error } = await supabase
      .from("tasks")
      .update({ description: notes.trim() || null })
      .eq("id", task.id);
    setSavingNote(false);
    if (error) { toast.error("Could not save notes"); return; }
    toast.success("Notes saved");
    notifyChanged();
  };

  const deleteTask = async () => {
    if (!confirm("Delete this task?")) return;
    const { error } = await supabase.from("tasks").delete().eq("id", task.id);
    if (error) { toast.error("Could not delete task"); return; }
    toast.success("Task deleted");
    onOpenChange(false);
    notifyChanged();
  };

  const saveOutcome = async () => {
    if (!outcomeText.trim() || !outcomeTag) {
      toast.error("Add a summary and select an outcome tag");
      return;
    }
    if (!task.patient_id) {
      toast.error("Task is not linked to a patient");
      return;
    }
    setSavingOutcome(true);
    const noteBody = `${outcomeText.trim()}\n\nOutcome: ${outcomeTag}`;
    const { error: visitErr } = await supabase.from("visit_notes").insert({
      patient_id: task.patient_id,
      provider_id: user?.id ?? "00000000-0000-0000-0000-000000000001",
      visit_date: new Date().toISOString().slice(0, 10),
      chief_complaint: isReferral ? "Referral note" : "Care coordination note",
      notes: noteBody,
    });
    if (visitErr) {
      setSavingOutcome(false);
      toast.error("Could not log outcome");
      return;
    }
    const { error: taskErr } = await supabase
      .from("tasks")
      .update({ status: "done" })
      .eq("id", task.id);
    setSavingOutcome(false);
    if (taskErr) { toast.error("Logged, but task not marked done"); return; }
    toast.success("Outcome logged and task completed");
    onOpenChange(false);
    notifyChanged();
  };

  const RoleIcon = role === "nurse" ? HeartPulse : role === "doctor" ? Stethoscope : User;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-md overflow-y-auto">
        <SheetHeader className="space-y-3">
          <div className="flex items-center gap-2">
            <span className={`h-2.5 w-2.5 rounded-full ${meta.dot}`} />
            <Badge variant="outline" className="text-[10px] uppercase tracking-wide">
              {categoryLabel(task.category)}
            </Badge>
            <Badge className={`${meta.badge} text-[10px] uppercase`}>{meta.label}</Badge>
          </div>
          <SheetTitle className="text-base leading-snug pr-6">{task.title}</SheetTitle>
          {patientName && (
            <SheetDescription>
              <button
                onClick={() => { onOpenChange(false); navigate(`/patients/${task.patient_id}`); }}
                className="text-primary hover:underline font-medium"
              >
                {patientName}
              </button>
            </SheetDescription>
          )}
        </SheetHeader>

        <div className="mt-6 space-y-4 text-sm">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Due date</p>
              <p className="font-medium flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                {task.due_date ? format(new Date(task.due_date), "dd MMM yyyy") : "No date"}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Assignee</p>
              <p className="font-medium flex items-center gap-1.5">
                <RoleIcon className="h-3.5 w-3.5 text-muted-foreground" />
                {task.assignee_name ?? "Unassigned"}
              </p>
            </div>
          </div>

          {(task as Task & { created_from?: string | null }).created_from && (
            <div>
              <p className="text-xs text-muted-foreground mb-1">Created from</p>
              <p className="text-xs italic text-muted-foreground">
                {(task as Task & { created_from?: string | null }).created_from}
              </p>
            </div>
          )}

          <ContextualPreview
            task={task}
            onNavigate={(path) => { onOpenChange(false); navigate(path); }}
          />

          {isClinical ? (
            <>
              <Separator />
              <Button
                className="w-full gap-1.5"
                onClick={() => {
                  onOpenChange(false);
                  navigate(clinicalActionPath(kind!, task));
                }}
              >
                {clinicalActionLabel(kind!)} <ArrowRight className="h-3.5 w-3.5" />
              </Button>
              <p className="text-[11px] text-muted-foreground text-center italic">
                {clinicalAutoCompleteHint(kind!)}
              </p>
            </>
          ) : isReferral ? (
            <>
              <Separator />
              <Button
                variant="outline"
                className="w-full gap-1.5"
                onClick={() => setReferralOpen((v) => !v)}
              >
                <FileText className="h-3.5 w-3.5" />
                {referralOpen ? "Cancel" : "Create referral"}
                {!referralOpen && <ArrowRight className="h-3.5 w-3.5" />}
              </Button>
              {referralOpen && referralForm && (
                <ReferralFormPanel
                  form={referralForm}
                  onChange={setReferralForm}
                  patientName={patientName}
                  patientId={task.patient_id ?? null}
                />
              )}
            </>
          ) : (
            <>
              <Separator />

              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">Status</p>
                <Select value={task.status} onValueChange={(v) => updateStatus(v as TaskStatus)}>
                  <SelectTrigger><SelectValue>{statusLabel(task.status)}</SelectValue></SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((s) => (
                      <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">Notes</p>
                  <Button
                    size="sm" variant="ghost" className="h-7 text-xs"
                    onClick={saveNotes} disabled={savingNote || notes === (task.description ?? "")}
                  >
                    Save
                  </Button>
                </div>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={5}
                  placeholder="Add a comment or update…"
                />
              </div>

              <Separator />

              {isComm && (
                <>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant="outline"
                      className="gap-1.5"
                      onClick={() => {
                        const scheduledId = (task as Task & { scheduled_appointment_id?: string | null }).scheduled_appointment_id;
                        onOpenChange(false);
                        if (scheduledId) {
                          navigate("/calendar");
                        } else {
                          navigate("/calendar", { state: { prefill: buildCommPrefill(task) } });
                        }
                      }}
                    >
                      <Calendar className="h-3.5 w-3.5" />
                      {(task as Task & { scheduled_appointment_id?: string | null }).scheduled_appointment_id ? "View in Calendar" : "Schedule"}
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      className="gap-1.5"
                      onClick={() => setLogOpen((v) => !v)}
                    >
                      <PhoneCall className="h-3.5 w-3.5" />
                      {logOpen ? "Cancel" : "Log outcome"}
                    </Button>
                  </div>

                  {logOpen && (
                    <div className="rounded-lg border bg-muted/30 p-3 space-y-3">
                      <div className="space-y-1.5">
                        <p className="text-xs font-medium text-muted-foreground">
                          Call summary / outcome
                        </p>
                        <Textarea
                          value={outcomeText}
                          onChange={(e) => setOutcomeText(e.target.value)}
                          rows={4}
                          placeholder="What was discussed, decided, or referred…"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <p className="text-xs font-medium text-muted-foreground">Outcome tag</p>
                        <div className="flex flex-wrap gap-1.5">
                          {activeOutcomeTags.map((tag) => (
                            <button
                              key={tag}
                              type="button"
                              onClick={() => setOutcomeTag(tag)}
                              className={`text-[11px] px-2.5 py-1 rounded-full border transition-colors ${
                                outcomeTag === tag
                                  ? "bg-primary text-primary-foreground border-primary"
                                  : "bg-background text-foreground border-input hover:bg-accent"
                              }`}
                            >
                              {tag}
                            </button>
                          ))}
                        </div>
                      </div>
                      <Button
                        className="w-full"
                        onClick={saveOutcome}
                        disabled={savingOutcome || !outcomeText.trim() || !outcomeTag}
                      >
                        Save to patient record
                      </Button>
                    </div>
                  )}

                  <Separator />
                </>
              )}

              <div className="flex gap-2">
                <Button variant="outline" className="flex-1 gap-1.5" onClick={() => openEditTask(task)}>
                  <Pencil className="h-3.5 w-3.5" /> Edit
                </Button>
                <Button variant="ghost" className="text-destructive hover:text-destructive gap-1.5" onClick={deleteTask}>
                  <Trash2 className="h-3.5 w-3.5" /> Delete
                </Button>
              </div>
            </>
          )}

        </div>
      </SheetContent>
    </Sheet>
  );
}

// ---------------------------------------------------------------------------
// Contextual preview — renders a clinical snippet based on task type so the
// doctor sees the source content (lab rows, drug interaction, low supply…)
// inline, with a deep link to the full view.
// ---------------------------------------------------------------------------

type PreviewKind = "labs" | "interaction" | "renewal" | "supply" | "risk_review" | "follow_up" | null;

function detectKind(task: Task): PreviewKind {
  // Prefer the stored task_category (set by classifier at creation / backfill).
  const stored = (task as Task & { task_category?: string | null }).task_category as
    | TaskCategoryKind
    | null
    | undefined;
  if (stored) {
    switch (stored) {
      case "lab_review":       return "labs";
      case "medication":       {
        const hay = `${task.title} ${task.created_from ?? ""} ${task.description ?? ""}`.toLowerCase();
        if (/interaction|warfarin|ibuprofen/.test(hay)) return "interaction";
        if (/low supply|out of stock|stock low/.test(hay)) return "supply";
        if (/renew|prescription|refill/.test(hay)) return "renewal";
        return "renewal"; // generic medication preview
      }
      case "dimension_review": return "risk_review";
      case "followup":         return "follow_up";
      case "referral":         return null; // handled by isReferral branch
      case "administrative":   return null;
    }
  }
  // Legacy fallback for tasks without task_category.
  const hay = `${task.title} ${task.created_from ?? ""} ${task.description ?? ""}`.toLowerCase();
  if (/lab result|new lab|review.*lab/.test(hay)) return "labs";
  if (/interaction|warfarin|ibuprofen/.test(hay)) return "interaction";
  if (/low supply|out of stock|stock low/.test(hay)) return "supply";
  if (/renew|prescription|refill/.test(hay)) return "renewal";
  if (/risk factor|doctor.?s summary|dimension review/.test(hay)) return "risk_review";
  if (/follow.?up|post.?visit/.test(hay)) return "follow_up";
  return null;
}

function clinicalActionPath(kind: NonNullable<PreviewKind>, task: Task): string {
  const base = `/patients/${task.patient_id}`;
  switch (kind) {
    case "labs":        return `${base}?tab=lab_results&review=1`;
    case "interaction": return `${base}?tab=medications&focus=interaction`;
    case "renewal":     return `${base}?tab=medications&focus=renewal`;
    case "supply":      return `${base}?tab=medications&focus=supply`;
    case "risk_review": return `${base}?tab=health_data`;
    case "follow_up":   return `${base}?tab=visits`;
  }
}

function clinicalActionLabel(kind: NonNullable<PreviewKind>): string {
  switch (kind) {
    case "labs":        return "Go to full lab view";
    case "interaction": return "Review interaction in Medications";
    case "renewal":     return "Renew in Medications";
    case "supply":      return "Update supply in Medications";
    case "risk_review": return "Review risk factors";
    case "follow_up":   return "Open patient record";
  }
}

function clinicalAutoCompleteHint(kind: NonNullable<PreviewKind>): string {
  switch (kind) {
    case "labs":        return "Completes automatically once all new results are verified.";
    case "interaction": return "Completes when you Resolve, Override, or Defer the alert.";
    case "renewal":     return "Completes once the prescription is renewed.";
    case "supply":      return "Completes when supply is renewed above 25%.";
    case "risk_review": return "Completes when the Doctor's Summary is saved.";
    case "follow_up":   return "Completes when marked done from the patient record.";
  }
}

function ContextualPreview({
  task,
  onNavigate,
}: {
  task: Task;
  onNavigate: (path: string) => void;
}) {
  const kind = detectKind(task);
  if (!kind || !task.patient_id) return null;

  const base = `/patients/${task.patient_id}`;

  if (kind === "labs") {
    const rows = [
      { name: "LDL Cholesterol", value: "4.8 mmol/L", ref: "< 3.0", out: "high" as const },
      { name: "HbA1c",            value: "58 mmol/mol", ref: "< 42",  out: "high" as const },
      { name: "ALAT",             value: "62 U/L",     ref: "< 45",  out: "high" as const },
    ];
    return (
      <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
        <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          <FlaskConical className="h-3.5 w-3.5" /> New lab results
        </div>
        <div className="space-y-1.5">
          {rows.map((r) => (
            <div key={r.name} className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5">
                <span className="inline-block px-1 py-px rounded text-[9px] font-bold bg-primary/15 text-primary">NEW</span>
                <span className="font-medium">{r.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-destructive">
                  {r.out === "high" ? "▲" : "▼"} {r.value}
                </span>
                <span className="text-muted-foreground tabular-nums">ref {r.ref}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (kind === "interaction") {
    return (
      <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-3 space-y-2">
        <div className="flex items-center gap-1.5">
          <AlertTriangle className="h-3.5 w-3.5 text-destructive" />
          <span className="text-[11px] font-semibold uppercase tracking-wide text-destructive">Drug interaction</span>
          <Badge className="bg-destructive text-destructive-foreground text-[9px] uppercase ml-auto">Severe</Badge>
        </div>
        <p className="text-xs font-semibold">Warfarin × Ibuprofen</p>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Concurrent use significantly increases bleeding risk. NSAIDs displace warfarin from
          plasma proteins and impair platelet function. Recommend alternative analgesic
          (paracetamol) and INR monitoring within 3–5 days if continued.
        </p>
        <button
          onClick={() => onNavigate(`${base}?tab=medications`)}
          className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline pt-1"
        >
          Go to medications <ArrowRight className="h-3 w-3" />
        </button>
      </div>
    );
  }

  if (kind === "renewal") {
    return (
      <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
        <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          <Pill className="h-3.5 w-3.5" /> Prescription renewal
        </div>
        <div className="space-y-1">
          <p className="text-xs font-semibold">Metformin 500 mg · twice daily</p>
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Current supply</span>
            <span className="font-semibold text-destructive">6 / 180 (3%)</span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
            <div className="h-full bg-destructive" style={{ width: "3%" }} />
          </div>
          <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1">
            <span>Last dispensed</span>
            <span>14 Jan 2026</span>
          </div>
        </div>
        <button
          onClick={() => onNavigate(`${base}?tab=medications&focus=metformin`)}
          className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline pt-1"
        >
          Renew prescription <ArrowRight className="h-3 w-3" />
        </button>
      </div>
    );
  }

  if (kind === "supply") {
    return (
      <div className="rounded-lg border border-warning/40 bg-warning/5 p-3 space-y-2">
        <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-warning">
          <Pill className="h-3.5 w-3.5" /> Low supply
        </div>
        <p className="text-xs font-semibold">Current stock below 25%</p>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Supply needs to be renewed. Task auto-completes once stock is restored above 25%.
        </p>
      </div>
    );
  }

  if (kind === "risk_review") {
    return (
      <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
        <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          <AlertTriangle className="h-3.5 w-3.5" /> Risk factor review
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">
          One or more elevated risk factors require clinical review. Save the Doctor's Summary
          in the dimension view to resolve.
        </p>
      </div>
    );
  }

  if (kind === "follow_up") {
    return (
      <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
        <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          <Stethoscope className="h-3.5 w-3.5" /> Post-visit follow-up
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Follow-up actions from the most recent visit. Mark as done from the patient record
          when complete.
        </p>
      </div>
    );
  }

  return null;
}

// ---------------------------------------------------------------------------
// Inline referral form — pre-filled template for sending specialist referrals.
// Provides "Send as email" (mailto:) and "Download as PDF" (print-to-PDF) actions.
// ---------------------------------------------------------------------------

function ReferralFormPanel({
  form,
  onChange,
  patientName,
  patientId,
}: {
  form: ReferralForm;
  onChange: (f: ReferralForm) => void;
  patientName: string | null;
  patientId: string | null;
}) {
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [printAttachments, setPrintAttachments] = useState<{ name: string; url: string }[]>([]);
  useEffect(() => {
    if (!patientId) return;
    const needMeds = !(form.medications && form.medications.trim().length > 0);
    const needBackground = !(form.background && form.background.trim().length > 0);
    if (!needMeds && !needBackground) return;

    (async () => {
      const updates: Partial<ReferralForm> = {};

      if (needMeds) {
        const { data, error } = await supabase
          .from("patient_medications")
          .select("medication_name, dose, frequency, status, start_date")
          .eq("patient_id", patientId);
        if (!error) {
          if (!data || data.length === 0) {
            updates.medications = "No medications recorded.";
          } else {
            const formatted = data
              .map((m) => {
                const head = [m.medication_name, m.dose].filter(Boolean).join(" ");
                const parts = [head];
                if (m.frequency) parts.push(m.frequency);
                if (m.start_date) {
                  try {
                    parts.push(`since ${format(new Date(m.start_date), "dd MMM yyyy")}`);
                  } catch { /* skip invalid date */ }
                }
                return parts.filter(Boolean).join(" · ");
              })
              .filter(Boolean)
              .join("\n");
            updates.medications = formatted || "No medications recorded.";
          }
        }
      }

      if (needBackground) {
        const { data: diagnoses, error: dxError } = await supabase
          .from("patient_diagnoses")
          .select("diagnosis, icd_code, status, diagnosed_date")
          .eq("patient_id", patientId)
          .order("status", { ascending: true })
          .order("diagnosed_date", { ascending: false });
        if (!dxError && diagnoses && diagnoses.length > 0) {
          const formatLine = (d: typeof diagnoses[number]) => {
            const icd = d.icd_code ? ` (ICD-10: ${d.icd_code})` : "";
            let dateStr = "";
            if (d.diagnosed_date) {
              try {
                dateStr = ` — diagnosed ${format(new Date(d.diagnosed_date), "yyyy-MM-dd")}`;
              } catch { /* skip */ }
            }
            return `- ${d.diagnosis}${icd}${dateStr}`;
          };
          const active = diagnoses.filter((d) => (d.status ?? "active").toLowerCase() === "active");
          const past = diagnoses.filter((d) => (d.status ?? "active").toLowerCase() !== "active");
          const sections: string[] = [];
          if (active.length > 0) {
            sections.push(["Active diagnoses:", ...active.map(formatLine)].join("\n"));
          }
          if (past.length > 0) {
            sections.push(["Past diagnoses:", ...past.map(formatLine)].join("\n"));
          }
          if (sections.length > 0) updates.background = sections.join("\n\n");
        }
      }

      if (Object.keys(updates).length > 0) {
        onChange({ ...form, ...updates });
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patientId]);

  const update = <K extends keyof ReferralForm>(key: K, value: ReferralForm[K]) => {
    onChange({ ...form, [key]: value });
  };

  const handleFilesSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const picked = Array.from(e.target.files);
    setFiles((prev) => [...prev, ...picked]);
    e.target.value = "";
  };

  const removeFile = (idx: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  const uploadAttachments = async (): Promise<{ name: string; url: string }[] | null> => {
    if (files.length === 0) return [];
    if (!patientId) return null;
    const out: { name: string; url: string }[] = [];
    for (const f of files) {
      const safeName = f.name.replace(/[^\w.\-]+/g, "_");
      const path = `referrals/${patientId}/${Date.now()}_${safeName}`;
      const { error } = await supabase.storage.from("appointment-attachments").upload(path, f, {
        cacheControl: "3600",
        upsert: false,
      });
      if (error) return null;
      const { data } = supabase.storage.from("appointment-attachments").getPublicUrl(path);
      out.push({ name: f.name, url: data.publicUrl });
    }
    return out;
  };

  const handleEmail = () => {
    const subject = `Referral – ${form.patient || patientName || "Patient"} – ${form.to || "Specialist"}`;
    let body = referralToText(form);
    if (files.length > 0) {
      body += `\n\nAttachments: ${files.map((f) => f.name).join(", ")}`;
    }
    window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    if (files.length > 0) {
      toast.message("Email opened — remember to attach the files manually");
    }
  };


  const handleDownloadPdf = async () => {
    setUploading(true);
    let uploaded: { name: string; url: string }[] | null = [];
    if (files.length > 0) {
      uploaded = await uploadAttachments();
      if (uploaded === null) {
        toast.error("File upload failed — PDF saved without attachments");
        uploaded = files.map((f) => ({ name: f.name, url: "" }));
      }
    }
    setUploading(false);
    setPrintAttachments(uploaded ?? []);

    // Wait a tick so the print-only area renders attachments
    await new Promise((r) => setTimeout(r, 50));

    const styleId = "print-hide-style";
    const existing = document.getElementById(styleId);
    if (existing) existing.remove();

    const style = document.createElement("style");
    style.id = styleId;
    style.textContent = `
      @media print {
        body * { visibility: hidden !important; }
        #referral-print-area, #referral-print-area * { visibility: visible !important; }
        #referral-print-area {
          position: fixed !important;
          left: 0 !important;
          top: 0 !important;
          width: 100% !important;
          padding: 40px !important;
          background: #fff !important;
          color: #111 !important;
        }
      }
    `;
    document.head.appendChild(style);

    const cleanup = () => {
      const s = document.getElementById(styleId);
      if (s) s.remove();
      window.removeEventListener("afterprint", cleanup);
    };
    window.addEventListener("afterprint", cleanup);

    window.print();
  };

  return (
    <div className="rounded-lg border bg-muted/30 p-3 space-y-3">
      <div className="flex items-center justify-between gap-2 pb-1">
        <div className="overflow-hidden w-32 h-12">
          <img src={foundationClinicLogo} alt="Foundation Clinic" className="h-24 w-auto object-left object-cover -mt-6" />
        </div>
        <div className="text-right text-[10px] text-muted-foreground leading-tight">
          <div>Foundation Health Finland Oy</div>
          <div>foundation.clinic</div>
          <div>Ratakatu 29 a 4</div>
          <div>00120 Helsinki</div>
        </div>
      </div>
      <Separator />
      <div className="flex items-center gap-1.5 pb-1">
        <FileText className="h-3.5 w-3.5 text-muted-foreground" />
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Referral document
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label className="text-[11px] text-muted-foreground">To</Label>
          <Input
            value={form.to}
            onChange={(e) => update("to", e.target.value)}
            placeholder="Cardiology, HYKS"
            className="h-8 text-xs"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-[11px] text-muted-foreground">From</Label>
          <Input
            value={form.from}
            onChange={(e) => update("from", e.target.value)}
            className="h-8 text-xs"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label className="text-[11px] text-muted-foreground">Patient</Label>
          <Input
            value={form.patient}
            onChange={(e) => update("patient", e.target.value)}
            className="h-8 text-xs"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-[11px] text-muted-foreground">Date of birth</Label>
          <Input
            value={form.dob}
            onChange={(e) => update("dob", e.target.value)}
            placeholder="DD/MM/YYYY"
            className="h-8 text-xs"
          />
        </div>
      </div>

      <div className="space-y-1">
        <Label className="text-[11px] text-muted-foreground">Referral reason</Label>
        <Input
          value={form.reason}
          onChange={(e) => update("reason", e.target.value)}
          className="h-8 text-xs"
        />
      </div>

      <div className="space-y-1">
        <Label className="text-[11px] text-muted-foreground">Clinical background</Label>
        <Textarea
          value={form.background}
          onChange={(e) => update("background", e.target.value)}
          rows={3}
          placeholder="Brief summary of relevant history…"
          className="text-xs"
        />
      </div>

      <div className="space-y-1">
        <Label className="text-[11px] text-muted-foreground">Current medications</Label>
        <Textarea
          value={form.medications}
          onChange={(e) => update("medications", e.target.value)}
          rows={2}
          placeholder="No active medications recorded."
          className="text-xs"
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label className="text-[11px] text-muted-foreground">Urgency</Label>
          <Select value={form.urgency} onValueChange={(v) => update("urgency", v)}>
            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {URGENCY_OPTIONS.map((o) => (
                <SelectItem key={o} value={o}>{o}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-[11px] text-muted-foreground">Requested action</Label>
          <Select value={form.requestedAction} onValueChange={(v) => update("requestedAction", v)}>
            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {REQUESTED_ACTION_OPTIONS.map((o) => (
                <SelectItem key={o} value={o}>{o}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-1">
        <Label className="text-[11px] text-muted-foreground">Additional notes</Label>
        <Textarea
          value={form.additionalNotes}
          onChange={(e) => update("additionalNotes", e.target.value)}
          rows={2}
          className="text-xs"
        />
      </div>


      <div className="space-y-1.5">
        <Label className="text-[11px] text-muted-foreground">Attach files (optional)</Label>
        <label className="flex items-center justify-center gap-1.5 rounded-md border border-dashed border-input bg-background px-3 py-2 text-xs cursor-pointer hover:bg-accent transition-colors">
          <Paperclip className="h-3.5 w-3.5 text-muted-foreground" />
          <span>Choose files</span>
          <input
            type="file"
            multiple
            accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
            onChange={handleFilesSelected}
            className="hidden"
          />
        </label>
        {files.length > 0 && (
          <ul className="space-y-1 pt-1">
            {files.map((f, i) => (
              <li
                key={`${f.name}-${i}`}
                className="flex items-center justify-between gap-2 rounded bg-background border border-input px-2 py-1 text-[11px]"
              >
                <span className="truncate">{f.name}</span>
                <button
                  type="button"
                  onClick={() => removeFile(i)}
                  className="text-muted-foreground hover:text-destructive shrink-0"
                  aria-label={`Remove ${f.name}`}
                >
                  <X className="h-3 w-3" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2 pt-1">
        <Button variant="outline" className="gap-1.5" onClick={handleEmail}>
          <Mail className="h-3.5 w-3.5" /> Send as email
        </Button>
        <Button className="gap-1.5" onClick={handleDownloadPdf} disabled={uploading}>
          <Download className="h-3.5 w-3.5" /> {uploading ? "Uploading…" : "Download as PDF"}
        </Button>
      </div>

      {/* Hidden print-only document — only visible during window.print() */}
      <div
        id="referral-print-area"
        aria-hidden="true"
        style={{
          position: "absolute",
          left: "-10000px",
          top: 0,
          width: "800px",
          background: "#fff",
          color: "#111",
          fontFamily: "-apple-system, system-ui, sans-serif",
          fontSize: "13px",
          lineHeight: 1.5,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            paddingBottom: "12px",
            borderBottom: "1px solid #ddd",
            marginBottom: "20px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              marginLeft: 0,
              paddingLeft: 0,
            }}
          >
<img
              src={foundationClinicLogo}
              alt="Foundation Clinic"
              style={{ height: "60px", width: "auto", display: "block" }}
            />
          </div>
          <div style={{ textAlign: "right", fontSize: "11px", color: "#666", lineHeight: 1.4 }}>
            <div>Foundation Health Finland Oy</div>
            <div>foundation.clinic</div>
            <div>Ratakatu 29 a 4</div>
            <div>00120 Helsinki</div>
          </div>
        </div>
        <h1 style={{ fontSize: "18px", margin: "0 0 16px", letterSpacing: "1px" }}>REFERRAL</h1>
        <pre style={{ whiteSpace: "pre-wrap", fontFamily: "inherit", fontSize: "13px", margin: 0 }}>
          {referralToText(form).replace(/^REFERRAL\n*/, "")}
        </pre>
        {printAttachments.length > 0 && (
          <>
            <h2
              style={{
                fontSize: "13px",
                margin: "20px 0 6px",
                letterSpacing: "0.5px",
                textTransform: "uppercase",
                color: "#555",
              }}
            >
              Attachments
            </h2>
            <ul style={{ fontSize: "12px", margin: "4px 0 0 18px", padding: 0 }}>
              {printAttachments.map((a, i) => (
                <li key={i}>
                  {a.url ? (
                    <>
                      {a.name} —{" "}
                      <a href={a.url} style={{ color: "#0366d6", wordBreak: "break-all" }}>
                        {a.url}
                      </a>
                    </>
                  ) : (
                    a.name
                  )}
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}
