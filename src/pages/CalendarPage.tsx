import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useState, useMemo, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  CalendarDays, Plus, Video, MapPin, Home, UserCheck, FlaskConical,
  Stethoscope, Clock, Play, Pencil, X, ChevronLeft, ChevronRight,
  User, FileText, ExternalLink, StickyNote, Import, Briefcase, CheckSquare,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AppointmentFormPanel } from "@/components/calendar/AppointmentFormPanel";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, isSameDay, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, startOfWeek, endOfWeek, addMonths, subMonths, isToday, isSameMonth } from "date-fns";
import { toast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { useTasks } from "@/hooks/useTasks";
import { TaskDetailPanel } from "@/components/tasks/TaskDetailPanel";
import { priorityMeta, type Task } from "@/lib/tasks";
import { cn } from "@/lib/utils";

// --- Dummy data ---
const DUMMY_PATIENT_ID = "4d46d1a0-0000-0000-0000-000000000000";

function buildDummyAppointments(month: Date) {
  const y = month.getFullYear();
  const m = month.getMonth();

  const dummies: Array<{ day: number; hour: number; title: string; patient: string; type: string; modality: string; duration: number; notes: string; isWorkingTime?: boolean; importedNoteId?: string }> = [
    { day: 3, hour: 9, title: "Onboarding – Anna Korhonen", patient: "Anna Korhonen", type: "onboarding", modality: "in_person", duration: 60, notes: "New patient intake. Prepare onboarding questionnaire and baseline labs." },
    { day: 3, hour: 11, title: "Acute – Mikko Laine", patient: "Mikko Laine", type: "acute", modality: "in_person", duration: 30, notes: "Acute chest pain, referred from GP. ECG + troponin ordered." },
    { day: 4, hour: 9, title: "Working Time – Documentation", patient: "", type: "working_time", modality: "in_person", duration: 120, notes: "Complete patient documentation and update care plans.", isWorkingTime: true },
    { day: 5, hour: 8, title: "Follow-up – Sarah Johnson", patient: "Sarah Johnson", type: "follow_up", modality: "remote", duration: 30, notes: "Post-statin review. Check LDL levels from last labs." },
    { day: 5, hour: 10, title: "Onboarding – Lars Virtanen", patient: "Lars Virtanen", type: "onboarding", modality: "in_person", duration: 90, notes: "Comprehensive onboarding with full lab panel and genetic screening." },
    { day: 7, hour: 14, title: "Acute – Emma Wilson", patient: "Emma Wilson", type: "acute", modality: "in_person", duration: 30, notes: "Sudden onset vertigo. Neuro screen needed." },
    { day: 8, hour: 13, title: "Working Time – Research", patient: "", type: "working_time", modality: "in_person", duration: 90, notes: "Review latest guidelines for Tier 2 patients.", isWorkingTime: true, importedNoteId: "n2" },
    { day: 10, hour: 9, title: "Check-up – James Brown", patient: "James Brown", type: "check_up", modality: "in_person", duration: 45, notes: "Annual health check. Review cardiovascular risk factors." },
    { day: 10, hour: 13, title: "Consultation – Lisa Chen", patient: "Lisa Chen", type: "consultation", modality: "remote", duration: 30, notes: "Discuss hormone panel results and supplementation plan." },
    { day: 11, hour: 9, title: "Working Time – Meeting Prep", patient: "", type: "working_time", modality: "in_person", duration: 60, notes: "Prepare presentation on complex metabolic syndrome case.", isWorkingTime: true, importedNoteId: "n4" },
    { day: 12, hour: 9, title: "Onboarding – Pekka Mäkelä", patient: "Pekka Mäkelä", type: "onboarding", modality: "in_person", duration: 60, notes: "Executive health programme onboarding. Include body composition analysis." },
    { day: 14, hour: 10, title: "Acute – Mark Davis", patient: "Mark Davis", type: "acute", modality: "in_person", duration: 30, notes: "Acute lower back pain. MRI referral if no improvement." },
    { day: 14, hour: 14, title: "Follow-up – Anna Korhonen", patient: "Anna Korhonen", type: "follow_up", modality: "remote", duration: 30, notes: "2-week post-onboarding follow-up. Review initial lab results." },
    { day: 17, hour: 9, title: "Consultation – Sarah Johnson", patient: "Sarah Johnson", type: "consultation", modality: "in_person", duration: 45, notes: "Nutrition and lifestyle optimization session." },
    { day: 17, hour: 11, title: "Acute – Tiina Heikkinen", patient: "Tiina Heikkinen", type: "acute", modality: "in_person", duration: 30, notes: "Persistent migraine, 3rd episode this month. Consider prophylaxis." },
    { day: 18, hour: 9, title: "Working Time – Admin", patient: "", type: "working_time", modality: "in_person", duration: 120, notes: "Weekly review checklist and clinical hours logging.", isWorkingTime: true, importedNoteId: "n3" },
    { day: 19, hour: 8, title: "Onboarding – Robert Kim", patient: "Robert Kim", type: "onboarding", modality: "in_person", duration: 90, notes: "Full onboarding. Family history of early CVD." },
    { day: 21, hour: 13, title: "Follow-up – Emma Wilson", patient: "Emma Wilson", type: "follow_up", modality: "remote", duration: 30, notes: "Vertigo follow-up. Review ENT specialist report." },
    { day: 24, hour: 9, title: "Check-up – Mikko Laine", patient: "Mikko Laine", type: "check_up", modality: "in_person", duration: 45, notes: "Quarterly metabolic check. HbA1c + lipid panel." },
    { day: 24, hour: 14, title: "Acute – Lars Virtanen", patient: "Lars Virtanen", type: "acute", modality: "in_person", duration: 30, notes: "Skin lesion concern – urgent dermoscopy." },
    { day: 25, hour: 9, title: "Working Time – Conference Notes", patient: "", type: "working_time", modality: "in_person", duration: 90, notes: "Review and summarize conference takeaways.", isWorkingTime: true, importedNoteId: "n6" },
    { day: 26, hour: 10, title: "Consultation – James Brown", patient: "James Brown", type: "consultation", modality: "remote", duration: 30, notes: "Discuss exercise prescription and cardiac rehab progress." },
    { day: 28, hour: 9, title: "Onboarding – Maria Santos", patient: "Maria Santos", type: "onboarding", modality: "in_person", duration: 60, notes: "New patient from referral. Extensive GI history." },
    { day: 28, hour: 14, title: "Acute – Pekka Mäkelä", patient: "Pekka Mäkelä", type: "acute", modality: "in_person", duration: 30, notes: "Elevated liver enzymes on routine labs. Urgent hepatology review." },
  ];

  return dummies
    .filter(d => d.day <= new Date(y, m + 1, 0).getDate())
    .map((d, i) => {
      const start = new Date(y, m, d.day, d.hour, 0);
      const end = new Date(start.getTime() + d.duration * 60000);
      return {
        id: `dummy-${i}`,
        title: d.title,
        patient_name: d.patient || undefined,
        patient_id: d.isWorkingTime ? undefined : DUMMY_PATIENT_ID,
        appointment_type: d.type,
        start_time: start.toISOString(),
        end_time: end.toISOString(),
        visit_modality: d.modality,
        is_onboarding: d.type === "onboarding",
        is_home_visit: false,
        is_nurse_visit: false,
        is_labs: d.type === "onboarding",
        is_external_specialist: false,
        notes: d.notes,
        isDummy: true,
        isWorkingTime: !!d.isWorkingTime,
        importedNoteId: d.importedNoteId || null,
      };
    });
}

const TYPE_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  onboarding: { bg: "bg-primary/10", text: "text-primary", label: "Onboarding" },
  acute: { bg: "bg-destructive/10", text: "text-destructive", label: "Acute" },
  consultation: { bg: "bg-accent/60", text: "text-accent-foreground", label: "Consultation" },
  follow_up: { bg: "bg-success/10", text: "text-success", label: "Follow-up" },
  check_up: { bg: "bg-warning/10", text: "text-warning", label: "Check-up" },
  procedure: { bg: "bg-secondary", text: "text-secondary-foreground", label: "Procedure" },
  urgent: { bg: "bg-destructive/10", text: "text-destructive", label: "Urgent" },
  working_time: { bg: "bg-blue-500/10", text: "text-blue-600", label: "Working Time" },
};

