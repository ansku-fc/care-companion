// 3-step referral coordination panel rendered inside the Task Detail panel.
// Persists step progress + appointment details into tasks.referral_progress.
//
// Steps:
//   1. Send Referral             — uses the existing ReferralFormPanel
//   2. Schedule Appointment      — date/time + location + contact + notes
//   3. Send Calendar Invite      — preview + attending notes for patient
//
// Steps unlock in order. Task auto-completes when all 3 are done.

import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { Check, ChevronDown, ChevronRight, Lock, Calendar as CalendarIcon, MapPin, FileText, UserCheck, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import type { Task } from "@/lib/tasks";
import { useTaskActions } from "@/components/tasks/TaskProvider";
import {
  HELSINKI_LOCATIONS,
  TOTAL_REFERRAL_STEPS,
  allStepsComplete,
  completedCount,
  defaultInviteTitle,
  type ReferralProgress,
  type ReferralStepKey,
} from "@/lib/referralWorkflow";

interface Props {
  task: Task;
  /** Renders Step 1's referral document body — the existing ReferralFormPanel. */
  renderReferralDocument: () => React.ReactNode;
  /** Initial "to" value inferred from the task title (e.g. "Gastroenterology, HYKS Meilahti"). */
  defaultTo: string;
  onAllComplete?: () => void;
}

export function ReferralWorkflowPanel({
  task,
  renderReferralDocument,
  defaultTo,
  onAllComplete,
}: Props) {
  const { user } = useAuth();
  const { notifyChanged } = useTaskActions();

  const initial = useMemo<ReferralProgress>(() => {
    const raw = (task as Task & { referral_progress?: unknown }).referral_progress;
    if (raw && typeof raw === "object") return raw as ReferralProgress;
    return {};
  }, [task]);

  const [progress, setProgress] = useState<ReferralProgress>(initial);

  // Step-2 form state (controlled, persisted on confirm)
  const [apptDate, setApptDate] = useState<string>(
    initial.schedule_appointment?.appointment_at?.slice(0, 10) ?? "",
  );
  const [apptTime, setApptTime] = useState<string>(
    initial.schedule_appointment?.appointment_at?.slice(11, 16) ?? "",
  );
  const [location, setLocation] = useState<string>(initial.schedule_appointment?.location ?? "");
  const [otherLocation, setOtherLocation] = useState<string>("");
  const [contact, setContact] = useState<string>(initial.schedule_appointment?.contact_person ?? "");
  const [apptNotes, setApptNotes] = useState<string>(initial.schedule_appointment?.notes ?? "");

  // Step-3 form state
  const [inviteTitle, setInviteTitle] = useState<string>(
    initial.send_invite?.invite_title ?? defaultInviteTitle(task.title ?? "", initial.schedule_appointment?.location),
  );
  const [attendingNotes, setAttendingNotes] = useState<string>(initial.send_invite?.attending_notes ?? "");

  // UI: which step body is expanded? Default to first non-done step.
  const initialExpanded: ReferralStepKey =
    !initial.send_referral?.done ? "send_referral"
    : !initial.schedule_appointment?.done ? "schedule_appointment"
    : "send_invite";
  const [expanded, setExpanded] = useState<ReferralStepKey | null>(initialExpanded);

  const step1Done = !!progress.send_referral?.done;
  const step2Done = !!progress.schedule_appointment?.done;
  const step3Done = !!progress.send_invite?.done;

  const completedAuthor = user?.email ? `Dr. Laine` : "Dr. Laine";
  const stamp = (label: string, ts?: string | null) =>
    ts ? `${label} ${format(new Date(ts), "dd MMM yyyy")} · ${completedAuthor}` : label;

  const persist = async (next: ReferralProgress) => {
    setProgress(next);
    const allDone = allStepsComplete(next);
    const updates: Record<string, unknown> = { referral_progress: next };
    if (allDone) updates.status = "done";
    const { error } = await supabase.from("tasks").update(updates).eq("id", task.id);
    if (error) {
      toast.error("Could not save progress");
      return false;
    }
    if (allDone) {
      toast.success("All 3 steps complete — task marked done");
      onAllComplete?.();
    }
    notifyChanged();
    return true;
  };

  const completeStep1 = async () => {
    const next: ReferralProgress = {
      ...progress,
      send_referral: {
        done: true,
        completed_at: new Date().toISOString(),
        completed_by_name: completedAuthor,
        to: defaultTo,
      },
    };
    const ok = await persist(next);
    if (ok) {
      toast.success("Referral sent");
      setExpanded("schedule_appointment");
    }
  };

  const completeStep2 = async () => {
    if (!apptDate || !apptTime) { toast.error("Pick a date and time"); return; }
    const finalLocation = location === "Other" ? otherLocation.trim() : location;
    if (!finalLocation) { toast.error("Pick a location"); return; }
    const isoLocal = `${apptDate}T${apptTime}:00`;
    const next: ReferralProgress = {
      ...progress,
      schedule_appointment: {
        done: true,
        completed_at: new Date().toISOString(),
        completed_by_name: completedAuthor,
        appointment_at: isoLocal,
        location: finalLocation,
        contact_person: contact.trim() || null,
        notes: apptNotes.trim() || null,
      },
    };
    const ok = await persist(next);
    if (ok) {
      toast.success("Appointment confirmed");
      // Refresh invite title with the chosen location
      setInviteTitle(defaultInviteTitle(task.title ?? "", finalLocation));
      setExpanded("send_invite");
    }
  };

  const completeStep3 = async () => {
    if (!inviteTitle.trim()) { toast.error("Add an invite title"); return; }
    const next: ReferralProgress = {
      ...progress,
      send_invite: {
        done: true,
        completed_at: new Date().toISOString(),
        completed_by_name: completedAuthor,
        invite_title: inviteTitle.trim(),
        attending_notes: attendingNotes.trim() || null,
      },
    };
    await persist(next);
  };

  const count = completedCount(progress);
  const apptISO = progress.schedule_appointment?.appointment_at;

  // Re-sync state when task changes (panel reused)
  useEffect(() => {
    setProgress(initial);
  }, [initial]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Coordination workflow
        </p>
        <Badge variant="outline" className="text-[10px]">
          {count} of {TOTAL_REFERRAL_STEPS} steps complete
        </Badge>
      </div>

      {/* STEP 1 */}
      <StepCard
        index={1}
        title="Send Referral"
        done={step1Done}
        locked={false}
        statusLabel={step1Done ? "Sent" : "Pending"}
        timestampLabel={step1Done ? stamp("Referral sent", progress.send_referral?.completed_at) : null}
        expanded={expanded === "send_referral"}
        onToggle={() => setExpanded(expanded === "send_referral" ? null : "send_referral")}
      >
        {renderReferralDocument()}
        {!step1Done && (
          <Button className="w-full gap-1.5 mt-2" onClick={completeStep1}>
            <Send className="h-3.5 w-3.5" /> Send Referral
          </Button>
        )}
      </StepCard>

      {/* STEP 2 */}
      <StepCard
        index={2}
        title="Schedule Appointment"
        done={step2Done}
        locked={!step1Done}
        statusLabel={step2Done ? "Scheduled" : "Pending"}
        timestampLabel={
          step2Done && apptISO
            ? `Scheduled for ${format(new Date(apptISO), "dd MMM yyyy 'at' HH:mm")} · ${progress.schedule_appointment?.location ?? ""}`
            : null
        }
        expanded={expanded === "schedule_appointment"}
        onToggle={() =>
          step1Done && setExpanded(expanded === "schedule_appointment" ? null : "schedule_appointment")
        }
      >
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label className="text-[11px] text-muted-foreground">Date</Label>
            <Input
              type="date"
              value={apptDate}
              onChange={(e) => setApptDate(e.target.value)}
              disabled={step2Done}
              className="h-8 text-xs"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-[11px] text-muted-foreground">Time</Label>
            <Input
              type="time"
              value={apptTime}
              onChange={(e) => setApptTime(e.target.value)}
              disabled={step2Done}
              className="h-8 text-xs"
            />
          </div>
        </div>

        <div className="space-y-1">
          <Label className="text-[11px] text-muted-foreground">Location</Label>
          <Select value={location} onValueChange={setLocation} disabled={step2Done}>
            <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Pick a location" /></SelectTrigger>
            <SelectContent>
              {HELSINKI_LOCATIONS.map((l) => (
                <SelectItem key={l} value={l}>{l}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {location === "Other" && (
            <Input
              value={otherLocation}
              onChange={(e) => setOtherLocation(e.target.value)}
              placeholder="Specify location"
              disabled={step2Done}
              className="h-8 text-xs mt-1"
            />
          )}
        </div>

        <div className="space-y-1">
          <Label className="text-[11px] text-muted-foreground">Contact person at receiving clinic (optional)</Label>
          <Input
            value={contact}
            onChange={(e) => setContact(e.target.value)}
            placeholder="e.g. Dr. Mäkelä"
            disabled={step2Done}
            className="h-8 text-xs"
          />
        </div>

        <div className="space-y-1">
          <Label className="text-[11px] text-muted-foreground">Notes (optional)</Label>
          <Textarea
            value={apptNotes}
            onChange={(e) => setApptNotes(e.target.value)}
            rows={2}
            disabled={step2Done}
            className="text-xs"
          />
        </div>

        {!step2Done && (
          <Button className="w-full gap-1.5 mt-2" onClick={completeStep2}>
            <CalendarIcon className="h-3.5 w-3.5" /> Confirm Appointment
          </Button>
        )}
      </StepCard>

      {/* STEP 3 */}
      <StepCard
        index={3}
        title="Send Calendar Invite to Patient"
        done={step3Done}
        locked={!step2Done}
        statusLabel={step3Done ? "Sent to patient" : "Pending"}
        timestampLabel={step3Done ? stamp("Invite sent", progress.send_invite?.completed_at) : null}
        expanded={expanded === "send_invite"}
        onToggle={() =>
          step2Done && setExpanded(expanded === "send_invite" ? null : "send_invite")
        }
      >
        {step2Done && apptISO && (
          <div className="rounded-md border bg-background p-2.5 space-y-1.5">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              <FileText className="h-3.5 w-3.5" /> Calendar invite preview
            </div>
            <div className="space-y-1 text-xs">
              <div className="font-semibold">{inviteTitle || defaultInviteTitle(task.title ?? "", progress.schedule_appointment?.location)}</div>
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <CalendarIcon className="h-3 w-3" />
                {format(new Date(apptISO), "EEEE, dd MMM yyyy 'at' HH:mm")}
              </div>
              {progress.schedule_appointment?.location && (
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <MapPin className="h-3 w-3" />
                  {progress.schedule_appointment.location}
                </div>
              )}
            </div>
          </div>
        )}

        <div className="space-y-1">
          <Label className="text-[11px] text-muted-foreground">Invite title</Label>
          <Input
            value={inviteTitle}
            onChange={(e) => setInviteTitle(e.target.value)}
            disabled={step3Done}
            className="h-8 text-xs"
          />
        </div>

        <div className="space-y-1">
          <Label className="text-[11px] text-muted-foreground">Attending notes for patient (optional)</Label>
          <Textarea
            value={attendingNotes}
            onChange={(e) => setAttendingNotes(e.target.value)}
            rows={3}
            placeholder="e.g. Fast for 12 hours before the appointment. Bring insurance card."
            disabled={step3Done}
            className="text-xs"
          />
        </div>

        {!step3Done && (
          <Button className="w-full gap-1.5 mt-2" onClick={completeStep3}>
            <UserCheck className="h-3.5 w-3.5" /> Send to Patient
          </Button>
        )}
      </StepCard>

      {allStepsComplete(progress) && (
        <>
          <Separator />
          <p className="text-[11px] text-center text-muted-foreground italic">
            All steps complete — task automatically marked as done.
          </p>
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------

function StepCard({
  index,
  title,
  done,
  locked,
  statusLabel,
  timestampLabel,
  expanded,
  onToggle,
  children,
}: {
  index: number;
  title: string;
  done: boolean;
  locked: boolean;
  statusLabel: string;
  timestampLabel: string | null;
  expanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "rounded-lg border bg-muted/20",
        locked && "opacity-60",
        done && "border-emerald-500/40 bg-emerald-500/5",
      )}
    >
      <button
        type="button"
        onClick={onToggle}
        disabled={locked}
        className="w-full flex items-center gap-2 px-3 py-2.5 text-left"
      >
        <span
          className={cn(
            "h-6 w-6 rounded-full flex items-center justify-center text-[11px] font-semibold shrink-0",
            done
              ? "bg-emerald-500 text-white"
              : locked
              ? "bg-muted text-muted-foreground"
              : "bg-primary/10 text-primary",
          )}
        >
          {done ? <Check className="h-3.5 w-3.5" /> : locked ? <Lock className="h-3 w-3" /> : index}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">{title}</span>
            <Badge
              className={cn(
                "text-[9px] uppercase",
                done
                  ? "bg-emerald-500 text-white hover:bg-emerald-500"
                  : "bg-muted text-muted-foreground hover:bg-muted",
              )}
            >
              {statusLabel}
            </Badge>
          </div>
          {timestampLabel && (
            <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{timestampLabel}</p>
          )}
        </div>
        {!locked && (expanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />)}
      </button>

      {expanded && !locked && (
        <div className="px-3 pb-3 space-y-2.5 border-t pt-3">{children}</div>
      )}
    </div>
  );
}
