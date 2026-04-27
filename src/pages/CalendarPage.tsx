import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useState, useMemo, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  CalendarDays, Plus, Video, MapPin, Home, UserCheck, FlaskConical,
  Stethoscope, Clock, Play, Pencil, X, ChevronLeft, ChevronRight,
  User, FileText, ExternalLink, StickyNote, Import, Briefcase, CheckSquare, Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AppointmentFormPanel } from "@/components/calendar/AppointmentFormPanel";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, isSameDay, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, startOfWeek, endOfWeek, addMonths, subMonths, isToday, isSameMonth } from "date-fns";
import { toast } from "@/hooks/use-toast";
import { formatLastFirst } from "@/lib/patientName";
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

import { buildDummyAppointments, TYPE_STYLES, typeStyle } from "@/lib/dummyAppointments";


const LEGEND_DOT_COLORS: Record<string, string> = {
  onboarding: "bg-primary",
  acute: "bg-destructive",
  consultation: "bg-purple-500",
  follow_up: "bg-green-500",
  check_up: "bg-yellow-500",
  procedure: "bg-muted-foreground",
  urgent: "bg-destructive",
  working_time: "bg-blue-500",
  doctor_meeting: "bg-teal-500",
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
  const location = useLocation();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [formOpen, setFormOpen] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<any>(null);
  const [prefill, setPrefill] = useState<any>(null);

  // Open form panel pre-filled from navigation state (e.g. task → schedule)
  useEffect(() => {
    const incoming = (location.state as any)?.prefill;
    if (incoming) {
      setPrefill(incoming);
      setFormOpen(true);
      if (incoming.date) {
        const d = new Date(incoming.date);
        if (!isNaN(d.getTime())) {
          setSelectedDate(d);
          setCurrentMonth(d);
        }
      }
      // Clear state so refresh / back doesn't re-trigger
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, location.pathname, navigate]);
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
        patient_name: a.patients?.full_name ? formatLastFirst(a.patients.full_name) : "Unknown",
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



  const openTaskDetail = (t: Task) => { setTaskDetail(t); setTaskPanelOpen(true); };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Calendar</h1>
          <p className="text-muted-foreground">Doctor's schedule overview</p>
        </div>
        {!formOpen && (
          <Button onClick={() => setFormOpen(true)}>
            <Plus className="h-4 w-4 mr-2" /> New Appointment
          </Button>
        )}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-2">
        {Object.entries(TYPE_STYLES).map(([key, s]) => (
          <div key={key} className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-muted text-muted-foreground">
            <div className={`h-2 w-2 rounded-full ${LEGEND_DOT_COLORS[key] || "bg-muted-foreground"}`} />
            {s.label}
          </div>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
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
                const inMonth = isSameMonth(day, currentMonth);
                const selected = isSameDay(day, selectedDate);
                const today = isToday(day);

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
                      {dayAppts.slice(0, 3).map((a: any) => {
                        const s = typeStyle(a.appointment_type ?? (a.is_onboarding ? "onboarding" : "consultation"));
                        const displayName = a.appointment_type === "doctor_meeting"
                          ? (a.title ?? a.other_doctor_name ?? "Doctor Meeting")
                          : (a.patient_name?.split(",")[0] ?? a.title?.split("–")[0]);
                        return (
                          <div key={a.id} className={`text-[10px] leading-tight truncate px-1 py-0.5 rounded ${s.bg} ${s.text}`}>
                            {format(parseISO(a.start_time), "HH:mm")} {displayName}
                          </div>
                        );
                      })}
                      {dayAppts.length > 3 && (
                        <div className="text-[10px] text-muted-foreground px-1">+{dayAppts.length - 3} more</div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Right column: form panel OR day detail (never both) */}
        {formOpen ? (
          <div className="flex flex-col h-[calc(100vh-180px)] min-h-0 xl:sticky xl:top-6">
            <AppointmentFormPanel
              selectedDate={selectedDate}
              editingAppointment={editingAppointment}
              prefill={prefill}
              onClose={() => { setFormOpen(false); setEditingAppointment(null); setPrefill(null); }}
            />
          </div>
        ) : (
        /* Day Detail Sidebar */
        <Card className="h-fit xl:sticky xl:top-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-primary" />
              {format(selectedDate, "EEEE, MMMM d")}
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              {dayAppointments.length} appointment{dayAppointments.length !== 1 ? "s" : ""}
            </p>
          </CardHeader>
          <CardContent>
            <ScrollArea className="max-h-[calc(100vh-280px)]">
              {dayAppointments.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">No appointments scheduled.</p>
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
                          {a.isWorkingTime || a.appointment_type === "doctor_meeting"
                            ? a.title
                            : (a.patient_name ?? a.title)}
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
                          ) : a.appointment_type === "doctor_meeting" ? (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs gap-1"
                              onClick={() => setDetailAppt(a)}
                            >
                              <FileText className="h-3 w-3" />
                              Details
                            </Button>
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
                          {/* Edit / Delete (always shown) */}
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs gap-1"
                            onClick={() => {
                              if (a.isDummy) {
                                toast({ title: "Demo appointments can't be edited — add a real appointment to try this." });
                                return;
                              }
                              setEditingAppointment(a);
                              setFormOpen(true);
                            }}
                          >
                            <Pencil className="h-3 w-3" />
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 text-xs gap-1 text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => {
                              if (a.isDummy) {
                                toast({ title: "Demo appointments can't be edited — add a real appointment to try this." });
                                return;
                              }
                              setCancelId(a.id);
                            }}
                          >
                            <Trash2 className="h-3 w-3" />
                            Delete
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
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
