import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { TaskDialog, type TaskPrefill } from "@/components/tasks/TaskDialog";
import type { Task } from "@/lib/tasks";

type Listener = () => void;

interface TaskContextValue {
  /** Open the task dialog with optional prefilled fields. */
  openNewTask: (prefill?: TaskPrefill) => void;
  /** Open the dialog in edit mode. */
  openEditTask: (task: Task) => void;
  /** Subscribe to "tasks changed" events so any view can refetch. */
  subscribe: (listener: Listener) => () => void;
  /** Notify all subscribers that tasks were mutated. */
  notifyChanged: () => void;
}

const Ctx = createContext<TaskContextValue | null>(null);

export function TaskProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);
  const [prefill, setPrefill] = useState<TaskPrefill | undefined>(undefined);
  const [listeners] = useState<Set<Listener>>(() => new Set());

  const openNewTask = useCallback((p?: TaskPrefill) => {
    setEditing(null);
    setPrefill(p);
    setOpen(true);
  }, []);

  const openEditTask = useCallback((task: Task) => {
    setEditing(task);
    setPrefill(undefined);
    setOpen(true);
  }, []);

  const subscribe = useCallback((listener: Listener) => {
    listeners.add(listener);
    return () => listeners.delete(listener) as unknown as void;
  }, [listeners]);

  const notifyChanged = useCallback(() => {
    listeners.forEach((l) => l());
  }, [listeners]);

  return (
    <Ctx.Provider value={{ openNewTask, openEditTask, subscribe, notifyChanged }}>
      {children}
      <TaskDialog
        open={open}
        onOpenChange={setOpen}
        task={editing}
        prefill={prefill}
        onSaved={notifyChanged}
      />
    </Ctx.Provider>
  );
}

export function useTaskActions() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useTaskActions must be used within TaskProvider");
  return ctx;
}
