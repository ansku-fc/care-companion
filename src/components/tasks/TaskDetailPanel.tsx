// Action-oriented side panel for a single task.
// Renders generic metadata + a contextual action section per task_type.

import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Calendar, User, Stethoscope, HeartPulse, ArrowRight,
  CheckCircle2, AlertTriangle, FileText,
} from "lucide-react";
import { ReferralWorkflowPanel } from "@/components/tasks/ReferralWorkflowPanel";
import { ReferralFormPanel } from "@/components/tasks/ReferralFormPanel";
import { inferReferralTarget } from "@/lib/referralWorkflow";
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
import type { TaskType } from "@/lib/taskTypes";

interface Props {
  task: Task | null;
  patientName: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Best-effort detail extraction from the title, e.g.
// "Book appointment — Annual review — Eriksson, Marcus" → "Annual review"
function extractDetail(title: string | null | undefined): string | null {
  if (!title) return null;
  const parts = title.split("—").map((p) => p.trim()).filter(Boolean);
  if (parts.length >= 3) return parts[1];
  return null;
}

export function TaskDetailPanel({ task, patientName, open, onOpenChange }: Props) {
  const navigate = useNavigate();
  const { notifyChanged } = useTaskActions();
  const [notes, setNotes] = useState("");
  const [savingNote, setSavingNote] = useState(false);

  useEffect(() => {
    setNotes(task?.description ?? "");
  }, [task]);

  if (!task) return null;
  const meta = priorityMeta(task.priority);
  const role = assigneeRole(task.assignee_name);
  const RoleIcon = role === "nurse" ? HeartPulse : role === "doctor" ? Stethoscope : User;
  const taskType = (task as Task & { task_type?: TaskType | null }).task_type ?? null;
  const createdFrom = (task as Task & { created_from?: string | null }).created_from ?? null;

  const updateStatus = async (status: TaskStatus) => {
    const { error } = await supabase.from("tasks").update({ status }).eq("id", task.id);
    if (error) { toast.error("Could not update status"); return; }
    toast.success("Status updated");
    notifyChanged();
  };

  const completeTask = async (successMsg: string) => {
    const { error } = await supabase.from("tasks").update({ status: "done" }).eq("id", task.id);
    if (error) { toast.error("Could not complete task"); return; }
    toast.success(successMsg);
    onOpenChange(false);
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

          {createdFrom && (
            <p className="text-xs italic text-muted-foreground">
              Created from: {createdFrom}
            </p>
          )}

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
              rows={4}
              placeholder="Add a comment or update…"
            />
          </div>

          <Separator />

          <ActionSection
            task={task}
            taskType={taskType}
            patientName={patientName}
            onComplete={completeTask}
            onClose={() => onOpenChange(false)}
            onNavigate={(path, state) => {
              onOpenChange(false);
              navigate(path, state ? { state } : undefined);
            }}
            notifyChanged={notifyChanged}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ---------------------------------------------------------------------------
// Per-type action sections
// ---------------------------------------------------------------------------

interface ActionProps {
  task: Task;
  taskType: TaskType | null;
  patientName: string | null;
  onComplete: (msg: string) => Promise<void>;
  onClose: () => void;
  onNavigate: (path: string, state?: any) => void;
  notifyChanged: () => void;
}

function ActionSection(props: ActionProps) {
  const { task, taskType } = props;
  const isInteraction = taskType === "PRESCRIPTION" && /interaction/i.test(task.title ?? "");

  switch (taskType) {
    case "APPOINTMENT_CLINIC":  return <ActionAppointmentClinic {...props} />;
    case "APPOINTMENT_EXTERNAL": return <ActionAppointmentExternal {...props} />;
    case "REFERRAL":            return <ActionReferral {...props} />;
    case "LAB_DIAGNOSTICS":     return <ActionLab {...props} />;
    case "PRESCRIPTION":        return isInteraction
                                  ? <ActionInteraction {...props} />
                                  : <ActionPrescription {...props} />;
    case "ONBOARDING_ADMIN":    return <ActionOnboarding {...props} />;
    case "MONITORING":          return <ActionMonitoring {...props} />;
    default:                    return <ActionGeneric {...props} />;
  }
}

function PrimaryButton({ children, ...rest }: React.ComponentProps<typeof Button>) {
  return <Button className="w-full gap-1.5" {...rest}>{children}</Button>;
}

function SecondaryButton({ children, ...rest }: React.ComponentProps<typeof Button>) {
  return <Button variant="outline" className="w-full gap-1.5" {...rest}>{children}</Button>;
}

function Hint({ children }: { children: React.ReactNode }) {
  return <p className="text-[11px] text-muted-foreground text-center italic">{children}</p>;
}

// ---- APPOINTMENT_CLINIC ----------------------------------------------------
function ActionAppointmentClinic({ task, onNavigate }: ActionProps) {
  const detail = extractDetail(task.title);
  return (
    <div className="space-y-2">
      <PrimaryButton
        onClick={() =>
          onNavigate("/calendar", {
            prefill: {
              kind: "clinic_appointment",
              linkedPatientId: task.patient_id,
              visitType: detail ?? "",
              sourceTaskId: task.id,
              notes: detail ?? "",
            },
          })
        }
      >
        Book appointment <ArrowRight className="h-3.5 w-3.5" />
      </PrimaryButton>
      <Hint>Auto-completes when the appointment is saved.</Hint>
    </div>
  );
}

// ---- APPOINTMENT_EXTERNAL --------------------------------------------------
function ActionAppointmentExternal({ task, onComplete, notifyChanged }: ActionProps) {
  const progress = (task.referral_progress as any) ?? {};
  const existing = progress.external_booking ?? {};
  const [provider, setProvider] = useState<string>(existing.provider ?? "");
  const [date, setDate] = useState<string>(existing.date ?? "");
  const [time, setTime] = useState<string>(existing.time ?? "");
  const [saving, setSaving] = useState(false);

  const markBooked = async () => {
    if (!provider.trim() || !date || !time) {
      toast.error("Fill provider, date and time");
      return;
    }
    setSaving(true);
    const newProgress = {
      ...progress,
      external_booking: {
        provider: provider.trim(),
        date,
        time,
        invite_sent: true,
        booked_at: new Date().toISOString(),
      },
    };
    const { error } = await supabase
      .from("tasks")
      .update({ referral_progress: newProgress, status: "done" })
      .eq("id", task.id);
    setSaving(false);
    if (error) { toast.error("Could not save booking"); return; }
    toast.success("Patient invite marked as sent");
    notifyChanged();
  };

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label className="text-[11px] text-muted-foreground">Provider / clinic name</Label>
        <Input value={provider} onChange={(e) => setProvider(e.target.value)} placeholder="HUS Cardiology, Dr. …" />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1.5">
          <Label className="text-[11px] text-muted-foreground">Date</Label>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-[11px] text-muted-foreground">Time</Label>
          <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
        </div>
      </div>
      <PrimaryButton onClick={markBooked} disabled={saving}>
        <CheckCircle2 className="h-3.5 w-3.5" /> Mark as booked
      </PrimaryButton>
      <Hint>Saves booking, sends patient invite, and completes the task.</Hint>
    </div>
  );
}

// ---- REFERRAL --------------------------------------------------------------
function ActionReferral({ task, patientName, onComplete, onClose }: ActionProps) {
  const { to, specialty } = inferReferralTarget(task.title ?? "");
  return (
    <ReferralWorkflowPanel
      task={task}
      defaultTo={to}
      onAllComplete={onClose}
      renderReferralDocument={() => (
        <ReferralFormPanel
          task={task}
          patientName={patientName}
          defaultTo={to}
          defaultSpecialty={specialty}
        />
      )}
    />
  );
}

// ---- LAB_DIAGNOSTICS -------------------------------------------------------
function ActionLab({ task, onComplete, onNavigate }: ActionProps) {
  // Extract marker tokens from "Review lab results — HbA1c & Lipid panel — Surname, First"
  const detail = extractDetail(task.title) ?? "";
  const markers = detail.split(/[&,]/).map((s) => s.trim()).filter(Boolean);
  const reviewParam = markers.length ? encodeURIComponent(markers.join(",")) : "1";
  const labUrl = `/patients/${task.patient_id}?tab=lab_results&review=${reviewParam}&taskId=${task.id}`;
  return (
    <div className="space-y-2">
      <PrimaryButton onClick={() => onComplete("Lab results marked as reviewed")}>
        <CheckCircle2 className="h-3.5 w-3.5" /> Mark results reviewed
      </PrimaryButton>
      {task.patient_id && (
        <SecondaryButton onClick={() => onNavigate(labUrl)}>
          Open lab results <ArrowRight className="h-3.5 w-3.5" />
        </SecondaryButton>
      )}
    </div>
  );
}

// ---- PRESCRIPTION (renewal) ------------------------------------------------
function ActionPrescription({ task, onNavigate }: ActionProps) {
  return (
    <div className="space-y-2">
      <PrimaryButton onClick={() => onNavigate(`/patients/${task.patient_id}?tab=medications`)}>
        Go to medications <ArrowRight className="h-3.5 w-3.5" />
      </PrimaryButton>
      <Hint>Auto-completes when the prescription is renewed there.</Hint>
    </div>
  );
}

// ---- PRESCRIPTION (drug interaction) ---------------------------------------
function ActionInteraction({ task, onComplete, onNavigate }: ActionProps) {
  // detail looks like "Warfarin × Ibuprofen"
  const detail = extractDetail(task.title) ?? "";
  const [drugA, drugB] = detail.split(/[×x]/i).map((s) => s.trim()).filter(Boolean);

  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-3 space-y-2">
        <div className="flex items-center gap-1.5">
          <AlertTriangle className="h-3.5 w-3.5 text-destructive" />
          <span className="text-[11px] font-semibold uppercase tracking-wide text-destructive">
            Interacting medications
          </span>
        </div>
        {drugA && drugB ? (
          <div className="flex items-center justify-center gap-3 py-1">
            <span className="text-sm font-semibold rounded-md border bg-background px-2.5 py-1">{drugA}</span>
            <span className="text-muted-foreground text-xs">×</span>
            <span className="text-sm font-semibold rounded-md border bg-background px-2.5 py-1">{drugB}</span>
          </div>
        ) : (
          <p className="text-xs">{detail || task.title}</p>
        )}
        {task.description && (
          <p className="text-xs text-muted-foreground leading-relaxed">{task.description}</p>
        )}
      </div>
      <PrimaryButton onClick={() => onComplete("Interaction overridden — both kept")}>
        <CheckCircle2 className="h-3.5 w-3.5" /> Resolve — keep both
      </PrimaryButton>
      <SecondaryButton onClick={() => onNavigate(`/patients/${task.patient_id}?tab=medications`)}>
        Go to medications <ArrowRight className="h-3.5 w-3.5" />
      </SecondaryButton>
    </div>
  );
}

// ---- ONBOARDING_ADMIN ------------------------------------------------------
function ActionOnboarding({ task, onNavigate }: ActionProps) {
  return (
    <div className="space-y-2">
      <PrimaryButton onClick={() => onNavigate(`/patients/${task.patient_id}?tab=onboarding&open=1`)}>
        Open onboarding <ArrowRight className="h-3.5 w-3.5" />
      </PrimaryButton>
      <Hint>Auto-completes when all onboarding steps are completed.</Hint>
    </div>
  );
}

// ---- MONITORING ------------------------------------------------------------
function ActionMonitoring({ task, onComplete, onNavigate }: ActionProps) {
  return (
    <div className="space-y-2">
      <PrimaryButton onClick={() => onNavigate(`/patients/${task.patient_id}?tab=health_data`)}>
        Go to patient data <ArrowRight className="h-3.5 w-3.5" />
      </PrimaryButton>
      <SecondaryButton onClick={() => onComplete("Monitoring task resolved")}>
        <CheckCircle2 className="h-3.5 w-3.5" /> Mark as resolved
      </SecondaryButton>
    </div>
  );
}

// ---- Generic fallback (legacy tasks without task_type) ---------------------
function ActionGeneric({ task, onComplete, onNavigate }: ActionProps) {
  return (
    <div className="space-y-2">
      {task.patient_id && (
        <SecondaryButton onClick={() => onNavigate(`/patients/${task.patient_id}`)}>
          Open patient <ArrowRight className="h-3.5 w-3.5" />
        </SecondaryButton>
      )}
      <PrimaryButton onClick={() => onComplete("Task completed")}>
        <CheckCircle2 className="h-3.5 w-3.5" /> Mark as done
      </PrimaryButton>
    </div>
  );
}
