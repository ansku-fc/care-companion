// Side panel for inspecting / editing a single task. Uses Sheet so it slides in
// from the right without leaving the current page.

import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, Pencil, Trash2, User, Stethoscope, HeartPulse, ArrowRight, FlaskConical, Pill, AlertTriangle, PhoneCall } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import {
  STATUS_OPTIONS, assigneeRole, categoryLabel, priorityMeta, statusLabel,
  type Task, type TaskStatus,
} from "@/lib/tasks";
import { useTaskActions } from "@/components/tasks/TaskProvider";
import { useAuth } from "@/hooks/useAuth";

const COMM_KEYWORDS = /\b(call|contact|reach out|reach-out|debrief|discuss|phone|email|message)\b/i;
function isCommunicationTask(task: Task): boolean {
  const isCareCoord = task.category === "care_coordination" || task.category === "client_communication";
  const matchesKeyword = COMM_KEYWORDS.test(task.title ?? "");
  return isCareCoord || matchesKeyword;
}

const OUTCOME_TAGS = ["Informed", "Follow-up needed", "Referral initiated", "No action needed"] as const;
type OutcomeTag = typeof OUTCOME_TAGS[number];

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

  useEffect(() => {
    setNotes(task?.description ?? "");
    setLogOpen(false);
    setOutcomeText("");
    setOutcomeTag("");
  }, [task]);

  if (!task) return null;
  const meta = priorityMeta(task.priority);
  const role = assigneeRole(task.assignee_name);
  const kind = detectKind(task);
  const isClinical = kind !== null;
  const isComm = !isClinical && isCommunicationTask(task);

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

