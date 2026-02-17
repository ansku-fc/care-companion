import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ListTodo } from "lucide-react";

const taskCategories = [
  { key: "clinical_review", label: "Clinical Review & Interpretation", color: "bg-primary" },
  { key: "client_communication", label: "Client Communication", color: "bg-success" },
  { key: "care_coordination", label: "Care Coordination", color: "bg-warning" },
  { key: "documentation_reporting", label: "Documentation & Reporting", color: "bg-destructive" },
];

const mockTasks = [
  { id: 1, title: "Review lab results for Sarah Johnson", category: "clinical_review", priority: "urgent", status: "todo", assignee: "Dr. Smith", due: "Today" },
  { id: 2, title: "Call Mark Davis about follow-up", category: "client_communication", priority: "high", status: "in_progress", assignee: "Nurse Lee", due: "Today" },
  { id: 3, title: "Coordinate referral for Emma Wilson", category: "care_coordination", priority: "medium", status: "todo", assignee: "Dr. Smith", due: "Tomorrow" },
  { id: 4, title: "Complete visit notes for morning patients", category: "documentation_reporting", priority: "high", status: "todo", assignee: "Dr. Smith", due: "Today" },
  { id: 5, title: "Interpret imaging for James Brown", category: "clinical_review", priority: "medium", status: "done", assignee: "Dr. Smith", due: "Yesterday" },
];

const priorityColors: Record<string, string> = {
  urgent: "bg-destructive text-destructive-foreground",
  high: "bg-warning text-warning-foreground",
  medium: "bg-secondary text-secondary-foreground",
  low: "bg-muted text-muted-foreground",
};

const statusLabels: Record<string, string> = {
  todo: "To Do",
  in_progress: "In Progress",
  done: "Done",
};

const TasksPage = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Tasks</h1>
          <p className="text-muted-foreground">Manage and track your clinical tasks.</p>
        </div>
      </div>

      {/* Category tabs */}
      <div className="flex gap-2 flex-wrap">
        {taskCategories.map((cat) => (
          <Badge key={cat.key} variant="outline" className="cursor-pointer px-3 py-1.5">
            <div className={`h-2 w-2 rounded-full ${cat.color} mr-2`} />
            {cat.label}
          </Badge>
        ))}
      </div>

      <div className="space-y-3">
        {mockTasks.map((task) => {
          const cat = taskCategories.find((c) => c.key === task.category);
          return (
            <Card key={task.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <div className={`h-2 w-2 rounded-full ${cat?.color}`} />
                      <p className={`text-sm font-medium ${task.status === "done" ? "line-through text-muted-foreground" : ""}`}>
                        {task.title}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span>{cat?.label}</span>
                      <span>•</span>
                      <span>{task.assignee}</span>
                      <span>•</span>
                      <span>Due: {task.due}</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Badge className={priorityColors[task.priority]}>{task.priority}</Badge>
                    <Badge variant="outline">{statusLabels[task.status]}</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default TasksPage;
