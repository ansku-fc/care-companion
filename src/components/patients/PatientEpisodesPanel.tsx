// Horizontal "Active Episodes" panel for a patient profile.
// Shows each active episode as a card with its chained tasks (locked indicators).
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity, Lock, CheckCircle2, Circle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useEpisodes } from "@/hooks/useEpisodes";
import { EPISODE_TYPE_META, URGENCY_META, type Episode } from "@/lib/episodes";
import { TaskDetailPanel } from "@/components/tasks/TaskDetailPanel";
import { useState } from "react";
import type { Task } from "@/lib/tasks";

export function PatientEpisodesPanel({ patientId, patientName }: { patientId: string; patientName: string }) {
  const { episodes, tasksByEpisode, loading } = useEpisodes({ patientId, status: "ACTIVE" });
  const [detail, setDetail] = useState<Task | null>(null);
  const [open, setOpen] = useState(false);

  if (loading) return null;
  if (episodes.length === 0) return null;

  return (
    <Card className="shadow-card">
      <CardContent className="py-3 px-3 space-y-2">
        <div className="flex items-center gap-2">
          <Activity className="h-3.5 w-3.5 text-primary" />
          <h3 className="text-[13px] font-semibold">Active Episodes</h3>
          <Badge variant="secondary" className="text-[10px]">{episodes.length}</Badge>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
          {episodes.map((ep) => (
            <EpisodeCard
              key={ep.id}
              episode={ep}
              tasks={tasksByEpisode[ep.id] ?? []}
              onTaskClick={(t) => { setDetail(t); setOpen(true); }}
            />
          ))}
        </div>
      </CardContent>
      <TaskDetailPanel task={detail} patientName={patientName} open={open} onOpenChange={setOpen} />
    </Card>
  );
}

function EpisodeCard({
  episode, tasks, onTaskClick,
}: { episode: Episode; tasks: Task[]; onTaskClick: (t: Task) => void }) {
  const meta = EPISODE_TYPE_META[episode.episode_type];
  const urgency = URGENCY_META[episode.urgency];
  const taskById = new Map(tasks.map((t) => [t.id, t]));
  const isLocked = (t: Task) => {
    const parentId = (t as any).parent_task_id as string | null | undefined;
    if (!parentId) return false;
    const parent = taskById.get(parentId);
    return !!parent && parent.status !== "done";
  };

  return (
    <div className="min-w-[260px] max-w-[280px] shrink-0 rounded-lg border bg-card p-2.5 space-y-2">
      <div className="flex items-start gap-1.5">
        <span className={cn("mt-1 h-2 w-2 rounded-full shrink-0", meta.dotClass)} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1 flex-wrap">
            <Badge variant="outline" className={cn("text-[9px] uppercase tracking-wide border-0", meta.badgeClass)}>
              {meta.label}
            </Badge>
            {episode.urgency !== "ROUTINE" && (
              <span className={cn("text-[9px] uppercase tracking-wide font-semibold", urgency.className)}>
                {urgency.label}
              </span>
            )}
          </div>
          <p className="text-[12px] font-medium leading-snug mt-1 line-clamp-2">{episode.title}</p>
        </div>
      </div>
      {tasks.length === 0 ? (
        <p className="text-[10px] text-muted-foreground italic">No tasks yet</p>
      ) : (
        <ol className="space-y-0.5">
          {tasks.map((t) => {
            const locked = isLocked(t);
            const done = t.status === "done";
            const Icon = done ? CheckCircle2 : locked ? Lock : Circle;
            return (
              <li key={t.id}>
                <button
                  type="button"
                  disabled={locked}
                  onClick={() => !locked && onTaskClick(t)}
                  className={cn(
                    "w-full text-left flex items-center gap-1.5 py-1 px-1 rounded text-[11px] transition-colors",
                    locked ? "opacity-50 cursor-not-allowed" : "hover:bg-muted/50",
                    done && "line-through text-muted-foreground",
                  )}
                  title={locked ? "Locked — waiting for previous step" : undefined}
                >
                  <Icon className={cn(
                    "h-3 w-3 shrink-0",
                    done ? "text-emerald-600" : locked ? "text-muted-foreground" : "text-primary",
                  )} />
                  <span className="truncate flex-1">{t.title}</span>
                </button>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
