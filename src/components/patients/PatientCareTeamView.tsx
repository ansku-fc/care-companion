import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, User, Mail, Phone } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

interface Props {
  patientId: string;
  patientName: string;
}

const ROLE_LABELS: Record<string, string> = {
  personal_doctor: "Personal Doctor",
  nurse: "Nurse",
  external_specialist: "External Specialist",
};

const ROLE_ORDER: Record<string, number> = {
  personal_doctor: 0,
  nurse: 1,
  external_specialist: 2,
};

export function PatientCareTeamView({ patientId, patientName }: Props) {
  const [team, setTeam] = useState<Tables<"patient_care_team">[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("patient_care_team")
        .select("*")
        .eq("patient_id", patientId)
        .eq("is_active", true);
      if (!active) return;
      const sorted = [...(data || [])].sort(
        (a, b) => (ROLE_ORDER[a.role] ?? 9) - (ROLE_ORDER[b.role] ?? 9),
      );
      setTeam(sorted);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [patientId]);

  return (
    <div className="space-y-6 p-1">
      <div>
        <h2 className="text-xl font-semibold">{patientName}</h2>
        <p className="text-sm text-muted-foreground">Care Team</p>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" />
            Assigned Members
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading care team...</p>
          ) : team.length === 0 ? (
            <p className="text-sm text-muted-foreground italic">
              No care team members assigned.
            </p>
          ) : (
            <div className="space-y-2">
              {team.map((m) => (
                <div
                  key={m.id}
                  className="flex items-center gap-3 p-3 rounded-md bg-muted/40"
                >
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <User className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{m.member_name}</p>
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
                      <span>{ROLE_LABELS[m.role] || m.role}</span>
                      {m.specialty && <span>· {m.specialty}</span>}
                    </div>
                    {(m.email || m.phone) && (
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground mt-0.5">
                        {m.email && (
                          <span className="inline-flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            {m.email}
                          </span>
                        )}
                        {m.phone && (
                          <span className="inline-flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {m.phone}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
