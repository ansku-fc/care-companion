import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertTriangle, Pill, Search, Plus, Calendar as CalendarIcon, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

type MedStatus = "active" | "past";

type Medication = {
  id: string;
  name: string;
  dose: string;
  frequency: string;
  indication: string;
  dimension: string; // health dimension label
  startDate: string; // ISO
  endDate?: string;  // ISO, only for past
  remainingPills: number;
  totalPills: number;
  renewalDate?: string; // ISO
  status: MedStatus;
};

// ---- Dummy medication data (mock) ----
const MOCK_MEDS: Medication[] = [
  {
    id: "m1",
    name: "Atorvastatin",
    dose: "20 mg",
    frequency: "Once daily (evening)",
    indication: "Hyperlipidaemia",
    dimension: "Cardiovascular Health",
    startDate: "2024-02-12",
    remainingPills: 18,
    totalPills: 90,
    renewalDate: "2026-05-08",
    status: "active",
  },
  {
    id: "m2",
    name: "Lisinopril",
    dose: "10 mg",
    frequency: "Once daily (morning)",
    indication: "Hypertension",
    dimension: "Cardiovascular Health",
    startDate: "2023-11-04",
    remainingPills: 42,
    totalPills: 90,
    renewalDate: "2026-06-02",
    status: "active",
  },
  {
    id: "m3",
    name: "Metformin",
    dose: "500 mg",
    frequency: "Twice daily with meals",
    indication: "Type 2 Diabetes",
    dimension: "Metabolic Health",
    startDate: "2024-05-18",
    remainingPills: 6,
    totalPills: 180,
    renewalDate: "2026-04-29",
    status: "active",
  },
  {
    id: "m4",
    name: "Levothyroxine",
    dose: "75 mcg",
    frequency: "Once daily (fasting)",
    indication: "Hypothyroidism",
    dimension: "Metabolic Health",
    startDate: "2022-09-01",
    remainingPills: 60,
    totalPills: 100,
    renewalDate: "2026-07-14",
    status: "active",
  },
  {
    id: "m5",
    name: "Sertraline",
    dose: "50 mg",
    frequency: "Once daily",
    indication: "Anxiety Disorder",
    dimension: "Brain & Mental Health",
    startDate: "2024-08-22",
    remainingPills: 24,
    totalPills: 60,
    renewalDate: "2026-05-20",
    status: "active",
  },
  {
    id: "m6",
    name: "Warfarin",
    dose: "3 mg",
    frequency: "Once daily",
    indication: "Atrial Fibrillation",
    dimension: "Cardiovascular Health",
    startDate: "2025-01-10",
    remainingPills: 30,
    totalPills: 90,
    renewalDate: "2026-06-15",
    status: "active",
  },
  {
    id: "m7",
    name: "Ibuprofen",
    dose: "400 mg",
    frequency: "Up to 3x daily as needed",
    indication: "Joint pain",
    dimension: "Exercise & Functional Health",
    startDate: "2026-03-01",
    remainingPills: 12,
    totalPills: 60,
    renewalDate: "2026-05-15",
    status: "active",
  },
  // Past medications
  {
    id: "m8",
    name: "Amoxicillin",
    dose: "500 mg",
    frequency: "3x daily for 7 days",
    indication: "Respiratory infection",
    dimension: "Respiratory & Immune Health",
    startDate: "2025-11-02",
    endDate: "2025-11-09",
    remainingPills: 0,
    totalPills: 21,
    status: "past",
  },
  {
    id: "m9",
    name: "Omeprazole",
    dose: "20 mg",
    frequency: "Once daily",
    indication: "GERD / Acid Reflux",
    dimension: "Digestion & Liver Health",
    startDate: "2024-06-15",
    endDate: "2025-02-20",
    remainingPills: 0,
    totalPills: 240,
    status: "past",
  },
  {
    id: "m10",
    name: "Prednisolone",
    dose: "10 mg",
    frequency: "Tapering schedule",
    indication: "Inflammatory flare",
    dimension: "Respiratory & Immune Health",
    startDate: "2024-01-08",
    endDate: "2024-02-05",
    remainingPills: 0,
    totalPills: 28,
    status: "past",
  },
];

// ---- Contraindication / interaction database (mock) ----
type Interaction = {
  drugs: [string, string];
  severity: "severe" | "moderate" | "mild";
  description: string;
};

