import { useState, useEffect, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import type { Enums } from "@/integrations/supabase/types";
import { format } from "date-fns";

type TaskCategory = Enums<"task_category">;
type TaskPriority = Enums<"task_priority">;
type TaskStatus = Enums<"task_status">;

interface TaskRow {
  id: string;
  title: string;
  description: string | null;
  category: TaskCategory;
  priority: TaskPriority;
  status: TaskStatus;
  assigned_to: string | null;
  assignee_name: string | null;
  assignee_type: string | null;
  patient_id: string | null;
  due_date: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

const ASSIGNEE_TYPE_OPTIONS = [
  { value: "doctor_internal", label: "Doctor (Internal)" },
  { value: "doctor_external", label: "Doctor (External)" },
  { value: "nurse_internal", label: "Nurse (Internal)" },
  { value: "nurse_external", label: "Nurse (External)" },
];

const assigneeTypeLabel: Record<string, string> = {
  doctor_internal: "Doctor · Internal",
  doctor_external: "Doctor · External",
  nurse_internal: "Nurse · Internal",
  nurse_external: "Nurse · External",
};

const taskCategories: { key: TaskCategory; label: string; color: string }[] = [
  { key: "clinical_review", label: "Clinical Review & Interpretation", color: "bg-primary" },
  { key: "client_communication", label: "Client Communication", color: "bg-chart-2" },
  { key: "care_coordination", label: "Care Coordination", color: "bg-chart-4" },
  { key: "documentation_reporting", label: "Documentation & Reporting", color: "bg-destructive" },
];

const priorityColors: Record<TaskPriority, string> = {
  urgent: "bg-destructive text-destructive-foreground",
  high: "bg-chart-4 text-foreground",
  medium: "bg-secondary text-secondary-foreground",
  low: "bg-muted text-muted-foreground",
};

const statusLabels: Record<TaskStatus, string> = {
  todo: "To Do",
  in_progress: "In Progress",
  done: "Done",
};

const EMPTY_FORM = {
  title: "",
  description: "",
  category: "clinical_review" as TaskCategory,
  priority: "medium" as TaskPriority,
  status: "todo" as TaskStatus,
  assignee_name: "",
  assignee_type: "doctor_internal",
  patient_id: "",
  due_date: "",
};

const TasksPage = () => {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [patients, setPatients] = useState<{ id: string; full_name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskRow | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterPatient, setFilterPatient] = useState<string>("all");

  const fetchData = async () => {
    setLoading(true);
    const [tasksRes, patientsRes] = await Promise.all([
      supabase.from("tasks").select("*").order("created_at", { ascending: false }),
      supabase.from("patients").select("id, full_name").order("full_name"),
    ]);

    if (tasksRes.data) setTasks(tasksRes.data as unknown as TaskRow[]);
    if (patientsRes.data) setPatients(patientsRes.data);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const openCreate = () => {
    setEditingTask(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  };

  const openEdit = (task: TaskRow) => {
    setEditingTask(task);
    setForm({
      title: task.title,
      description: task.description || "",
      category: task.category,
      priority: task.priority,
      status: task.status,
      assignee_name: task.assignee_name || "",
      assignee_type: task.assignee_type || "doctor_internal",
      patient_id: task.patient_id || "",
      due_date: task.due_date || "",
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!user || !form.title.trim() || !form.patient_id) return;

    const payload: Record<string, unknown> = {
      title: form.title.trim(),
      description: form.description.trim() || null,
      category: form.category,
      priority: form.priority,
      status: form.status,
      assignee_name: form.assignee_name.trim() || null,
      assignee_type: form.assignee_name.trim() ? form.assignee_type : null,
      patient_id: form.patient_id || null,
      due_date: form.due_date || null,
    };

    if (editingTask) {
      const { error } = await supabase.from("tasks").update(payload as any).eq("id", editingTask.id);
      if (error) { toast.error("Failed to update task"); return; }
      toast.success("Task updated");
    } else {
      const { error } = await supabase.from("tasks").insert({ ...payload, created_by: user.id } as any);
      if (error) { toast.error("Failed to create task"); return; }
      toast.success("Task created");
    }

    setDialogOpen(false);
    fetchData();
  };

  const getPatientName = (id: string | null) => {
    if (!id) return null;
    return patients.find((p) => p.id === id)?.full_name || "Unknown Patient";
  };

  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      if (filterCategory !== "all" && t.category !== filterCategory) return false;
      if (filterStatus !== "all" && t.status !== filterStatus) return false;
      if (filterPatient !== "all" && (t.patient_id || "") !== filterPatient) return false;
      return true;
    });
  }, [tasks, filterCategory, filterStatus, filterPatient]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Tasks</h1>
          <p className="text-muted-foreground">Manage and track your clinical tasks.</p>
        </div>
        <Button onClick={openCreate}><Plus className="h-4 w-4 mr-2" />New Task</Button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap items-end">
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Category</Label>
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="w-[200px] h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {taskCategories.map((c) => <SelectItem key={c.key} value={c.key}>{c.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Patient</Label>
          <Select value={filterPatient} onValueChange={setFilterPatient}>
            <SelectTrigger className="w-[180px] h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Patients</SelectItem>
              {patients.map((p) => <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Status</Label>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[140px] h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="todo">To Do</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="done">Done</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Task list */}
      {loading ? (
        <p className="text-sm text-muted-foreground">Loading tasks…</p>
      ) : filteredTasks.length === 0 ? (
        <p className="text-sm text-muted-foreground">No tasks found.</p>
      ) : (
        <div className="space-y-3">
          {filteredTasks.map((task) => {
            const cat = taskCategories.find((c) => c.key === task.category);
            const patientName = getPatientName(task.patient_id);
            const typeLabel = task.assignee_type ? assigneeTypeLabel[task.assignee_type] : null;
            return (
              <Card key={task.id} className="cursor-pointer hover:border-primary/40 transition-colors" onClick={() => openEdit(task)}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-1.5">
                      <div className="flex items-center gap-2">
                        <div className={`h-2 w-2 rounded-full ${cat?.color}`} />
                        <p className={`text-sm font-medium ${task.status === "done" ? "line-through text-muted-foreground" : ""}`}>
                          {task.title}
                        </p>
                      </div>
                      {patientName && (
                        <div className="flex items-center gap-2 ml-4">
                          <Badge variant="secondary" className="text-xs font-semibold px-2 py-0.5">{patientName}</Badge>
                        </div>
                      )}
                      <div className="flex items-center gap-3 text-xs text-muted-foreground ml-4">
                        <span>{cat?.label}</span>
                        <span>•</span>
                        <span>
                          {task.assignee_name || "Unassigned"}
                          {typeLabel && <span className="ml-1">({typeLabel})</span>}
                        </span>
                        {task.due_date && (
                          <>
                            <span>•</span>
                            <span>Due: {format(new Date(task.due_date), "dd MMM yyyy")}</span>
                          </>
                        )}
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
      )}

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingTask ? "Edit Task" : "New Task"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1">
              <Label>Title</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Task title" />
            </div>
            <div className="space-y-1">
              <Label>Description</Label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Optional details" rows={3} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Category</Label>
                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v as TaskCategory })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {taskCategories.map((c) => <SelectItem key={c.key} value={c.key}>{c.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Priority</Label>
                <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v as TaskPriority })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="urgent">Urgent</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Assignee Name</Label>
                <Input value={form.assignee_name} onChange={(e) => setForm({ ...form, assignee_name: e.target.value })} placeholder="e.g. Dr. Anna Korhonen" />
              </div>
              <div className="space-y-1">
                <Label>Assignee Type</Label>
                <Select value={form.assignee_type} onValueChange={(v) => setForm({ ...form, assignee_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ASSIGNEE_TYPE_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as TaskStatus })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todo">To Do</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="done">Done</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Due Date</Label>
                <Input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Patient <span className="text-destructive">*</span></Label>
              <Select value={form.patient_id || "none"} onValueChange={(v) => setForm({ ...form, patient_id: v === "none" ? "" : v })}>
                <SelectTrigger><SelectValue placeholder="Select patient" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Select patient…</SelectItem>
                  {patients.map((p) => <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={!form.title.trim() || !form.patient_id}>{editingTask ? "Update" : "Create"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TasksPage;
