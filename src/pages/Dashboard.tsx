import { useEffect, useMemo, useRef, useState } from "react";
import {
  CalendarDays, AlertTriangle, ArrowRight, Stethoscope, Plus,
  UserRound, HeartPulse, FileText, ClipboardList, CheckCircle2, Clock, Activity,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { useTasks } from "@/hooks/useTasks";
import { useTaskActions } from "@/components/tasks/TaskProvider";
import { TaskDetailPanel } from "@/components/tasks/TaskDetailPanel";
import { formatLastFirst } from "@/lib/patientName";
import {
  isCompletedToday, dueWithinDays, isOverdue, isDueToday,
  priorityMeta, type Task,
} from "@/lib/tasks";
import { format, isSameDay, parseISO } from "date-fns";
import { useQuery } from "@tanstack/react-query";
import { buildDummyAppointments, typeStyle } from "@/lib/dummyAppointments";

type PatientLite = { id: string; full_name: string };

type ScheduleItem = {
  id: string;
  time: string;
  start: Date;
  end: Date;
  name: string;
  type: string;
  appointmentType: string;
  status: "completed" | "in_progress" | "upcoming";
};

const APPT_TYPE_LABEL: Record<string, string> = {
  onboarding: "Onboarding",
  acute: "Acute",
  consultation: "Consultation",
  follow_up: "Follow-up",
  check_up: "Check-up",
  procedure: "Procedure",
  urgent: "Urgent consultation",
  working_time: "Working Time",
  doctor_meeting: "Doctor Meeting",
  nurse_task: "Nurse Task",
};


const recentActivity = [
  { time: "Today 09:15", event: "New lab results uploaded", patient: "Korhonen, Elena", actor: "Lab system", section: "health-data" as const },
  { time: "Today 08:30", event: "Risk index updated: Cardiovascular 8.4 (↑ from 7.1)", patient: "Carter, Jay-Z", actor: "System", section: "overview" as const },
  { time: "Yesterday", event: "Annotation added to LDL graph", patient: "Carter, Jay-Z", actor: "Dr. Laine", section: "health-data" as const },
  { time: "Yesterday", event: "Care plan note added", patient: "Mäkinen, Aino", actor: "Nurse Mäkinen", section: "overview" as const },
  { time: "21 Apr", event: "New onboarding form submitted", patient: "Okafor, David", actor: "Patient", section: "overview" as const },
];

const initialsOf = (name: string) => {
  const parts = name.replace(",", "").trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase();
};

const ActorIcon = ({ actor }: { actor: string }) => {
  const map: Record<string, { icon: typeof Stethoscope; cls: string }> = {
    doctor:  { icon: Stethoscope, cls: "bg-primary/10 text-primary" },
    nurse:   { icon: HeartPulse,  cls: "bg-success/10 text-success" },
    patient: { icon: UserRound,   cls: "bg-warning/10 text-warning" },
    system:  { icon: Activity,    cls: "bg-muted text-muted-foreground" },
    lab:     { icon: FileText,    cls: "bg-muted text-muted-foreground" },
  };
  const { icon: Icon, cls } = map[actor] ?? map.system;
  return (
    <span className={cn("inline-flex h-6 w-6 items-center justify-center rounded-full shrink-0", cls)}>
      <Icon className="h-3.5 w-3.5" />
    </span>
  );
};

const Dashboard = () => {
  const navigate = useNavigate();
  const scheduleRef = useRef<HTMLDivElement>(null);
  const actionRef = useRef<HTMLDivElement>(null);
  const [patients, setPatients] = useState<PatientLite[]>([]);
  const { tasks, patientName } = useTasks();
  const { openNewTask } = useTaskActions();
  const [detail, setDetail] = useState<Task | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    supabase.from("patients").select("id, full_name").then(({ data }) => setPatients(data ?? []));
  }, []);

  const today = new Date();
  const dateLabel = today.toLocaleDateString(undefined, {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });

  const findPatient = (display: string) => {
    const [last, first] = display.split(",").map((s) => s.trim());
    const tokens = [last, first].filter(Boolean).map((s) => s.toLowerCase());
    return patients.find((p) => {
      const n = p.full_name.toLowerCase();
      return tokens.every((t) => n.includes(t));
    });
  };
  const goToPatient = (display: string, tab?: string) => {
    const p = findPatient(display);
    navigate(p ? `/patients/${p.id}${tab ? `?tab=${tab}` : ""}` : "/patients");
  };
  const scrollTo = (ref: React.RefObject<HTMLDivElement>) => {
    ref.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  const openTask = (t: Task) => { setDetail(t); setOpen(true); };

  const createTaskForAppt = (appt: ScheduleItem) => {
    const p = findPatient(appt.name);
    openNewTask({
      title: "Post-visit follow-up",
      patient_id: p?.id ?? null,
      category: "clinical",
      priority: "medium",
      created_from: `${appt.time} ${appt.type}`,
    });
  };

  const createTaskFromAction = (t: Task) => {
    openNewTask({
      title: t.title,
      description: t.description ?? undefined,
      patient_id: t.patient_id,
      category: t.category,
      priority: t.priority,
      assignee_name: t.assignee_name ?? undefined,
      created_from: `Action Centre · ${t.title}`,
    });
  };

  // Live task buckets — every open task across all patients is surfaced.
  // Urgent: anything explicitly urgent priority OR overdue OR due today (high+).
  const isOpen = (t: Task) => t.status !== "done" && t.status !== "deferred";
  const urgentTasks = tasks.filter(
    (t) =>
      isOpen(t) &&
      (t.priority === "urgent" ||
        isOverdue(t) ||
        (t.priority === "high" && isDueToday(t))),
  );
  const urgentIds = new Set(urgentTasks.map((t) => t.id));
  // Pending: every other open task (not already urgent), sorted by due date soonest first.
  const pendingTasks = tasks
    .filter((t) => isOpen(t) && !urgentIds.has(t.id))
    .sort((a, b) => {
      const da = a.due_date ? new Date(a.due_date).getTime() : Number.POSITIVE_INFINITY;
      const db = b.due_date ? new Date(b.due_date).getTime() : Number.POSITIVE_INFINITY;
      return da - db;
    });
  const completedToday = tasks.filter((t) => isCompletedToday(t));

  // Today's schedule = real appointments from DB + today's dummy appointments
  const todayKey = format(today, "yyyy-MM-dd");
  const { data: realTodayAppts = [] } = useQuery({
    queryKey: ["today-appointments", todayKey],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("appointments")
        .select("*, patients(full_name)")
        .gte("start_time", `${todayKey}T00:00:00`)
        .lte("start_time", `${todayKey}T23:59:59`)
        .order("start_time", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  const todaySchedule: ScheduleItem[] = useMemo(() => {
    const now = new Date();
    const dummies = buildDummyAppointments(today).filter((a) =>
      isSameDay(parseISO(a.start_time), today),
    );
    type Raw = {
      id: string;
      start_time: string;
      end_time: string;
      appointment_type?: string | null;
      title?: string | null;
      patient_name?: string | null;
    };
    const rawReal: Raw[] = (realTodayAppts as any[]).map((a) => ({
      id: a.id,
      start_time: a.start_time,
      end_time: a.end_time,
      appointment_type: a.appointment_type,
      title: a.title,
      patient_name: a.patients?.full_name ? formatLastFirst(a.patients.full_name) : null,
    }));
    const rawDummy: Raw[] = dummies.map((d) => ({
      id: d.id,
      start_time: d.start_time,
      end_time: d.end_time,
      appointment_type: d.appointment_type,
      title: d.title,
      patient_name: d.patient_name ? formatLastFirst(d.patient_name) : null,
    }));
    const combined = [...rawReal, ...rawDummy].sort((a, b) =>
      a.start_time.localeCompare(b.start_time),
    );
    return combined.map((a) => {
      const start = parseISO(a.start_time);
      const end = parseISO(a.end_time);
      const status: ScheduleItem["status"] =
        now >= end ? "completed" : now >= start ? "in_progress" : "upcoming";
      const typeKey = a.appointment_type ?? "consultation";
      const subtitle = APPT_TYPE_LABEL[typeKey] ?? typeKey;
      const name = a.patient_name ?? a.title ?? "Untitled";
      return {
        id: a.id,
        time: format(start, "HH:mm"),
        start,
        end,
        name,
        type: subtitle,
        appointmentType: typeKey,
        status,
      };
    });
  }, [realTodayAppts, today]);


  const statusDot = (status: "upcoming" | "in_progress" | "completed") => {
    if (status === "in_progress") return "bg-success animate-pulse";
    if (status === "completed") return "bg-muted-foreground/40";
    return "bg-muted-foreground/60";
  };
  const statusLabelText = (status: "upcoming" | "in_progress" | "completed") =>
    status === "in_progress" ? "In progress" : status === "completed" ? "Completed" : "Upcoming";

  const ActionRow = ({ task, tone }: { task: Task; tone: "destructive" | "warning" | "muted" }) => {
    const meta = priorityMeta(task.priority);
    const pname = patientName(task.patient_id);
    const role = task.assignee_name?.toLowerCase().includes("nurse") ? "nurse" : "doctor";
    const bg = tone === "destructive" ? "bg-destructive/5 hover:bg-destructive/10 border-destructive"
      : tone === "warning" ? "bg-warning/5 hover:bg-warning/10 border-warning"
      : "bg-muted/40 hover:bg-muted border-muted-foreground/30";
    return (
      <div className={cn("group relative w-full flex items-start gap-2 p-2.5 rounded-md border-l-4 transition-colors", bg)}>
        <button onClick={() => openTask(task)} className="flex-1 text-left flex items-start gap-2 min-w-0">
          <ActorIcon actor={role} />
          <div className="flex-1 min-w-0">
            <p className={cn("text-xs font-medium leading-tight", tone === "muted" && "text-muted-foreground line-through decoration-muted-foreground/40")}>
              {task.title}
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
              {pname && <span className="text-foreground/80 font-medium">{pname}</span>}
              {pname && task.due_date && <span> · </span>}
              {task.due_date && <span>Due {format(new Date(task.due_date), "dd MMM")}</span>}
              {task.assignee_name && <span> · {task.assignee_name}</span>}
            </p>
          </div>
          <span className={cn("h-2 w-2 rounded-full mt-1.5", meta.dot)} />
        </button>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); createTaskFromAction(task); }}
          className="opacity-0 group-hover:opacity-100 transition-opacity inline-flex items-center gap-1 text-[10px] font-medium text-primary hover:underline shrink-0 px-1.5 py-1 rounded"
          aria-label="Assign as new task"
        >
          Assign <ArrowRight className="h-3 w-3" />
        </button>
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-4 h-[calc(100vh-4rem)] min-h-0 overflow-hidden">
      <div className="shrink-0">
        <h1 className="text-2xl font-bold tracking-tight">Good morning, Dr. Laine.</h1>
        <p className="text-muted-foreground">{dateLabel}</p>
      </div>

      {/* Top row: Schedule + Action Centre, share ~55% of remaining height */}
      <div className="grid gap-4 lg:grid-cols-5 flex-[1.1] min-h-0">
        {/* Schedule */}
        <div ref={scheduleRef} className="lg:col-span-3 min-h-0">
          <Card className="h-full flex flex-col">
            <CardHeader className="pb-3 shrink-0">
              <CardTitle className="text-lg flex items-center gap-2">
                <CalendarDays className="h-5 w-5 text-primary" /> Today's Schedule
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 flex-1 min-h-0 overflow-y-auto">
              {todaySchedule.length === 0 && (
                <p className="text-sm text-muted-foreground italic px-1 py-2">No appointments scheduled for today.</p>
              )}
              {todaySchedule.map((appt) => {
                const s = typeStyle(appt.appointmentType);
                return (
                  <div key={appt.id} className={cn("group flex items-center gap-4 p-3 rounded-lg transition-colors hover:brightness-95", s.bg)}>
                    <span className="text-sm font-mono text-muted-foreground w-14 tabular-nums">{appt.time}</span>
                    <span className={cn("h-2.5 w-2.5 rounded-full shrink-0", statusDot(appt.status))} />
                    <div className="flex-1 min-w-0">
                      <button onClick={() => goToPatient(appt.name, "overview")} className="text-sm font-medium hover:underline truncate block text-left">
                        {appt.name}
                      </button>
                      <p className={cn("text-xs truncate font-medium", s.text)}>{s.label}</p>
                    </div>
                    <span className={cn(
                      "text-[11px] font-medium uppercase tracking-wide",
                      appt.status === "in_progress" && "text-success",
                      appt.status === "completed" && "text-muted-foreground",
                      appt.status === "upcoming" && "text-foreground/70",
                    )}>{statusLabelText(appt.status)}</span>
                    <button
                      type="button"
                      onClick={() => createTaskForAppt(appt)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity inline-flex items-center justify-center h-7 w-7 rounded-md text-muted-foreground hover:text-primary hover:bg-background/60"
                      aria-label="Create follow-up task"
                      title="Create follow-up task"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </div>
                );
              })}
            </CardContent>
            <div className="px-6 pb-3 pt-1 shrink-0 border-t border-border/60">
              <Button variant="ghost" size="sm" className="gap-1 text-primary" onClick={() => navigate("/calendar")}>
                View full calendar <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </Card>
        </div>

        {/* Action Centre — driven by live tasks, internal scroll only */}
        <div ref={actionRef} className="lg:col-span-2 min-h-0">
          <Card className="h-full flex flex-col">
            <CardHeader className="pb-3 shrink-0">
              <CardTitle className="text-lg flex items-center gap-2">
                <ClipboardList className="h-5 w-5 text-primary" /> Action Centre
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5 flex-1 min-h-0 overflow-y-auto">
              <Section icon={<AlertTriangle className="h-3 w-3" />} label="Urgent" tone="destructive" count={urgentTasks.length}>
                {urgentTasks.length === 0 ? <Empty text="No urgent tasks" /> : urgentTasks.map((t) => <ActionRow key={t.id} task={t} tone="destructive" />)}
              </Section>
              <Section icon={<Clock className="h-3 w-3" />} label="Pending" tone="warning" count={pendingTasks.length}>
                {pendingTasks.length === 0 ? <Empty text="No pending tasks" /> : pendingTasks.map((t) => <ActionRow key={t.id} task={t} tone="warning" />)}
              </Section>
              <Section icon={<CheckCircle2 className="h-3 w-3" />} label="Completed today" tone="success" count={completedToday.length}>
                {completedToday.length === 0 ? <Empty text="No tasks completed yet" /> : completedToday.map((t) => <ActionRow key={t.id} task={t} tone="muted" />)}
              </Section>
            </CardContent>
            <div className="px-6 pb-3 pt-1 shrink-0 border-t border-border/60">
              <Button variant="ghost" size="sm" className="w-full gap-1 text-primary" onClick={() => navigate("/tasks")}>
                Open all tasks <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </Card>
        </div>
      </div>

      {/* Recent Patient Activity — bottom row, always visible, scrolls internally */}
      <Card className="flex-1 min-h-0 flex flex-col">
        <CardHeader className="pb-3 shrink-0">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" /> Recent Patient Activity
            </CardTitle>
            <Button variant="ghost" size="sm" className="gap-1 text-primary" onClick={() => navigate("/patients")}>
              See all activity <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="flex-1 min-h-0 overflow-y-auto">
          <div className="divide-y divide-border/60">
            {recentActivity.map((a, i) => (
              <button key={i} onClick={() => goToPatient(a.patient, a.section)} className="w-full text-left grid grid-cols-12 gap-3 py-2.5 items-center hover:bg-muted/40 rounded-md px-2 -mx-2 transition-colors">
                <span className="col-span-2 text-xs text-muted-foreground tabular-nums">{a.time}</span>
                <span className="col-span-6 text-sm truncate">{a.event}</span>
                <span className="col-span-2 text-sm font-medium text-primary truncate">{a.patient}</span>
                <span className="col-span-2 flex items-center gap-1.5 text-xs text-muted-foreground truncate justify-end">
                  <Avatar className="h-5 w-5">
                    <AvatarFallback className="text-[9px] bg-primary/10 text-primary">{initialsOf(a.actor)}</AvatarFallback>
                  </Avatar>
                  <span className="truncate">{a.actor}</span>
                </span>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      <TaskDetailPanel
        task={detail}
        patientName={detail ? patientName(detail.patient_id) : null}
        open={open}
        onOpenChange={setOpen}
      />
    </div>
  );
};

function Section({ icon, label, tone, count, children }: { icon: React.ReactNode; label: string; tone: "destructive" | "warning" | "success"; count?: number; children: React.ReactNode }) {
  return (
    <div>
      <p className={cn(
        "section-label mb-2 flex items-center gap-1.5",
        tone === "destructive" && "text-destructive",
        tone === "warning" && "text-warning",
        tone === "success" && "text-success",
      )}>
        {icon} {label}
        {typeof count === "number" && count > 0 && (
          <span className="ml-1 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-muted text-[10px] font-semibold text-foreground/80">
            {count}
          </span>
        )}
      </p>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="text-[11px] text-muted-foreground italic px-1">{text}</p>;
}

export default Dashboard;
