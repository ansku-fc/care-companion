import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Stethoscope, Pencil, Pill } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";
import { PatientOnboardingDialog } from "@/components/patients/onboarding/PatientOnboardingDialog";

type MedicationDetail = {
  name: string;
  atc?: string;
  dose?: string;
  frequency?: string;
  route?: string;
  start_year?: number | null;
  end_year?: number | null;
  notes?: string;
};

type IllnessRow = {
  id?: string;
  icd_code?: string;
  illness_name?: string;
  onset_year?: number | null;
  resolved_year?: number | null;
  medications?: MedicationDetail[];
  notes?: string;
  dimensions?: string[];
  dimensions_confirmed?: boolean;
};

const FREQ_LABELS: Record<string, string> = {
  once_daily: "Once daily",
  twice_daily: "Twice daily",
  three_times_daily: "Three times daily",
  as_needed: "As needed",
  weekly: "Weekly",
  other: "Other",
};

const ROUTE_LABELS: Record<string, string> = {
  oral: "Oral",
  topical: "Topical",
  inhaled: "Inhaled",
  injection: "Injection",
  other: "Other",
};

function fmtFrequency(f?: string) {
  if (!f) return "";
  return FREQ_LABELS[f] ?? f;
}
function fmtRoute(r?: string) {
  if (!r) return "";
  return ROUTE_LABELS[r] ?? r;
}

interface Props {
  patient: Tables<"patients">;
  onboarding: Tables<"patient_onboarding"> | null;
  onSelectSection: (key: string) => void;
  onDataChanged: () => void;
}

export function IllnessesMedicationsCard({ patient, onboarding, onSelectSection, onDataChanged }: Props) {
  const [seeAllOpen, setSeeAllOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  const { current, previous } = useMemo(() => {
    const ex = (onboarding?.extra_data ?? {}) as any;
    const cur: IllnessRow[] = Array.isArray(ex.current_illnesses) ? ex.current_illnesses : [];
    const prev: IllnessRow[] = Array.isArray(ex.previous_illnesses) ? ex.previous_illnesses : [];
    return {
      current: cur.filter((r) => r?.illness_name?.trim()),
      previous: prev.filter((r) => r?.illness_name?.trim()),
    };
  }, [onboarding]);

  const totalCount = current.length + previous.length;

  return (
    <>
      <Card className="shadow-card">
        <CardContent className="py-3 px-3 space-y-2">
          <div className="flex items-center gap-2">
            <Stethoscope className="h-3.5 w-3.5 text-primary" />
            <h3 className="text-[13px] font-semibold">Illnesses & Medications</h3>
            <div className="ml-auto flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                title="Edit illnesses & medications"
                onClick={() => setEditOpen(true)}
              >
                <Pencil className="h-3 w-3" />
              </Button>
              <button
                onClick={() => setSeeAllOpen(true)}
                className="text-[11px] text-muted-foreground hover:text-foreground hover:underline"
              >
                See all ({totalCount}) →
              </button>
            </div>
          </div>

          {current.length === 0 ? (
            <p className="text-[11px] text-muted-foreground">No current illnesses recorded.</p>
          ) : (
            <ul className="space-y-2">
              {current.slice(0, 3).map((row, idx) => (
                <li key={row.id ?? idx} className="text-[12px]">
                  <div className="flex items-baseline gap-1.5 flex-wrap">
                    {row.icd_code && (
                      <span className="font-mono text-[10.5px] text-muted-foreground">{row.icd_code}</span>
                    )}
                    <span className="font-medium">{row.illness_name}</span>
                    {row.onset_year && (
                      <span className="text-[10.5px] text-muted-foreground">· {row.onset_year}</span>
                    )}
                  </div>
                  {row.medications && row.medications.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1 ml-1">
                      {row.medications.map((m, i) => (
                        <span
                          key={`${m.name}-${i}`}
                          className="inline-flex items-center gap-1 rounded-full bg-muted px-1.5 py-0.5 text-[10.5px] text-foreground/90"
                        >
                          <Pill className="h-2.5 w-2.5 text-muted-foreground" />
                          {m.atc && <span className="font-mono text-muted-foreground">{m.atc}</span>}
                          <span className="font-medium">{m.name}</span>
                          {m.dose && <span className="text-muted-foreground">· {m.dose}</span>}
                          {m.frequency && (
                            <span className="text-muted-foreground">· {fmtFrequency(m.frequency)}</span>
                          )}
                        </span>
                      ))}
                    </div>
                  )}
                </li>
              ))}
              {current.length > 3 && (
                <li className="text-[11px] text-muted-foreground italic">
                  +{current.length - 3} more — see all
                </li>
              )}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* See all detail dialog */}
      <Dialog open={seeAllOpen} onOpenChange={setSeeAllOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Illnesses & Medications — {patient.full_name}</DialogTitle>
          </DialogHeader>

          <div className="space-y-5">
            <IllnessSection title="Current Illnesses" rows={current} />
            <Separator />
            <IllnessSection title="Previous Illnesses" rows={previous} previous />
          </div>

          <div className="flex justify-end pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSeeAllOpen(false);
                setEditOpen(true);
              }}
              className="gap-1.5"
            >
              <Pencil className="h-3.5 w-3.5" /> Edit
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit dialog — opens onboarding flow at Illnesses step */}
      {editOpen && (
        <PatientOnboardingDialog
          patientId={patient.id}
          patientName={patient.full_name}
          open={editOpen}
          onOpenChange={(o) => {
            setEditOpen(o);
            if (!o) onDataChanged();
          }}
          onCompleted={() => {
            setEditOpen(false);
            onDataChanged();
          }}
          initialStep={2}
        />
      )}
    </>
  );
}

