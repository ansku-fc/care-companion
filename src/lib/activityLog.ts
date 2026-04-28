import { supabase } from "@/integrations/supabase/client";
import { formatLastFirst } from "@/lib/patientName";

export type ActivityActorType = "doctor" | "nurse" | "patient" | "system" | "lab";
export type ActivitySection = "overview" | "health-data" | "visits";

type LogActivityInput = {
  eventType: string;
  title: string;
  createdBy: string;
  patientId?: string | null;
  patientName?: string | null;
  actorName?: string;
  actorType?: ActivityActorType;
  section?: ActivitySection;
  metadata?: Record<string, unknown>;
};

export async function logActivity(input: LogActivityInput) {
  let patientName = input.patientName ?? null;

  if (!patientName && input.patientId) {
    const { data, error } = await supabase
      .from("patients")
      .select("full_name")
      .eq("id", input.patientId)
      .maybeSingle();
    if (error) {
      console.error("Failed to resolve activity patient", error);
    }
    patientName = data?.full_name ? formatLastFirst(data.full_name) : null;
  }

  const { error } = await supabase.from("activity_log" as any).insert({
    event_type: input.eventType,
    title: input.title,
    patient_id: input.patientId ?? null,
    patient_name: patientName,
    actor_name: input.actorName ?? "System",
    actor_type: input.actorType ?? "system",
    section: input.section ?? "overview",
    metadata: input.metadata ?? {},
    created_by: input.createdBy,
  } as any);

  if (error) {
    console.error("Failed to write activity log", error);
    throw new Error(`Activity log write failed: ${error.message}`);
  }
}