const MOCK_NOTES = [
  { id: "n1", title: "Meeting notes - Dr. Patel", content: "Discussed patient referral workflow and new onboarding procedures. Need to follow up on digital forms integration." },
  { id: "n2", title: "Research: New treatment protocols", content: "Review latest guidelines for Tier 2 patients regarding cardiovascular risk reduction. Update care plans accordingly." },
  { id: "n3", title: "Weekly review checklist", content: "1. Review lab results 2. Update patient records 3. Follow-up calls 4. Prepare reports for Friday meeting." },
  { id: "n4", title: "Case discussion prep", content: "Prepare presentation on complex metabolic syndrome case for team case discussion on Thursday." },
];

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const CalendarPage = () => {
  const navigate = useNavigate();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [formOpen, setFormOpen] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<any>(null);
  const [cancelId, setCancelId] = useState<string | null>(null);
  const [detailAppt, setDetailAppt] = useState<any>(null);
  const [importNoteAppt, setImportNoteAppt] = useState<any>(null);
  const [taskDetail, setTaskDetail] = useState<Task | null>(null);
  const [taskPanelOpen, setTaskPanelOpen] = useState(false);
  const queryClient = useQueryClient();

  const { tasks, patientName } = useTasks();

  const cancelMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("appointments").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      toast({ title: "Appointment cancelled" });
      setCancelId(null);
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const { data: realAppointments = [] } = useQuery({
    queryKey: ["appointments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("appointments")
        .select("*, patients(full_name)")
        .order("start_time", { ascending: true });
      if (error) throw error;
      return data.map((a: any) => ({
        ...a,
        patient_name: a.patients?.full_name ?? "Unknown",
        isDummy: false,
      }));
    },
  });

  const dummyAppointments = useMemo(() => buildDummyAppointments(currentMonth), [currentMonth]);
  const allAppointments = [...realAppointments, ...dummyAppointments];

  // Calendar grid
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const apptsByDay = useMemo(() => {
    const map = new Map<string, any[]>();
    allAppointments.forEach((a) => {
      const key = format(parseISO(a.start_time), "yyyy-MM-dd");
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(a);
    });
    // Sort each day by time
    map.forEach((arr) => arr.sort((a: any, b: any) => a.start_time.localeCompare(b.start_time)));
    return map;
  }, [allAppointments]);

  const selectedDayKey = format(selectedDate, "yyyy-MM-dd");
  const dayAppointments = apptsByDay.get(selectedDayKey) ?? [];

  const tasksByDay = useMemo(() => {
    const map = new Map<string, Task[]>();
    tasks.forEach((t) => {
      if (!t.due_date) return;
      const key = t.due_date.slice(0, 10);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(t);
    });
    return map;
  }, [tasks]);
  const dayTasks = tasksByDay.get(selectedDayKey) ?? [];

  const typeStyle = (type: string) => TYPE_STYLES[type] ?? TYPE_STYLES.consultation;

  const openTaskDetail = (t: Task) => { setTaskDetail(t); setTaskPanelOpen(true); };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Calendar</h1>
          <p className="text-muted-foreground">Doctor's schedule overview</p>
        </div>
        <Button onClick={() => setFormOpen(true)}>
          <Plus className="h-4 w-4 mr-2" /> New Appointment
        </Button>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-2">
        {Object.entries(TYPE_STYLES).map(([key, s]) => (
          <div key={key} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${s.bg} ${s.text}`}>
            <div className={`h-2 w-2 rounded-full ${s.text === "text-primary" ? "bg-primary" : s.text === "text-destructive" ? "bg-destructive" : s.text === "text-success" ? "bg-green-500" : s.text === "text-warning" ? "bg-yellow-500" : "bg-muted-foreground"}`} />
            {s.label}
          </div>
        ))}
      </div>

      <div className={cn("grid gap-6", formOpen ? "xl:grid-cols-[1fr_360px_380px]" : "xl:grid-cols-[1fr_380px]")}>
        {/* Month Grid */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <CardTitle className="text-lg">
                {format(currentMonth, "MMMM yyyy")}
              </CardTitle>
              <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="px-3 pb-3">
            {/* Weekday headers */}
            <div className="grid grid-cols-7 mb-1">
              {WEEKDAYS.map((d) => (
                <div key={d} className="text-center text-xs font-medium text-muted-foreground py-1">{d}</div>
              ))}
            </div>
            {/* Day cells */}
            <div className="grid grid-cols-7 gap-px bg-border rounded-lg overflow-hidden">
              {calendarDays.map((day) => {
                const key = format(day, "yyyy-MM-dd");
                const dayAppts = apptsByDay.get(key) ?? [];
                const dayTaskList = tasksByDay.get(key) ?? [];
                const inMonth = isSameMonth(day, currentMonth);
                const selected = isSameDay(day, selectedDate);
                const today = isToday(day);
                const totalItems = dayAppts.length + dayTaskList.length;

                return (
                  <button
                    key={key}
                    onClick={() => setSelectedDate(day)}
                    className={`min-h-[80px] p-1 flex flex-col items-start text-left transition-colors
                      ${inMonth ? "bg-card" : "bg-muted/30"}
                      ${selected ? "ring-2 ring-primary ring-inset" : ""}
                      hover:bg-accent/30`}
                  >
                    <span className={`text-xs font-medium mb-0.5 px-1 rounded-full
                      ${today ? "bg-primary text-primary-foreground" : inMonth ? "text-foreground" : "text-muted-foreground"}`}>
                      {format(day, "d")}
                    </span>
                    <div className="w-full space-y-0.5 overflow-hidden">
                      {dayAppts.slice(0, 2).map((a: any) => {
                        const s = typeStyle(a.appointment_type ?? (a.is_onboarding ? "onboarding" : "consultation"));
                        return (
                          <div key={a.id} className={`text-[10px] leading-tight truncate px-1 py-0.5 rounded ${s.bg} ${s.text}`}>
                            {format(parseISO(a.start_time), "HH:mm")} {a.patient_name?.split(" ")[0] ?? a.title.split("–")[0]}
                          </div>
                        );
                      })}
                      {dayTaskList.slice(0, 2).map((t) => {
                        const meta = priorityMeta(t.priority);
                        const done = t.status === "done";
                        return (
                          <div
                            key={t.id}
                            className={cn(
                              "text-[10px] leading-tight truncate px-1 py-0.5 rounded border border-dashed flex items-center gap-1",
                              done ? "border-muted-foreground/30 text-muted-foreground line-through" : "border-primary/40 bg-primary/5 text-foreground",
                            )}
                          >
                            <CheckSquare className="h-2.5 w-2.5 shrink-0" />
                            <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", meta.dot)} />
                            <span className="truncate">{t.title}</span>
                          </div>
                        );
                      })}
                      {totalItems > 4 && (
                        <div className="text-[10px] text-muted-foreground px-1">+{totalItems - 4} more</div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Day Detail Sidebar */}
        <Card className="h-fit xl:sticky xl:top-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-primary" />
              {format(selectedDate, "EEEE, MMMM d")}
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              {dayAppointments.length} appointment{dayAppointments.length !== 1 ? "s" : ""}
              {dayTasks.length > 0 && ` · ${dayTasks.length} task${dayTasks.length === 1 ? "" : "s"}`}
            </p>
          </CardHeader>
          <CardContent>
            <ScrollArea className="max-h-[calc(100vh-280px)]">
              {dayAppointments.length === 0 && dayTasks.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">No appointments or tasks scheduled.</p>
              ) : dayAppointments.length === 0 ? (
                <p className="text-xs text-muted-foreground italic px-1">No appointments.</p>
              ) : (
                <div className="space-y-3">
                  {dayAppointments.map((a: any) => {
                    const s = typeStyle(a.appointment_type ?? (a.is_onboarding ? "onboarding" : "consultation"));
                    return (
                      <div key={a.id} className={`rounded-lg border p-3 space-y-2 ${s.bg} border-transparent`}>
                        {/* Time & type */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Clock className={`h-3.5 w-3.5 ${s.text}`} />
                            <span className="text-sm font-mono font-medium">
                              {format(parseISO(a.start_time), "HH:mm")}–{format(parseISO(a.end_time), "HH:mm")}
                            </span>
                          </div>
                          <Badge variant="outline" className={`text-[10px] ${s.text} border-current`}>
                            {s.label}
                          </Badge>
                        </div>

                        {/* Title */}
                        <p className="text-sm font-semibold">
                          {a.isWorkingTime ? a.title : (a.patient_name ?? a.title)}
                        </p>

                        {/* Modality badges */}
                        {!a.isWorkingTime && (
                          <div className="flex flex-wrap gap-1">
                            {a.visit_modality === "remote" ? (
                              <Badge variant="secondary" className="text-[10px] gap-1"><Video className="h-3 w-3" /> Remote</Badge>
                            ) : a.is_home_visit ? (
                              <Badge variant="secondary" className="text-[10px] gap-1"><Home className="h-3 w-3" /> Home</Badge>
                            ) : (
                              <Badge variant="secondary" className="text-[10px] gap-1"><MapPin className="h-3 w-3" /> In-Person</Badge>
                            )}
                            {a.is_labs && <Badge variant="secondary" className="text-[10px] gap-1"><FlaskConical className="h-3 w-3" /> Labs</Badge>}
                            {a.is_nurse_visit && <Badge variant="secondary" className="text-[10px] gap-1"><UserCheck className="h-3 w-3" /> Nurse</Badge>}
                          </div>
                        )}

                        {/* Imported note content */}
                        {a.isWorkingTime && a.importedNoteId && (() => {
                          const note = MOCK_NOTES.find(n => n.id === a.importedNoteId);
                          return note ? (
                            <div className="rounded-md border border-border bg-background/60 p-2.5 space-y-1">
                              <div className="flex items-center gap-1.5">
                                <StickyNote className="h-3 w-3 text-primary" />
                                <span className="text-xs font-medium">{note.title}</span>
                              </div>
                              <p className="text-xs text-muted-foreground whitespace-pre-line line-clamp-4">{note.content}</p>
                            </div>
                          ) : (
                            <Badge variant="secondary" className="text-[10px] gap-1">
                              <StickyNote className="h-3 w-3" /> Note imported
                            </Badge>
                          );
                        })()}

                        {/* Notes preview */}
                        {a.notes && (
                          <p className="text-xs text-muted-foreground line-clamp-2">{a.notes}</p>
                        )}

                        {/* Action buttons */}
                        <Separator />
                        <div className="flex items-center gap-1 flex-wrap">
                          {a.isWorkingTime ? (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs gap-1"
                                onClick={() => setDetailAppt(a)}
                              >
                                <FileText className="h-3 w-3" />
                                Details
                              </Button>
                              <Button
                                size="sm"
                                className="h-7 text-xs gap-1"
                                onClick={() => setImportNoteAppt(a)}
                              >
                                <Import className="h-3 w-3" />
                                Import Note
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button
                                size="sm"
                                className="h-7 text-xs gap-1"
                                onClick={() => {
                                  if (!a.isDummy) navigate(`/patients/${a.patient_id}`);
                                  else toast({ title: "Demo mode", description: "This is a demo appointment." });
                                }}
                              >
                                <Play className="h-3 w-3" />
                                Start Consultation
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs gap-1"
                                onClick={() => setDetailAppt(a)}
                              >
                                <FileText className="h-3 w-3" />
                                Details
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 text-xs gap-1"
                                onClick={() => {
                                  if (!a.isDummy) navigate(`/patients/${a.patient_id}`);
                                  else toast({ title: "Demo mode", description: "This is a demo appointment." });
                                }}
                              >
                                <User className="h-3 w-3" />
                                Profile
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {dayTasks.length > 0 && (
                <div className="mt-4 pt-4 border-t space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
                    <CheckSquare className="h-3 w-3" /> Tasks due
                  </p>
                  {dayTasks.map((t) => {
                    const meta = priorityMeta(t.priority);
                    const done = t.status === "done";
                    const pname = patientName(t.patient_id);
                    return (
                      <button
                        key={t.id}
                        onClick={() => openTaskDetail(t)}
                        className={cn(
                          "w-full text-left rounded-lg border border-dashed p-2.5 space-y-1 transition-colors hover:bg-muted/40",
                          done ? "border-muted-foreground/30 opacity-70" : "border-primary/40 bg-primary/5",
                        )}
                      >
                        <div className="flex items-center gap-2">
                          <CheckSquare className={cn("h-3.5 w-3.5 shrink-0", done && "text-muted-foreground")} />
                          <span className={cn("h-2 w-2 rounded-full shrink-0", meta.dot)} />
                          <p className={cn("text-sm font-medium flex-1 truncate", done && "line-through text-muted-foreground")}>
                            {t.title}
                          </p>
                        </div>
                        <p className="text-[11px] text-muted-foreground pl-6 truncate">
                          {pname && <span className="font-medium text-foreground/80">{pname}</span>}
                          {pname && t.assignee_name && " · "}
                          {t.assignee_name}
                        </p>
                      </button>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* New Appointment Form Panel */}
        {formOpen && (
          <AppointmentFormPanel
            selectedDate={selectedDate}
            editingAppointment={editingAppointment}
            onClose={() => { setFormOpen(false); setEditingAppointment(null); }}
          />
        )}
      </div>

      <TaskDetailPanel
        task={taskDetail}
        patientName={taskDetail ? patientName(taskDetail.patient_id) : null}
        open={taskPanelOpen}
        onOpenChange={setTaskPanelOpen}
      />

      {/* Appointment Detail Dialog */}
      <Dialog open={!!detailAppt} onOpenChange={(open) => !open && setDetailAppt(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Stethoscope className="h-5 w-5 text-primary" />
              Appointment Details
            </DialogTitle>
          </DialogHeader>
          {detailAppt && (() => {
            const s = typeStyle(detailAppt.appointment_type ?? (detailAppt.is_onboarding ? "onboarding" : "consultation"));
            return (
              <div className="space-y-4">
                <div className="space-y-1">
                  <p className="text-lg font-semibold">{detailAppt.patient_name ?? detailAppt.title}</p>
                  <Badge className={`${s.bg} ${s.text} border-0`}>{s.label}</Badge>
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-muted-foreground text-xs">Date</p>
                    <p className="font-medium">{format(parseISO(detailAppt.start_time), "EEEE, MMM d, yyyy")}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Time</p>
                    <p className="font-medium">{format(parseISO(detailAppt.start_time), "HH:mm")} – {format(parseISO(detailAppt.end_time), "HH:mm")}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Modality</p>
                    <p className="font-medium capitalize">{detailAppt.visit_modality?.replace("_", " ") ?? "In-person"}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Labs</p>
                    <p className="font-medium">{detailAppt.is_labs ? "Yes" : "No"}</p>
                  </div>
                </div>

                {detailAppt.notes && (
                  <div>
                    <p className="text-muted-foreground text-xs mb-1">Notes</p>
                    <p className="text-sm bg-muted/50 rounded-md p-3">{detailAppt.notes}</p>
                  </div>
                )}

                <Separator />
                <div className="flex gap-2">
                  {detailAppt.isWorkingTime ? (
                    <Button
                      className="flex-1 gap-1"
                      onClick={() => {
                        setDetailAppt(null);
                        setImportNoteAppt(detailAppt);
                      }}
                    >
                      <Import className="h-4 w-4" />
                      Import Note
                    </Button>
                  ) : (
                    <>
                      <Button
                        className="flex-1 gap-1"
                        onClick={() => {
                          setDetailAppt(null);
                          if (!detailAppt.isDummy) navigate(`/patients/${detailAppt.patient_id}`);
                          else toast({ title: "Demo mode", description: "This is a demo appointment." });
                        }}
                      >
                        <Play className="h-4 w-4" />
                        Start Consultation
                      </Button>
                      <Button
                        variant="outline"
                        className="gap-1"
                        onClick={() => {
                          setDetailAppt(null);
                          if (!detailAppt.isDummy) navigate(`/patients/${detailAppt.patient_id}`);
                          else toast({ title: "Demo mode", description: "This is a demo appointment." });
                        }}
                      >
                        <ExternalLink className="h-4 w-4" />
                        Patient Profile
                      </Button>
                    </>
                  )}
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Appointment form panel rendered inside the grid below — no dialog */}

      <AlertDialog open={!!cancelId} onOpenChange={(open) => !open && setCancelId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel appointment?</AlertDialogTitle>
            <AlertDialogDescription>This will permanently remove this appointment.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep</AlertDialogCancel>
            <AlertDialogAction onClick={() => cancelId && cancelMutation.mutate(cancelId)}>Cancel Appointment</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Import Note Dialog */}
      <Dialog open={!!importNoteAppt} onOpenChange={(open) => !open && setImportNoteAppt(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Import className="h-5 w-5 text-primary" />
              Import Note to Working Time
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Select a note to attach to this working time block. The note content will be imported into the appointment notes.
          </p>
          <div className="space-y-2 max-h-[300px] overflow-y-auto">
            {MOCK_NOTES.map((note) => (
              <button
                key={note.id}
                className="w-full text-left rounded-lg border p-3 hover:border-primary transition-colors space-y-1"
                onClick={() => {
                  toast({
                    title: "Note imported",
                    description: `"${note.title}" has been attached to this working time block.`,
                  });
                  setImportNoteAppt(null);
                }}
              >
                <div className="flex items-center gap-2">
                  <StickyNote className="h-3.5 w-3.5 text-primary shrink-0" />
                  <p className="text-sm font-medium truncate">{note.title}</p>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2 pl-5">{note.content}</p>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CalendarPage;
