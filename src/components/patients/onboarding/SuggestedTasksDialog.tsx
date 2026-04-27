import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { categoryLabel, priorityMeta, ASSIGNEES } from "@/lib/tasks";
import { cn } from "@/lib/utils";
import { dueDateFromDays, type SuggestedTask } from "./suggestedTasks";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patientId: string;
  suggestions: SuggestedTask[];
  /** Called once the doctor closes (after creating tasks or skipping). */
  onDone: () => void;
};

export function SuggestedTasksDialog({ open, onOpenChange, patientId, suggestions, onDone }: Props) {
  const { user } = useAuth();
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);

  // Pre-check every suggestion whenever it changes / dialog reopens.
  useEffect(() => {
    if (!open) return;
    const initial: Record<string, boolean> = {};
    for (const s of suggestions) initial[s.id] = true;
    setSelected(initial);
  }, [open, suggestions]);

  const selectedCount = useMemo(
    () => suggestions.filter((s) => selected[s.id]).length,
    [suggestions, selected],
  );

  const handleSkip = () => {
    onOpenChange(false);
    onDone();
  };

  const handleCreate = async () => {
    if (!user) {
      toast.error("You must be logged in");
      return;
    }
    const chosen = suggestions.filter((s) => selected[s.id]);
    if (chosen.length === 0) {
      handleSkip();
      return;
    }
    setSaving(true);
    const rows = chosen.map((s) => {
      const meta = ASSIGNEES.find((a) => a.name === s.assignee_name);
      return {
        title: s.title,
        description: s.description ?? null,
        patient_id: patientId,
        category: s.category,
        priority: s.priority,
        status: "todo" as const,
        assignee_name: s.assignee_name,
        assignee_type: meta?.type ?? "doctor_internal",
        due_date: dueDateFromDays(s.due_in_days),
        created_from: s.created_from,
        task_category: s.task_category,
        created_by: user.id,
      };
    });
    const { error } = await supabase.from("tasks").insert(rows as never);
    setSaving(false);
    if (error) {
      toast.error("Failed to create tasks");
      return;
    }
    toast.success(`${chosen.length} task${chosen.length === 1 ? "" : "s"} created`);
    onOpenChange(false);
    onDone();
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o && !saving) handleSkip();
        else onOpenChange(o);
      }}
    >
      <DialogContent className="max-w-2xl">
        <DialogTitle>Suggested tasks based on onboarding</DialogTitle>
        <DialogDescription>
          Review the auto-generated follow-ups. Uncheck any you don&apos;t need, then create the rest.
        </DialogDescription>

        <div className="mt-2 space-y-2 max-h-[60vh] overflow-y-auto pr-1">
          {suggestions.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">
              No follow-up tasks suggested for this onboarding.
            </p>
          ) : (
            suggestions.map((s) => {
              const isOn = selected[s.id] ?? true;
              const prio = priorityMeta(s.priority);
              const due = dueDateFromDays(s.due_in_days);
              return (
                <label
                  key={s.id}
                  className={cn(
                    "flex items-start gap-3 rounded-lg border border-border bg-card/40 px-3 py-3 cursor-pointer transition-colors",
                    isOn ? "" : "opacity-60",
                  )}
                >
                  <Checkbox
                    checked={isOn}
                    onCheckedChange={(v) =>
                      setSelected((prev) => ({ ...prev, [s.id]: Boolean(v) }))
                    }
                    className="mt-0.5"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-foreground">{s.title}</div>
                    {s.description && (
                      <div className="text-xs text-muted-foreground mt-0.5">{s.description}</div>
                    )}
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <Badge variant="secondary" className="text-[10px] font-normal">
                        {categoryLabel(s.category)}
                      </Badge>
                      <span className={cn("text-[10px] px-2 py-0.5 rounded-full", prio.badge)}>
                        {prio.label} priority
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        Due {format(new Date(due), "MMM d, yyyy")}
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        · {s.assignee_name}
                      </span>
                    </div>
                  </div>
                </label>
              );
            })
          )}
        </div>

        <DialogFooter className="mt-2 flex-row justify-end gap-2">
          <Button variant="outline" onClick={handleSkip} disabled={saving}>
            Skip all
          </Button>
          <Button onClick={handleCreate} disabled={saving || suggestions.length === 0}>
            {saving
              ? "Creating…"
              : `Create selected task${selectedCount === 1 ? "" : "s"}${
                  selectedCount ? ` (${selectedCount})` : ""
                }`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
