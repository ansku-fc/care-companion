import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { useState } from "react";
import { CalendarDays, Plus, Video, MapPin, Home, UserCheck, FlaskConical, Stethoscope, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AddAppointmentDialog } from "@/components/calendar/AddAppointmentDialog";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, isSameDay, parseISO } from "date-fns";

const CalendarPage = () => {
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: appointments = [] } = useQuery({
    queryKey: ["appointments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("appointments")
        .select("*, patients(full_name)")
        .order("start_time", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const dayAppointments = appointments.filter((a) =>
    date && isSameDay(parseISO(a.start_time), date)
  );

  // Highlight dates with appointments
  const appointmentDates = appointments.map((a) => parseISO(a.start_time));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Calendar</h1>
          <p className="text-muted-foreground">Manage your appointments and schedule.</p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" /> New Appointment
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <CalendarDays className="h-5 w-5 text-primary" />
              Schedule
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Calendar
              mode="single"
              selected={date}
              onSelect={setDate}
              className="rounded-md border w-full"
              modifiers={{ hasAppointment: appointmentDates }}
              modifiersClassNames={{ hasAppointment: "bg-primary/10 font-semibold" }}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              {date?.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {dayAppointments.length === 0 ? (
              <p className="text-sm text-muted-foreground">No appointments for this day.</p>
            ) : (
              dayAppointments.map((a) => (
                <div key={a.id} className="border rounded-lg p-3 space-y-2">
                  <div className="flex items-start justify-between">
                    <p className="font-medium text-sm">{a.title}</p>
                  </div>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {format(parseISO(a.start_time), "h:mm a")} — {format(parseISO(a.end_time), "h:mm a")}
                  </p>
                  {a.patients && (
                    <p className="text-xs text-muted-foreground">
                      Patient: {(a.patients as any).full_name}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-1">
                    {a.visit_modality === "remote" ? (
                      <Badge variant="secondary" className="text-xs gap-1"><Video className="h-3 w-3" /> Remote</Badge>
                    ) : a.is_home_visit ? (
                      <Badge variant="secondary" className="text-xs gap-1"><Home className="h-3 w-3" /> Home</Badge>
                    ) : (
                      <Badge variant="secondary" className="text-xs gap-1"><MapPin className="h-3 w-3" /> In-Person</Badge>
                    )}
                    {a.is_onboarding && <Badge variant="outline" className="text-xs">Onboarding</Badge>}
                    {a.is_nurse_visit && <Badge variant="outline" className="text-xs gap-1"><UserCheck className="h-3 w-3" /> Nurse</Badge>}
                    {a.is_labs && <Badge variant="outline" className="text-xs gap-1"><FlaskConical className="h-3 w-3" /> Labs</Badge>}
                    {a.is_external_specialist && (
                      <Badge variant="outline" className="text-xs gap-1">
                        <Stethoscope className="h-3 w-3" />
                        {a.specialist_name}{a.specialist_location ? ` @ ${a.specialist_location}` : ""}
                      </Badge>
                    )}
                  </div>
                  {a.notes && (
                    <p className="text-xs text-muted-foreground whitespace-pre-line mt-1">{a.notes}</p>
                  )}
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <AddAppointmentDialog open={dialogOpen} onOpenChange={setDialogOpen} selectedDate={date} />
    </div>
  );
};

export default CalendarPage;
