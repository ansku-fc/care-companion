import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useTaskActions } from "@/components/tasks/TaskProvider";
import type { Episode } from "@/lib/episodes";
import type { Task } from "@/lib/tasks";

interface UseEpisodesOptions {
  patientId?: string;
  status?: "ACTIVE" | "CLOSED" | "all";
}

/** Fetch episodes (optionally scoped to a patient) and the tasks attached to them. */
export function useEpisodes(options: UseEpisodesOptions = {}) {
  const { patientId, status = "ACTIVE" } = options;
  const { user, loading: authLoading } = useAuth();
  const { subscribe } = useTaskActions();
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [tasksByEpisode, setTasksByEpisode] = useState<Record<string, Task[]>>({});
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    let q = supabase.from("episodes").select("*").order("created_at", { ascending: false });
    if (patientId) q = q.eq("patient_id", patientId);
    if (status !== "all") q = q.eq("status", status);
    const { data: eps } = await q;
    const list = (eps ?? []) as Episode[];
    setEpisodes(list);

    if (list.length === 0) {
      setTasksByEpisode({});
      setLoading(false);
      return;
    }
    const ids = list.map((e) => e.id);
    const { data: tasks } = await supabase
      .from("tasks")
      .select("*")
      .in("episode_id", ids)
      .order("sequence_order", { ascending: true, nullsFirst: false });
    const grouped: Record<string, Task[]> = {};
    for (const t of (tasks ?? []) as Task[]) {
      if (!t.episode_id) continue;
      (grouped[t.episode_id] ??= []).push(t);
    }
    setTasksByEpisode(grouped);
    setLoading(false);
  }, [patientId, status]);

  useEffect(() => {
    if (authLoading) return;
    setLoading(true);
    fetchAll();
    const unsub = subscribe(fetchAll);
    return unsub;
  }, [fetchAll, subscribe, authLoading, user?.id]);

  return { episodes, tasksByEpisode, loading, refetch: fetchAll };
}
