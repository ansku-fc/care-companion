import { CalendarDays, ListTodo, Users, Clock, StickyNote, ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const overviewCards = [
  { title: "Today's Appointments", value: "5", icon: CalendarDays, color: "text-primary" },
  { title: "Pending Tasks", value: "12", icon: ListTodo, color: "text-warning" },
  { title: "Total Patients", value: "48", icon: Users, color: "text-success" },
];

const clinicalHoursData = [
  { tier: "Tier 1", hours: 3.5, target: 8 },
  { tier: "Tier 2", hours: 2, target: 6 },
  { tier: "Tier 3", hours: 1.5, target: 4 },
  { tier: "Tier 4", hours: 0.5, target: 2 },
  { tier: "Children", hours: 2, target: 4 },
  { tier: "Onboarding", hours: 1, target: 3 },
  { tier: "Acute", hours: 0, target: 2 },
  { tier: "Case Mgmt", hours: 1.5, target: 3 },
];

const todaySchedule = [
  { time: "09:00", patient: "Sarah Johnson", type: "Consultation", typeColor: "bg-primary" },
  { time: "10:00", patient: "Mark Davis", type: "Follow-up", typeColor: "bg-success" },
  { time: "11:30", patient: "Emma Wilson", type: "Check-up", typeColor: "bg-warning" },
  { time: "14:00", patient: "James Brown", type: "Procedure", typeColor: "bg-destructive" },
  { time: "15:30", patient: "Lisa Chen", type: "Consultation", typeColor: "bg-primary" },
];

const Dashboard = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">Welcome back. Here's your overview for today.</p>
      </div>

      {/* Overview Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        {overviewCards.map((card) => (
          <Card key={card.title}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{card.title}</p>
                  <p className="text-3xl font-bold mt-1">{card.value}</p>
                </div>
                <card.icon className={`h-10 w-10 ${card.color} opacity-80`} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Today's Schedule */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <CalendarDays className="h-5 w-5 text-primary" />
              Today's Schedule
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {todaySchedule.map((item, i) => (
              <div key={i} className="flex items-center gap-4 p-3 rounded-lg bg-muted/50">
                <span className="text-sm font-mono text-muted-foreground w-12">{item.time}</span>
                <div className={`h-2 w-2 rounded-full ${item.typeColor}`} />
                <div className="flex-1">
                  <p className="text-sm font-medium">{item.patient}</p>
                  <p className="text-xs text-muted-foreground">{item.type}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Clinical Hours */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              Clinical Hours Today
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {clinicalHoursData.map((item) => (
              <div key={item.tier} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span>{item.tier}</span>
                  <span className="text-muted-foreground">{item.hours}h / {item.target}h</span>
                </div>
                <Progress value={(item.hours / item.target) * 100} className="h-2" />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
