// Side panel for inspecting / editing a single task. Uses Sheet so it slides in
// from the right without leaving the current page.

import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, Pencil, Trash2, User, Stethoscope, HeartPulse, ArrowRight, FlaskConical, Pill, AlertTriangle } from "lucide-react";
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

interface Props {
  task: Task | null;
  patientName: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TaskDetailPanel({ task, patientName, open, onOpenChange }: Props) {
  const navigate = useNavigate();
  const { openEditTask, notifyChanged } = useTaskActions();
  const [notes, setNotes] = useState("");
  const [savingNote, setSavingNote] = useState(false);

  useEffect(() => {
    setNotes(task?.description ?? "");
  }, [task]);

  if (!task) return null;
  const meta = priorityMeta(task.priority);
  const role = assigneeRole(task.assignee_name);

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
        </div>
      </SheetContent>
    </Sheet>
  );
}
