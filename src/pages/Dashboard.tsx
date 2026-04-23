import { useEffect, useRef, useState } from "react";
import {
  CalendarDays,
  AlertTriangle,
  Users,
  Pill,
  ArrowRight,
  Stethoscope,
  UserRound,
  HeartPulse,
  FileText,
  ClipboardList,
  CheckCircle2,
  Clock,
  Activity,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

type PatientLite = { id: string; full_name: string };

const todaySchedule = [
  { time: "08:30", name: "Carter, Jay-Z", type: "Annual review", status: "completed" as const },
  { time: "09:30", name: "Johnson, Sarah", type: "Follow-up", status: "completed" as const },
  { time: "11:00", name: "Mäkinen, Aino", type: "Consultation", status: "in_progress" as const },
  { time: "13:00", name: "Eriksson, Marcus", type: "Lab review", status: "upcoming" as const },
  { time: "14:30", name: "Korhonen, Elena", type: "Urgent consultation", status: "upcoming" as const },
  { time: "15:30", name: "Bergström, Thomas", type: "Check-up", status: "upcoming" as const },
];

const urgentItems = [
  {
    title: "Warfarin × Ibuprofen SEVERE interaction",
    patient: "Carter, Jay-Z",
    meta: "Unresolved",
    actor: "system",
    section: "medications" as const,
  },
  {
    title: "Metformin supply critical (3%)",
    patient: "Carter, Jay-Z",
    meta: "Renewal needed",
    actor: "system",
    section: "medications" as const,
  },
  {
    title: "New lab results uploaded",
    patient: "Korhonen, Elena",
    meta: "Review requested",
    actor: "lab",
    section: "health-data" as const,
  },
];

const pendingItems = [
  {
    title: "Referral letter drafted",
    patient: "Mäkinen, Aino",
    meta: "Awaiting doctor sign-off",
    actor: "doctor",
    section: "overview" as const,
  },
  {
    title: "Care plan updated",
    patient: "Carter, Jay-Z",
    meta: "Nurse Mäkinen — Awaiting review",
    actor: "nurse",
    section: "overview" as const,
  },
  {
    title: "Prescription renewal request",
    patient: "Bergström, Thomas",
    meta: "Submitted by patient",
    actor: "patient",
    section: "medications" as const,
  },
];

const completedItems = [
  {
    title: "Annual review notes saved",
    patient: "Carter, Jay-Z",
    meta: "Dr. Laine — 08:45",
    actor: "doctor",
    section: "visits" as const,
  },
  {
    title: "Follow-up summary sent",
    patient: "Johnson, Sarah",
    meta: "Dr. Laine — 10:15",
    actor: "doctor",
    section: "visits" as const,
  },
];

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
    doctor: { icon: Stethoscope, cls: "bg-primary/10 text-primary" },
    nurse: { icon: HeartPulse, cls: "bg-success/10 text-success" },
    patient: { icon: UserRound, cls: "bg-warning/10 text-warning" },
    system: { icon: Activity, cls: "bg-muted text-muted-foreground" },
    lab: { icon: FileText, cls: "bg-muted text-muted-foreground" },
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

  useEffect(() => {
    supabase
      .from("patients")
      .select("id, full_name")
      .then(({ data }) => setPatients(data ?? []));
  }, []);

  const today = new Date();
  const dateLabel = today.toLocaleDateString(undefined, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const findPatient = (display: string) => {
    // display like "Carter, Jay-Z" → tokens "Carter" + "Jay-Z"
    const [last, first] = display.split(",").map((s) => s.trim());
    const tokens = [last, first].filter(Boolean).map((s) => s.toLowerCase());
    return patients.find((p) => {
      const n = p.full_name.toLowerCase();
      return tokens.every((t) => n.includes(t));
    });
  };

  const goToPatient = (display: string, tab?: string) => {
    const p = findPatient(display);
    if (p) {
      navigate(`/patients/${p.id}${tab ? `?tab=${tab}` : ""}`);
    } else {
      navigate("/patients");
    }
  };

  const scrollTo = (ref: React.RefObject<HTMLDivElement>) => {
    ref.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const stats = [
    {
      title: "Today's Appointments",
      value: "5",
      icon: CalendarDays,
      tone: "text-primary",
      onClick: () => scrollTo(scheduleRef),
    },
    {
      title: "Urgent Tasks",
      value: "3",
      icon: AlertTriangle,
      tone: "text-destructive",
      onClick: () => scrollTo(actionRef),
    },
    {
      title: "Patients with Active Alerts",
      value: "4",
      icon: Users,
      tone: "text-warning",
      onClick: () => navigate("/patients?filter=alerts"),
    },
    {
      title: "Pending Prescription Renewals",
      value: "2",
      icon: Pill,
      tone: "text-success",
      onClick: () => navigate("/patients?filter=renewals"),
    },
  ];

  const statusDot = (status: "upcoming" | "in_progress" | "completed") => {
    if (status === "in_progress") return "bg-success animate-pulse";
    if (status === "completed") return "bg-muted-foreground/40";
    return "bg-muted-foreground/60";
  };

  const statusLabel = (status: "upcoming" | "in_progress" | "completed") =>
    status === "in_progress" ? "In progress" : status === "completed" ? "Completed" : "Upcoming";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Good morning, Dr. Laine.</h1>
        <p className="text-muted-foreground">{dateLabel}</p>
      </div>

      {/* Stat cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <button
            key={s.title}
            onClick={s.onClick}
            className="text-left transition hover:-translate-y-0.5"
          >
            <Card className="hover:shadow-card-hover transition-shadow">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">{s.title}</p>
                    <p className="text-3xl font-bold mt-1">{s.value}</p>
                  </div>
                  <s.icon className={cn("h-9 w-9 opacity-80", s.tone)} />
                </div>
              </CardContent>
            </Card>
          </button>
        ))}
      </div>

      {/* Schedule + Action Centre */}
      <div className="grid gap-6 lg:grid-cols-5">
        {/* Today's Schedule (60%) */}
        <div ref={scheduleRef} className="lg:col-span-3">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <CalendarDays className="h-5 w-5 text-primary" />
                Today's Schedule
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {todaySchedule.map((appt) => (
                <div
                  key={`${appt.time}-${appt.name}`}
                  className="flex items-center gap-4 p-3 rounded-lg bg-muted/40 hover:bg-muted transition-colors"
                >
                  <span className="text-sm font-mono text-muted-foreground w-14 tabular-nums">{appt.time}</span>
                  <span className={cn("h-2.5 w-2.5 rounded-full shrink-0", statusDot(appt.status))} />
                  <div className="flex-1 min-w-0">
                    <button
                      onClick={() => goToPatient(appt.name, "overview")}
                      className="text-sm font-medium hover:text-primary hover:underline truncate block text-left"
                    >
                      {appt.name}
                    </button>
                    <p className="text-xs text-muted-foreground truncate">{appt.type}</p>
                  </div>
                  <span
                    className={cn(
                      "text-[11px] font-medium uppercase tracking-wide",
                      appt.status === "in_progress" && "text-success",
                      appt.status === "completed" && "text-muted-foreground",
                      appt.status === "upcoming" && "text-foreground/70",
                    )}
                  >
                    {statusLabel(appt.status)}
                  </span>
                </div>
              ))}
              <div className="pt-2">
                <Button variant="ghost" size="sm" className="gap-1 text-primary" onClick={() => navigate("/calendar")}>
                  View full calendar <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Action Centre (40%) */}
        <div ref={actionRef} className="lg:col-span-2">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <ClipboardList className="h-5 w-5 text-primary" />
                Action Centre
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Urgent */}
              <div>
                <p className="section-label mb-2 flex items-center gap-1.5 text-destructive">
                  <AlertTriangle className="h-3 w-3" /> Urgent
                </p>
                <div className="space-y-2">
                  {urgentItems.map((item, i) => (
                    <button
                      key={i}
                      onClick={() => goToPatient(item.patient, item.section)}
                      className="w-full text-left flex items-start gap-2 p-2.5 rounded-md bg-destructive/5 border-l-4 border-destructive hover:bg-destructive/10 transition-colors"
                    >
                      <ActorIcon actor={item.actor} />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium leading-tight">{item.title}</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
                          <span className="text-foreground/80 font-medium">{item.patient}</span> · {item.meta}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Pending */}
              <div>
                <p className="section-label mb-2 flex items-center gap-1.5 text-warning">
                  <Clock className="h-3 w-3" /> Pending
                </p>
                <div className="space-y-2">
                  {pendingItems.map((item, i) => (
                    <button
                      key={i}
                      onClick={() => goToPatient(item.patient, item.section)}
                      className="w-full text-left flex items-start gap-2 p-2.5 rounded-md bg-warning/5 border-l-4 border-warning hover:bg-warning/10 transition-colors"
                    >
                      <ActorIcon actor={item.actor} />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium leading-tight">{item.title}</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
                          <span className="text-foreground/80 font-medium">{item.patient}</span> · {item.meta}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Completed today */}
              <div>
                <p className="section-label mb-2 flex items-center gap-1.5 text-success">
                  <CheckCircle2 className="h-3 w-3" /> Completed today
                </p>
                <div className="space-y-2">
                  {completedItems.map((item, i) => (
                    <button
                      key={i}
                      onClick={() => goToPatient(item.patient, item.section)}
                      className="w-full text-left flex items-start gap-2 p-2.5 rounded-md bg-muted/40 border-l-4 border-muted-foreground/30 hover:bg-muted transition-colors"
                    >
                      <ActorIcon actor={item.actor} />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium leading-tight text-muted-foreground line-through decoration-muted-foreground/40">
                          {item.title}
                        </p>
                        <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
                          <span className="text-foreground/70 font-medium">{item.patient}</span> · {item.meta}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Recent Patient Activity */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              Recent Patient Activity
            </CardTitle>
            <Button variant="ghost" size="sm" className="gap-1 text-primary" onClick={() => navigate("/patients")}>
              See all activity <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="divide-y divide-border/60">
            {recentActivity.map((a, i) => (
              <button
                key={i}
                onClick={() => goToPatient(a.patient, a.section)}
                className="w-full text-left grid grid-cols-12 gap-3 py-2.5 items-center hover:bg-muted/40 rounded-md px-2 -mx-2 transition-colors"
              >
                <span className="col-span-2 text-xs text-muted-foreground tabular-nums">{a.time}</span>
                <span className="col-span-6 text-sm truncate">{a.event}</span>
                <span className="col-span-2 text-sm font-medium text-primary truncate">{a.patient}</span>
                <span className="col-span-2 flex items-center gap-1.5 text-xs text-muted-foreground truncate justify-end">
                  <Avatar className="h-5 w-5">
                    <AvatarFallback className="text-[9px] bg-primary/10 text-primary">
                      {initialsOf(a.actor)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="truncate">{a.actor}</span>
                </span>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;