const INTERACTIONS: Interaction[] = [
  {
    drugs: ["Warfarin", "Ibuprofen"],
    severity: "severe",
    description: "NSAIDs significantly increase bleeding risk when combined with anticoagulants. Avoid concurrent use.",
  },
  {
    drugs: ["Warfarin", "Sertraline"],
    severity: "moderate",
    description: "SSRIs may potentiate anticoagulant effect — monitor INR closely.",
  },
  {
    drugs: ["Lisinopril", "Ibuprofen"],
    severity: "moderate",
    description: "NSAIDs reduce ACE inhibitor efficacy and raise renal injury risk.",
  },
  {
    drugs: ["Atorvastatin", "Warfarin"],
    severity: "mild",
    description: "May modestly increase INR — periodic monitoring advised.",
  },
];

function detectInteractions(meds: Medication[]): Interaction[] {
  const activeNames = new Set(meds.filter((m) => m.status === "active").map((m) => m.name));
  return INTERACTIONS.filter(({ drugs }) => activeNames.has(drugs[0]) && activeNames.has(drugs[1]));
}

const SEVERITY_STYLES: Record<Interaction["severity"], string> = {
  severe: "border-destructive/40 bg-destructive/5 text-destructive",
  moderate: "border-amber-500/40 bg-amber-500/5 text-amber-700 dark:text-amber-400",
  mild: "border-muted-foreground/30 bg-muted/40 text-muted-foreground",
};

const SEVERITY_BADGE: Record<Interaction["severity"], string> = {
  severe: "bg-destructive text-destructive-foreground",
  moderate: "bg-amber-500 text-white",
  mild: "bg-muted text-foreground",
};

function fmtDate(iso?: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" });
}

function daysUntil(iso?: string): number | null {
  if (!iso) return null;
  const diff = new Date(iso).getTime() - Date.now();
  return Math.ceil(diff / 86_400_000);
}

interface Props {
  patientName: string;
}

