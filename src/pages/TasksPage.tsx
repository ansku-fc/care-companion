import { useMemo, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { ChevronDown, ChevronRight, ListTodo, Layers, Plus, Users } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useTasks } from "@/hooks/useTasks";
import { useAuth } from "@/hooks/useAuth";
import { useTaskActions } from "@/components/tasks/TaskProvider";
import { TaskDetailPanel } from "@/components/tasks/TaskDetailPanel";
import {
  STATUS_OPTIONS, PRIORITY_OPTIONS, TASK_CATEGORIES,
  categoryLabel, priorityMeta, statusLabel, isOverdue,
  type Task, type TaskStatus, type TaskPriority, type TaskCategory,
} from "@/lib/tasks";
import { completedCount, TOTAL_REFERRAL_STEPS, type ReferralProgress } from "@/lib/referralWorkflow";

// Initials + tone for assignee avatar chip
function assigneeInitials(name: string): string {
  const cleaned = name.replace(/^(dr\.?|doctor|nurse)\s+/i, "").trim();
  const parts = cleaned.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function assigneeAvatarTone(name: string | null | undefined): string {
  if (!name) return "bg-muted text-muted-foreground";
  if (/nurse/i.test(name)) return "bg-teal-500/15 text-teal-600 dark:text-teal-300 border border-teal-500/30";
  if (/dr\.?|doctor/i.test(name)) return "bg-primary/15 text-primary border border-primary/30";
  return "bg-muted text-muted-foreground border border-border";
}

function AssigneeAvatar({ name, size = "sm" }: { name: string; size?: "xs" | "sm" }) {
  const dims = size === "xs" ? "h-5 w-5 text-[9px]" : "h-6 w-6 text-[10px]";
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded-full font-semibold tracking-wide shrink-0",
        dims,
        assigneeAvatarTone(name),
      )}
      title={name}
    >
      {assigneeInitials(name)}
    </span>
  );
}

const STATUS_GROUPS: TaskStatus[] = ["todo", "in_progress", "done", "deferred"];

const TIER_LABELS: Record<string, string> = {
  tier_1: "Tier 1", tier_2: "Tier 2", tier_3: "Tier 3", tier_4: "Tier 4",
  children: "Children", onboarding: "Onboarding", acute: "Acute", case_management: "Case Mgmt",
};
const tierLabel = (t: string | null) => (t ? TIER_LABELS[t] ?? t : "");

const TasksPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { tasks, patients, patientName, loading } = useTasks();
  const { openNewTask } = useTaskActions();
  const { profile } = useAuth();
  const currentUserName = profile?.full_name ?? "Dr. Laine";

  // Scope: My Tasks (default) vs All Tasks (incl. team FYI rows)
  const [scope, setScope] = useState<"mine" | "all">("mine");

  // Filter state — patient & priority can be deep-linked.
  const [filterStatus, setFilterStatus]       = useState<string>("all");
  const [filterAssignee, setFilterAssignee]   = useState<string>("all");
  const [filterCategory, setFilterCategory]   = useState<string>("all");
  const [filterPriority, setFilterPriority]   = useState<string>(searchParams.get("priority") ?? "all");
  const [filterPatient, setFilterPatient]     = useState<string>(searchParams.get("patient") ?? "all");
  const [dateFrom, setDateFrom]               = useState<string>("");
  const [dateTo, setDateTo]                   = useState<string>("");
  const [view, setView]                       = useState<"grouped" | "flat" | "patient">("grouped");
  const [openSections, setOpenSections]       = useState<Record<TaskStatus, boolean>>({
    todo: true, in_progress: true, done: false, deferred: false,
  });

  const [detailTask, setDetailTask] = useState<Task | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const openDetail = (t: Task) => { setDetailTask(t); setDetailOpen(true); };

  const isMine = (t: Task) => (t.assignee_name ?? "") === currentUserName;

  // Apply non-scope filters first so My/All counts reflect current filters.
  const baseFiltered = useMemo(() => {
    return tasks.filter((t) => {
      if (filterStatus !== "all" && t.status !== filterStatus) return false;
      if (filterAssignee !== "all" && (t.assignee_name ?? "") !== filterAssignee) return false;
      if (filterCategory !== "all" && t.category !== filterCategory) return false;
      if (filterPriority !== "all" && t.priority !== filterPriority) return false;
      if (filterPatient !== "all" && (t.patient_id ?? "") !== filterPatient) return false;
      if (dateFrom && t.due_date && t.due_date < dateFrom) return false;
      if (dateTo && t.due_date && t.due_date > dateTo) return false;
      return true;
    });
  }, [tasks, filterStatus, filterAssignee, filterCategory, filterPriority, filterPatient, dateFrom, dateTo]);

  const myCount = useMemo(() => baseFiltered.filter(isMine).length, [baseFiltered, currentUserName]);
  const allCount = baseFiltered.length;

  const filtered = useMemo(
    () => (scope === "mine" ? baseFiltered.filter(isMine) : baseFiltered),
    [baseFiltered, scope, currentUserName],
  );

  const grouped = useMemo(() => {
    const map = new Map<TaskStatus, Task[]>();
    STATUS_GROUPS.forEach((s) => map.set(s, []));
    filtered.forEach((t) => map.get(t.status)?.push(t));
    return map;
  }, [filtered]);

  const flatSorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      // Most urgent first: overdue → due date asc → priority weight
      const oa = isOverdue(a) ? -1 : 0;
      const ob = isOverdue(b) ? -1 : 0;
      if (oa !== ob) return oa - ob;
      if (a.due_date !== b.due_date) {
        if (!a.due_date) return 1;
        if (!b.due_date) return -1;
        return a.due_date.localeCompare(b.due_date);
      }
      const order: Record<TaskPriority, number> = { urgent: 0, high: 1, medium: 2, low: 3 };
      return order[a.priority] - order[b.priority];
    });
  }, [filtered]);

  const patientGroups = useMemo(() => {
    const map = new Map<string, Task[]>();
    filtered.forEach((t) => {
      const key = t.patient_id ?? "__none__";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(t);
    });
    const groups = Array.from(map.entries()).map(([pid, list]) => {
      const sorted = [...list].sort((a, b) => {
        if (!a.due_date && !b.due_date) return 0;
        if (!a.due_date) return 1;
        if (!b.due_date) return -1;
        return a.due_date.localeCompare(b.due_date);
      });
      const overdue = sorted.filter(isOverdue).length;
      const patient = patients.find((p) => p.id === pid);
      const name = patient?.full_name ?? (pid === "__none__" ? "Unassigned" : "Unknown patient");
      return { pid, name, tier: patient?.tier ?? null, tasks: sorted, overdue };
    });
    groups.sort((a, b) => a.name.localeCompare(b.name));
    return groups;
  }, [filtered, patients]);

  const [openPatients, setOpenPatients] = useState<Record<string, boolean>>({});
  const isPatientOpen = (pid: string) => openPatients[pid] ?? true;

  const clearFilters = () => {
    setFilterStatus("all"); setFilterAssignee("all"); setFilterCategory("all");
    setFilterPriority("all"); setFilterPatient("all");
    setDateFrom(""); setDateTo("");
    setSearchParams({});
  };

  const assignees = Array.from(new Set(tasks.map((t) => t.assignee_name).filter(Boolean))) as string[];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <ListTodo className="h-6 w-6 text-primary" /> Tasks
          </h1>
          <p className="text-muted-foreground text-sm">
            All clinical tasks across patients in one place. {filtered.length} of {tasks.length} shown.
          </p>
        </div>
        <Button onClick={() => openNewTask()} className="gap-1.5">
          <Plus className="h-4 w-4" /> New Task
        </Button>
      </div>

      {/* Filter bar */}
      <Card>
        <CardContent className="p-3 flex flex-wrap items-end gap-2">
          <FilterSelect label="Status" value={filterStatus} onChange={setFilterStatus} all="All statuses">
            {STATUS_OPTIONS.map((s) => <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>)}
          </FilterSelect>
          <FilterSelect label="Priority" value={filterPriority} onChange={setFilterPriority} all="All priorities">
            {PRIORITY_OPTIONS.map((p) => <SelectItem key={p.key} value={p.key}>{p.label}</SelectItem>)}
          </FilterSelect>
          <FilterSelect label="Category" value={filterCategory} onChange={setFilterCategory} all="All categories">
            {TASK_CATEGORIES.map((c) => <SelectItem key={c.key} value={c.key}>{c.label}</SelectItem>)}
          </FilterSelect>
          <FilterSelect label="Assignee" value={filterAssignee} onChange={setFilterAssignee} all="All assignees">
            {assignees.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
          </FilterSelect>
          <FilterSelect label="Patient" value={filterPatient} onChange={setFilterPatient} all="All patients">
            {patients.map((p) => <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>)}
          </FilterSelect>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] uppercase tracking-wide text-muted-foreground">Due from</label>
            <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="h-9 w-[150px]" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] uppercase tracking-wide text-muted-foreground">Due to</label>
            <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="h-9 w-[150px]" />
          </div>
          <Button variant="ghost" size="sm" onClick={clearFilters}>Reset</Button>
          <div className="ml-auto flex items-center gap-2">
            <Button
              variant={view === "grouped" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setView("grouped")}
              className="gap-1.5"
            >
              <Layers className="h-3.5 w-3.5" /> By Status
            </Button>
            <Button
              variant={view === "flat" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setView("flat")}
              className="gap-1.5"
            >
              <ListTodo className="h-3.5 w-3.5" /> By Due Date
            </Button>
            <Button
              variant={view === "patient" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setView("patient")}
              className="gap-1.5"
            >
              <Users className="h-3.5 w-3.5" /> By Patient
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* My Tasks / All Tasks scope */}
      <div className="flex items-center gap-2">
        <ScopePill
          active={scope === "mine"}
          onClick={() => setScope("mine")}
          label="My Tasks"
          count={myCount}
          variant="primary"
        />
        <ScopePill
          active={scope === "all"}
          onClick={() => setScope("all")}
          label="All Tasks"
          count={allCount}
          variant="outline"
        />
        {scope === "all" && (
          <span className="text-[11px] text-muted-foreground ml-1">
            Team tasks shown as <span className="font-medium">FYI</span>.
          </span>
        )}
      </div>

      {/* Task list */}
      {loading ? (
        <p className="text-sm text-muted-foreground">Loading tasks…</p>
      ) : view === "flat" ? (
        <div className="space-y-2">
          {flatSorted.length === 0 ? (
            <p className="text-sm text-muted-foreground">No tasks match the current filters.</p>
          ) : (
            flatSorted.map((t) => (
              <TaskRow
                key={t.id}
                task={t}
                patientName={patientName(t.patient_id)}
                onClick={() => openDetail(t)}
                mine={isMine(t)}
              />
            ))
          )}
        </div>
      ) : view === "patient" ? (
        <div className="space-y-4">
          {patientGroups.length === 0 && (
            <p className="text-sm text-muted-foreground">No tasks match the current filters.</p>
          )}
          {patientGroups.map((g) => {
            const open = isPatientOpen(g.pid);
            return (
              <Card key={g.pid}>
                <button
                  className="w-full flex items-center gap-2 px-4 py-3 hover:bg-muted/40 rounded-t-lg transition-colors"
                  onClick={() => setOpenPatients((s) => ({ ...s, [g.pid]: !open }))}
                >
                  {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  <h2 className="text-sm font-semibold">{g.name}</h2>
                  {g.tier && (
                    <Badge variant="outline" className="text-[10px]">
                      {tierLabel(g.tier)}
                    </Badge>
                  )}
                  <span className="text-[11px] text-muted-foreground">·</span>
                  <span className="text-[11px] text-muted-foreground tabular-nums">
                    {g.tasks.length} {g.tasks.length === 1 ? "task" : "tasks"}
                  </span>
                  {g.overdue > 0 && (
                    <>
                      <span className="text-[11px] text-muted-foreground">·</span>
                      <span className="text-[11px] font-medium tabular-nums text-pink-600 dark:text-pink-400">
                        {g.overdue} overdue
                      </span>
                    </>
                  )}
                </button>
                {open && (
                  <div className="px-3 pb-3 space-y-2">
                    {g.tasks.map((t) => (
                      <TaskRow
                        key={t.id}
                        task={t}
                        patientName={null}
                        onClick={() => openDetail(t)}
                        mine={isMine(t)}
                      />
                    ))}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      ) : (
        <div className="space-y-4">
          {STATUS_GROUPS.map((status) => {
            const list = grouped.get(status) ?? [];
            if (list.length === 0) return null;
            const isOpen = openSections[status];
            return (
              <Card key={status}>
                <button
                  className="w-full flex items-center gap-2 px-4 py-3 hover:bg-muted/40 rounded-t-lg transition-colors"
                  onClick={() => setOpenSections((s) => ({ ...s, [status]: !isOpen }))}
                >
                  {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  <h2 className="text-sm font-semibold">{statusLabel(status)}</h2>
                  <Badge variant="secondary" className="ml-1">{list.length}</Badge>
                </button>
                {isOpen && (
                  <div className="px-3 pb-3 space-y-2">
                    {list.map((t) => (
                      <TaskRow
                        key={t.id}
                        task={t}
                        patientName={patientName(t.patient_id)}
                        onClick={() => openDetail(t)}
                        mine={isMine(t)}
                      />
                    ))}
                  </div>
                )}
              </Card>
            );
          })}
          {filtered.length === 0 && (
            <p className="text-sm text-muted-foreground">No tasks match the current filters.</p>
          )}
        </div>
      )}

      <TaskDetailPanel
        task={detailTask}
        patientName={detailTask ? patientName(detailTask.patient_id) : null}
        open={detailOpen}
        onOpenChange={setDetailOpen}
      />
    </div>
  );
};

function FilterSelect({
  label, value, onChange, all, children,
}: { label: string; value: string; onChange: (v: string) => void; all: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="h-9 w-[160px]"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{all}</SelectItem>
          {children}
        </SelectContent>
      </Select>
    </div>
  );
}

function ScopePill({
  active, onClick, label, count, variant,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
  variant: "primary" | "outline";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 h-8 px-3 rounded-full text-xs font-medium transition-colors border",
        active && variant === "primary" && "bg-primary text-primary-foreground border-primary",
        active && variant === "outline" && "bg-foreground text-background border-foreground",
        !active && "bg-transparent text-muted-foreground border-border hover:text-foreground hover:border-foreground/40",
      )}
    >
      <span>{label}</span>
      <span
        className={cn(
          "inline-flex items-center justify-center h-5 min-w-[20px] px-1.5 rounded-full text-[10px] tabular-nums",
          active ? "bg-background/20 text-current" : "bg-muted text-muted-foreground",
        )}
      >
        {count}
      </span>
    </button>
  );
}

function TaskRow({
  task, patientName, onClick, mine,
}: { task: Task; patientName: string | null; onClick: () => void; mine: boolean }) {
  const meta = priorityMeta(task.priority);
  const overdue = isOverdue(task);
  const isReferral = (task as Task & { task_category?: string | null }).task_category === "referral";
  const refProgress = (task as Task & { referral_progress?: ReferralProgress | null }).referral_progress;
  const stepCount = isReferral ? completedCount(refProgress) : 0;
  const showRefProgress = isReferral && task.status !== "done";
  const fyi = !mine;
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full text-left bg-card border rounded-lg px-3 py-2.5 hover:border-primary/40 transition-colors",
        "flex items-center gap-3",
        fyi && "opacity-60 border-l-2 border-l-muted-foreground/30",
      )}
    >
      <span
        className={cn(
          "h-2.5 w-2.5 rounded-full shrink-0",
          fyi ? "bg-muted-foreground/40" : meta.dot,
        )}
      />
      {fyi && task.assignee_name && (
        <AssigneeAvatar name={task.assignee_name} size="xs" />
      )}
      <div className="flex-1 min-w-0">
        <p className={cn(
          "text-sm font-medium truncate flex items-center gap-2",
          task.status === "done" && "line-through text-muted-foreground",
        )}>
          <span className="truncate">{task.title}</span>
          {showRefProgress && (
            <Badge
              variant="outline"
              className={cn(
                "text-[10px] tabular-nums shrink-0",
                stepCount === 0 && "text-muted-foreground",
                stepCount > 0 && stepCount < TOTAL_REFERRAL_STEPS && "border-primary/40 text-primary",
              )}
              title={`Referral coordination: ${stepCount}/${TOTAL_REFERRAL_STEPS} steps complete`}
            >
              {stepCount}/{TOTAL_REFERRAL_STEPS}
            </Badge>
          )}
        </p>
        <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-0.5 flex-wrap">
          {patientName && <span className="text-foreground/80 font-medium">{patientName}</span>}
          {patientName && <span>·</span>}
          <span>{categoryLabel(task.category)}</span>
          {fyi && task.assignee_name && (
            <>
              <span>·</span>
              <span>{task.assignee_name}</span>
              <span className="ml-0.5 inline-flex items-center px-1.5 h-4 rounded bg-muted text-[9px] uppercase tracking-wide font-semibold text-muted-foreground">
                FYI
              </span>
            </>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {task.assignee_name && (
          <AssigneeAvatar name={task.assignee_name} size="sm" />
        )}
        {task.due_date && (
          <span className={cn(
            "text-[11px] tabular-nums",
            overdue ? "text-destructive font-medium" : "text-muted-foreground",
          )}>
            {format(new Date(task.due_date), "dd MMM")}
          </span>
        )}
        <Badge variant="outline" className="text-[10px]">{statusLabel(task.status)}</Badge>
      </div>
    </button>
  );
}

export default TasksPage;