function IllnessSection({
  title,
  rows,
  previous,
}: {
  title: string;
  rows: IllnessRow[];
  previous?: boolean;
}) {
  return (
    <div>
      <h4 className="text-sm font-semibold mb-2 text-foreground/90">
        {title} <span className="text-muted-foreground font-normal">({rows.length})</span>
      </h4>
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground italic">None recorded.</p>
      ) : (
        <ul className="space-y-3">
          {rows.map((row, idx) => (
            <li key={row.id ?? idx} className="border rounded-md p-3 bg-muted/30">
              <div className="flex items-baseline gap-2 flex-wrap">
                {row.icd_code && (
                  <Badge variant="outline" className="font-mono text-[10.5px]">
                    {row.icd_code}
                  </Badge>
                )}
                <span className="font-medium text-sm">{row.illness_name}</span>
                {row.onset_year && (
                  <span className="text-xs text-muted-foreground">
                    · onset {row.onset_year}
                  </span>
                )}
                {previous && row.resolved_year && (
                  <span className="text-xs text-muted-foreground">
                    · resolved {row.resolved_year}
                  </span>
                )}
              </div>

              {row.dimensions && row.dimensions.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {row.dimensions.map((d) => (
                    <Badge key={d} variant="secondary" className="text-[10px] py-0 px-1.5">
                      {d}
                    </Badge>
                  ))}
                </div>
              )}

              {row.medications && row.medications.length > 0 && (
                <div className="mt-2 space-y-1">
                  {row.medications.map((m, i) => (
                    <div key={`${m.name}-${i}`} className="text-xs flex flex-wrap items-baseline gap-1.5">
                      <Pill className="h-3 w-3 text-muted-foreground" />
                      {m.atc && <span className="font-mono text-muted-foreground">{m.atc}</span>}
                      <span className="font-medium">{m.name}</span>
                      {m.dose && <span className="text-muted-foreground">· {m.dose}</span>}
                      {m.frequency && (
                        <span className="text-muted-foreground">· {fmtFrequency(m.frequency)}</span>
                      )}
                      {m.route && (
                        <span className="text-muted-foreground">· {fmtRoute(m.route)}</span>
                      )}
                      {(m.start_year || m.end_year) && (
                        <span className="text-muted-foreground">
                          · {m.start_year ?? "?"}–{m.end_year ?? "present"}
                        </span>
                      )}
                      {m.notes && (
                        <span className="text-muted-foreground italic">— {m.notes}</span>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {row.notes && (
                <p className="text-xs text-muted-foreground mt-1.5 italic">{row.notes}</p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
