import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import {
  ASSIGNEES, PRIORITY_OPTIONS, STATUS_OPTIONS, TASK_CATEGORIES,
  type Task, type TaskCategory, type TaskPriority, type TaskStatus,
} from "@/lib/tasks";
import {
  detectTaskCategory, TASK_CATEGORY_META, type TaskCategoryKind,
} from "@/lib/taskCategory";

export interface TaskPrefill {
  title?: string;
  description?: string;
  patient_id?: string | null;
  category?: TaskCategory;
  priority?: TaskPriority;
  assignee_name?: string;
  assignee_type?: string;
  due_date?: string;          // YYYY-MM-DD
  created_from?: string | null;
  task_category?: TaskCategoryKind;
}

const TASK_CATEGORY_KINDS = Object.keys(TASK_CATEGORY_META) as TaskCategoryKind[];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task?: Task | null;          // when present, edit mode
  prefill?: TaskPrefill;
  onSaved?: () => void;
}

const DEFAULT_DUE_DATE = () => {
  const d = new Date();
  d.setDate(d.getDate() + 3);
  return d.toISOString().slice(0, 10);
};

export function TaskDialog({ open, onOpenChange, task, prefill, onSaved }: Props) {
  const { user } = useAuth();
  const [patients, setPatients] = useState<{ id: string; full_name: string }[]>([]);
  const [patientPickerOpen, setPatientPickerOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [patientId, setPatientId] = useState<string | null>(null);
  const [category, setCategory] = useState<TaskCategory>("clinical");
  const [priority, setPriority] = useState<TaskPriority>("medium");
  const [status, setStatus] = useState<TaskStatus>("todo");
  const [assigneeName, setAssigneeName] = useState<string>("Dr. Laine");
  const [dueDate, setDueDate] = useState<string>(DEFAULT_DUE_DATE());
  const [createdFrom, setCreatedFrom] = useState<string | null>(null);

  // Load patients once dialog opens.
  useEffect(() => {
    if (!open) return;
    supabase
      .from("patients")
      .select("id, full_name")
      .order("full_name")
      .then(({ data }) => setPatients(data ?? []));
  }, [open]);

  // Initialise form from task or prefill whenever the dialog opens.
  useEffect(() => {
    if (!open) return;
    if (task) {
      setTitle(task.title);
      setDescription(task.description ?? "");
      setPatientId(task.patient_id);
      setCategory(task.category);
      setPriority(task.priority);
      setStatus(task.status);
      setAssigneeName(task.assignee_name ?? "Dr. Laine");
      setDueDate(task.due_date ?? DEFAULT_DUE_DATE());
      setCreatedFrom((task as Task & { created_from?: string | null }).created_from ?? null);
    } else {
      setTitle(prefill?.title ?? "");
      setDescription(prefill?.description ?? "");
      setPatientId(prefill?.patient_id ?? null);
      setCategory(prefill?.category ?? "clinical");
      setPriority(prefill?.priority ?? "medium");
      setStatus("todo");
      setAssigneeName(prefill?.assignee_name ?? "Dr. Laine");
      setDueDate(prefill?.due_date ?? DEFAULT_DUE_DATE());
      setCreatedFrom(prefill?.created_from ?? null);
    }
  }, [open, task, prefill]);

  const assigneeMeta = ASSIGNEES.find((a) => a.name === assigneeName);
  const patientLabel = patients.find((p) => p.id === patientId)?.full_name;

  const handleSave = async () => {
    if (!user || !title.trim() || !dueDate) {
      toast.error("Title and due date are required");
      return;
    }
    setSaving(true);
    const payload = {
      title: title.trim(),
      description: description.trim() || null,
      patient_id: patientId,
      category,
      priority,
      status,
      assignee_name: assigneeName,
      assignee_type: assigneeMeta?.type ?? "doctor_internal",
      due_date: dueDate,
      created_from: createdFrom,
    };

    if (task) {
      const { error } = await supabase
        .from("tasks")
        .update(payload as never)
        .eq("id", task.id);
      if (error) { toast.error("Failed to update task"); setSaving(false); return; }
      toast.success("Task updated");
    } else {
      const { error } = await supabase
        .from("tasks")
        .insert({ ...payload, created_by: user.id } as never);
      if (error) { toast.error("Failed to create task"); setSaving(false); return; }
      toast.success("Task created");
    }
    setSaving(false);
    onOpenChange(false);
    onSaved?.();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{task ? "Edit Task" : "New Task"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Title <span className="text-destructive">*</span></Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Short description of the action required"
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Patient</Label>
              <Popover open={patientPickerOpen} onOpenChange={setPatientPickerOpen}>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    role="combobox"
                    className="w-full justify-between font-normal h-10"
                  >
                    <span className={cn("truncate", !patientLabel && "text-muted-foreground")}>
                      {patientLabel ?? "Select patient (optional)"}
                    </span>
                    <ChevronsUpDown className="ml-2 h-3.5 w-3.5 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[320px] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Search patient…" />
                    <CommandList>
                      <CommandEmpty>No patients found.</CommandEmpty>
                      <CommandGroup>
                        <CommandItem
                          value="__none__"
                          onSelect={() => { setPatientId(null); setPatientPickerOpen(false); }}
                        >
                          <Check className={cn("mr-2 h-4 w-4", !patientId ? "opacity-100" : "opacity-0")} />
                          No patient (administrative)
                        </CommandItem>
                        {patients.map((p) => (
                          <CommandItem
                            key={p.id}
                            value={p.full_name}
                            onSelect={() => { setPatientId(p.id); setPatientPickerOpen(false); }}
                          >
                            <Check className={cn("mr-2 h-4 w-4", patientId === p.id ? "opacity-100" : "opacity-0")} />
                            {p.full_name}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-1.5">
              <Label>Assignee</Label>
              <Select value={assigneeName} onValueChange={setAssigneeName}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ASSIGNEES.map((a) => (
                    <SelectItem key={a.name} value={a.name}>{a.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label>Category</Label>
              <Select value={category} onValueChange={(v) => setCategory(v as TaskCategory)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TASK_CATEGORIES.map((c) => (
                    <SelectItem key={c.key} value={c.key}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Priority</Label>
              <Select value={priority} onValueChange={(v) => setPriority(v as TaskPriority)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PRIORITY_OPTIONS.map((p) => (
                    <SelectItem key={p.key} value={p.key}>{p.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as TaskStatus)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((s) => (
                    <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Due date <span className="text-destructive">*</span></Label>
              <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>
            {createdFrom && (
              <div className="space-y-1.5">
                <Label>Created from</Label>
                <Input value={createdFrom} readOnly className="bg-muted/50" />
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <Label>Notes</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional context, links, or follow-up details"
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving || !title.trim() || !dueDate}>
            {task ? "Save changes" : "Create task"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
