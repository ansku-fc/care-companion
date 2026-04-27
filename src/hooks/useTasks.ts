import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTaskActions } from "@/components/tasks/TaskProvider";
import type { Task } from "@/lib/tasks";
import { formatLastFirst } from "@/lib/patientName";

interface UseTasksOptions {
  patientId?: string;
}

export function useTasks(options: UseTasksOptions = {}) {
  const { patientId } = options;
  const { subscribe } = useTaskActions();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [patients, setPatients] = useState<{ id: string; full_name: string; tier: string | null }[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTasks = useCallback(async () => {
    let q = supabase
      .from("tasks")
      .select("*")
      .order("due_date", { ascending: true, nullsFirst: false });
    if (patientId) q = q.eq("patient_id", patientId);
    const { data } = await q;
    setTasks((data ?? []) as Task[]);
    setLoading(false);
  }, [patientId]);

  useEffect(() => {
    setLoading(true);
    fetchTasks();
    supabase
      .from("patients")
      .select("id, full_name, tier")
      .order("full_name")
      .then(({ data }) => setPatients((data ?? []) as { id: string; full_name: string; tier: string | null }[]));
    const unsubscribe = subscribe(fetchTasks);
    return unsubscribe;
  }, [fetchTasks, subscribe]);

  const patientName = (id: string | null) => {
    if (!id) return null;
    const raw = patients.find((p) => p.id === id)?.full_name;
    return raw ? formatLastFirst(raw) : null;
  };

  return { tasks, patients, patientName, loading, refetch: fetchTasks };
}