export function PatientMedicationsView({ patientName }: Props) {
  const [statusTab, setStatusTab] = useState<MedStatus>("active");
  const [sortBy, setSortBy] = useState<"alpha" | "dimension" | "renewal">("alpha");
  const [search, setSearch] = useState("");

  const interactions = useMemo(() => detectInteractions(MOCK_MEDS), []);

  const filtered = useMemo(() => {
    let list = MOCK_MEDS.filter((m) => m.status === statusTab);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (m) =>
          m.name.toLowerCase().includes(q) ||
          m.indication.toLowerCase().includes(q) ||
          m.dimension.toLowerCase().includes(q),
      );
    }
    if (sortBy === "alpha") {
      list = [...list].sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortBy === "renewal") {
      list = [...list].sort((a, b) => (a.renewalDate || "").localeCompare(b.renewalDate || ""));
    }
    return list;
  }, [statusTab, sortBy, search]);

  const grouped = useMemo(() => {
    if (sortBy !== "dimension") return null;
    const map = new Map<string, Medication[]>();
    filtered.forEach((m) => {
      const arr = map.get(m.dimension) || [];
      arr.push(m);
      map.set(m.dimension, arr);
    });
    // sort meds within group alphabetically
    Array.from(map.values()).forEach((arr) => arr.sort((a, b) => a.name.localeCompare(b.name)));
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [filtered, sortBy]);

  const interactingNames = useMemo(() => {
    const set = new Set<string>();
    interactions.forEach((i) => {
      set.add(i.drugs[0]);
      set.add(i.drugs[1]);
    });
    return set;
  }, [interactions]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-2xl font-semibold flex items-center gap-2">
            <Pill className="h-6 w-6 text-primary" />
            Medications
          </h2>
          <p className="text-sm text-muted-foreground">
            All current and past prescriptions for {patientName}.
          </p>
        </div>
        <Button size="sm" className="gap-1.5">
          <Plus className="h-4 w-4" /> Add Medication
        </Button>
      </div>

      {/* Interaction alerts */}
      {interactions.length > 0 && (
        <Card className="border-destructive/40">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              Drug Interaction Alerts
              <Badge variant="destructive" className="ml-1">{interactions.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 pt-0">
            {interactions.map((i, idx) => (
              <div
                key={idx}
                className={cn("border rounded-md p-2.5 flex items-start gap-2.5 text-xs", SEVERITY_STYLES[i.severity])}
              >
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="font-semibold text-foreground">
                      {i.drugs[0]} <span className="text-muted-foreground">×</span> {i.drugs[1]}
                    </span>
                    <Badge className={cn("text-[10px] uppercase tracking-wide", SEVERITY_BADGE[i.severity])}>
                      {i.severity}
                    </Badge>
                  </div>
                  <p className="text-foreground/80 leading-snug">{i.description}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Controls */}
      <div className="flex items-center gap-3 flex-wrap">
        <Tabs value={statusTab} onValueChange={(v) => setStatusTab(v as MedStatus)}>
          <TabsList>
            <TabsTrigger value="active">
              Current ({MOCK_MEDS.filter((m) => m.status === "active").length})
            </TabsTrigger>
            <TabsTrigger value="past">
              Past ({MOCK_MEDS.filter((m) => m.status === "past").length})
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name, indication..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-9"
          />
        </div>

        <Select value={sortBy} onValueChange={(v) => setSortBy(v as typeof sortBy)}>
          <SelectTrigger className="w-[200px] h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="alpha">Sort: Alphabetical</SelectItem>
            <SelectItem value="dimension">Sort: Health Dimension</SelectItem>
            {statusTab === "active" && <SelectItem value="renewal">Sort: Renewal Date</SelectItem>}
          </SelectContent>
        </Select>
      </div>

      {/* Medication list */}
      <ScrollArea className="flex-1">
        {filtered.length === 0 && (
          <p className="text-sm text-muted-foreground py-12 text-center border rounded-md border-dashed">
            No medications match your filters.
          </p>
        )}

        {sortBy === "dimension" && grouped ? (
          <div className="space-y-5">
            {grouped.map(([dim, meds]) => (
              <div key={dim} className="space-y-2">
                <div className="flex items-center gap-2 px-1">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {dim}
                  </h3>
                  <span className="text-xs text-muted-foreground">· {meds.length}</span>
                  <div className="flex-1 border-t border-border/60" />
                </div>
                <div className="space-y-2">
                  {meds.map((m) => (
                    <MedicationRow key={m.id} med={m} flagged={interactingNames.has(m.name)} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((m) => (
              <MedicationRow key={m.id} med={m} flagged={interactingNames.has(m.name)} />
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}

function MedicationRow({ med, flagged }: { med: Medication; flagged: boolean }) {
  const remainingPct = med.totalPills > 0 ? (med.remainingPills / med.totalPills) * 100 : 0;
  const renewIn = daysUntil(med.renewalDate);
  const lowSupply = med.status === "active" && remainingPct < 20;
  const renewSoon = renewIn !== null && renewIn <= 30 && renewIn >= 0;

  return (
    <div
      className={cn(
        "border rounded-lg p-3 bg-card hover:bg-muted/30 transition-colors",
        flagged && "border-destructive/50",
      )}
    >
      <div className="grid grid-cols-12 gap-3 items-start">
        {/* Name + indication */}
        <div className="col-span-12 md:col-span-3 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-semibold text-sm">{med.name}</span>
            {flagged && (
              <Badge variant="destructive" className="text-[10px] gap-1 px-1.5">
                <AlertTriangle className="h-2.5 w-2.5" /> Interaction
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground truncate">{med.indication}</p>
          <p className="text-[11px] text-muted-foreground/80 mt-0.5">{med.dimension}</p>
        </div>

        {/* Dose & frequency */}
        <div className="col-span-6 md:col-span-2">
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Dose</p>
          <p className="text-sm font-medium">{med.dose}</p>
          <p className="text-xs text-muted-foreground leading-tight">{med.frequency}</p>
        </div>

        {/* Dates */}
        <div className="col-span-6 md:col-span-3 grid grid-cols-2 gap-2">
          <div>
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Start</p>
            <p className="text-xs font-medium">{fmtDate(med.startDate)}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
              {med.status === "past" ? "End" : "Renewal"}
            </p>
            <p className={cn(
              "text-xs font-medium flex items-center gap-1",
              renewSoon && "text-amber-600 dark:text-amber-400",
            )}>
              {med.status === "past" ? fmtDate(med.endDate) : fmtDate(med.renewalDate)}
              {renewSoon && <CalendarIcon className="h-3 w-3" />}
            </p>
            {med.status === "active" && renewIn !== null && (
              <p className="text-[10px] text-muted-foreground">
                {renewIn >= 0 ? `in ${renewIn}d` : `${Math.abs(renewIn)}d overdue`}
              </p>
            )}
          </div>
        </div>

        {/* Supply */}
        <div className="col-span-12 md:col-span-4">
          {med.status === "active" ? (
            <>
              <div className="flex items-center justify-between mb-1">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Supply remaining</p>
                <p className={cn(
                  "text-xs font-medium",
                  lowSupply && "text-destructive",
                )}>
                  {med.remainingPills} / {med.totalPills}
                  {lowSupply && " · low"}
                </p>
              </div>
              <Progress
                value={remainingPct}
                className={cn("h-1.5", lowSupply && "[&>div]:bg-destructive")}
              />
            </>
          ) : (
            <div className="flex items-center justify-end h-full">
              <Badge variant="outline" className="text-[10px]">
                Completed
              </Badge>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
