// Compact patient-tasks card for the Patient Overview page.
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, ListTodo, ArrowRight } from "lucide-react";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useTasks } from "@/hooks/useTasks";
import { useTaskActions } from "@/components/tasks/TaskProvider";
import { TaskDetailPanel } from "@/components/tasks/TaskDetailPanel";
import { useState } from "react";
import {
  priorityMeta, statusLabel, isOverdue, type Task,
} from "@/lib/tasks";
import { Badge } from "@/components/ui/badge";
import { completedCount, TOTAL_REFERRAL_STEPS, type ReferralProgress } from "@/lib/referralWorkflow";

export function PatientTasksCard({ patientId, patientName }: { patientId: string; patientName: string }) {
  const navigate = useNavigate();
  const { tasks } = useTasks({ patientId });
  const { openNewTask } = useTaskActions();
  const [detail, setDetail] = useState<Task | null>(null);
  const [open, setOpen] = useState(false);

  const visible = tasks.slice(0, 3);

  return (
    <Card className="shadow-card rounded-t-none border-t-0">
      <CardContent className="py-3 px-3 space-y-2">
        <div className="flex items-center gap-2">
          <ListTodo className="h-3.5 w-3.5 text-primary" />
          <h3 className="text-[13px] font-semibold">Tasks</h3>
          <div className="ml-auto flex items-center gap-2">
            <Button
              variant="ghost" size="sm"
              className="h-6 text-[11px] gap-1 px-1.5 text-muted-foreground hover:text-foreground"
              onClick={() => openNewTask({
                patient_id: patientId,
                title: `Follow up — ${patientName}`,
                category: "clinical",
              })}
            >
              <Plus className="h-3 w-3" /> Add task
            </Button>
            {tasks.length > 3 && (
              <button
                onClick={() => navigate(`/tasks?patient=${patientId}`)}
                className="text-[11px] text-muted-foreground hover:text-foreground hover:underline"
              >
                See all ({tasks.length}) <ArrowRight className="h-3 w-3 inline" />
              </button>
            )}
          </div>
        </div>
        {tasks.length === 0 ? (
          <p className="text-[11px] text-muted-foreground">No tasks for this patient.</p>
        ) : (
          <ul className="space-y-1">
            {visible.map((t) => {
              const meta = priorityMeta(t.priority);
              const overdue = isOverdue(t);
              const isReferral = (t as Task & { task_category?: string | null }).task_category === "referral";
              const refProgress = (t as Task & { referral_progress?: ReferralProgress | null }).referral_progress;
              const stepCount = isReferral ? completedCount(refProgress) : 0;
              const showRefProgress = isReferral && t.status !== "done";
              return (
                <li key={t.id}>
                  <button
                    onClick={() => { setDetail(t); setOpen(true); }}
                    className="w-full text-left flex items-center gap-2 py-1 hover:bg-muted/40 rounded px-1 transition-colors"
                  >
                    <span className={cn("h-2 w-2 rounded-full shrink-0", meta.dot)} />
                    <span className={cn(
                      "text-[12px] flex-1 truncate",
                      t.status === "done" && "line-through text-muted-foreground",
                    )}>{t.title}</span>
                    {showRefProgress && (
                      <Badge
                        variant="outline"
                        className="text-[9px] tabular-nums shrink-0"
                        title={`Referral: ${stepCount}/${TOTAL_REFERRAL_STEPS} steps complete`}
                      >
                        {stepCount}/{TOTAL_REFERRAL_STEPS}
                      </Badge>
                    )}
                    <span className="text-[10px] text-muted-foreground truncate">{t.assignee_name}</span>
                    {t.due_date && (
                      <span className={cn(
                        "text-[10px] tabular-nums",
                        overdue ? "text-destructive font-medium" : "text-muted-foreground",
                      )}>
                        {format(new Date(t.due_date), "dd MMM")}
                      </span>
                    )}
                    <span className="text-[10px] text-muted-foreground uppercase tracking-wide">{statusLabel(t.status)}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>

      <TaskDetailPanel
        task={detail}
        patientName={patientName}
        open={open}
        onOpenChange={setOpen}
      />
    </Card>
  );
}
