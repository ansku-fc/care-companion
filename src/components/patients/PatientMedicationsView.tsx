import { useMemo, useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  AlertTriangle, Pill, Search, Plus, Calendar as CalendarIcon, RefreshCw, Check,
  MoreVertical, Pencil, Ban, FileText, Printer, ShieldCheck, MessageSquare, History,
  Clock, ChevronDown, ChevronRight, Replace, ScrollText, ListChecks,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { useTaskActions } from "@/components/tasks/TaskProvider";
import {
  CARTER_MEDICATIONS,
  CARTER_INTERACTIONS,
} from "@/lib/patientClinicalData";

type MedStatus = "active" | "past";

type MedNote = {
  id: string;
  text: string;
  author: string;
  at: string; // ISO
};

type Medication = {
  id: string;
  name: string;
  dose: string;
  frequency: string;
  indication: string;
  dimension: string;
  startDate: string;
  endDate?: string;
  remainingPills: number;
  totalPills: number;
  renewalDate?: string;
  status: MedStatus;
  prn?: boolean;
  discontinueReason?: string;
  discontinuedBy?: string;
  discontinuedAt?: string;
  notes?: MedNote[];
};

const CURRENT_DOCTOR = "Dr. M. Virtanen";

// Build initial medication list from the central source-of-truth (Carter, Jay-Z).
// All active meds come from CARTER_MEDICATIONS plus a couple of past records for UI completeness.
const INITIAL_MEDS: Medication[] = [
  ...CARTER_MEDICATIONS.map((m) => ({
    id: m.id,
    name: m.name,
    dose: m.dose,
    frequency: m.frequency,
    indication: m.indication,
    dimension: m.dimension,
    startDate: m.startDate,
    remainingPills: m.remainingPills,
    totalPills: m.totalPills,
    renewalDate: m.renewalDate,
    status: m.status,
    prn: m.prn,
  })),
  // Past medications (for the "Past" tab)
  { id: "m-past-1", name: "Aspirin", dose: "100 mg", frequency: "Once daily", indication: "Cardiovascular risk", dimension: "Cardiovascular Health", startDate: "2022-01-15", endDate: "2023-11-20", remainingPills: 0, totalPills: 90, status: "past", discontinueReason: "replaced" },
];

type Interaction = {
  drugs: [string, string];
  severity: "severe" | "moderate" | "mild";
  description: string;
};

// Drug interactions sourced from the central clinical data module.
const INTERACTIONS: Interaction[] = CARTER_INTERACTIONS.map((i) => ({
  drugs: i.drugs,
  severity: i.severity,
  description: i.description,
}));

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

const DISCONTINUE_REASONS = [
  { value: "completed_course", label: "Completed course" },
  { value: "side_effects", label: "Side effects" },
  { value: "patient_request", label: "Patient request" },
  { value: "replaced", label: "Replaced by another medication" },
  { value: "other", label: "Other" },
];

function fmtDate(iso?: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" });
}

function daysUntil(iso?: string): number | null {
  if (!iso) return null;
  const diff = new Date(iso).getTime() - Date.now();
  return Math.ceil(diff / 86_400_000);
}

// ---------- Alert action log ----------
type AlertAction =
  | { type: "acknowledge"; key: string; signature: string; severity: Interaction["severity"]; by: string; at: string }
  | { type: "override"; key: string; signature: string; severity: Interaction["severity"]; reason: string; reasonLabel: string; note?: string; by: string; at: string }
  | { type: "defer"; key: string; signature: string; severity: Interaction["severity"]; until: string; by: string; at: string }
  | { type: "resolve"; key: string; signature: string; severity: Interaction["severity"]; via: string; by: string; at: string }
  | { type: "resurface"; key: string; signature: string; severity: Interaction["severity"]; previousState: string; reason: string; at: string };

type AlertState =
  | { kind: "unactioned" }
  | { kind: "acknowledged"; signature: string; by: string; at: string }
  | { kind: "overridden"; signature: string; reason: string; reasonLabel: string; note?: string; by: string; at: string }
  | { kind: "deferred"; signature: string; until: string; by: string; at: string }
  | { kind: "resolved"; signature: string; via: string; by: string; at: string };

const OVERRIDE_REASONS = [
  { value: "short_term", label: "Short-term use / risk accepted" },
  { value: "no_alternative", label: "No suitable alternative" },
  { value: "patient_consent", label: "Patient informed and consenting" },
  { value: "other", label: "Other" },
];

function interactionKey(i: Interaction) {
  return [...i.drugs].sort().join("__");
}

function combinationSignature(meds: Medication[], i: Interaction): string {
  const activeNames = meds.filter((m) => m.status === "active").map((m) => m.name).sort().join(",");
  const a = meds.find((m) => m.name === i.drugs[0] && m.status === "active");
  const b = meds.find((m) => m.name === i.drugs[1] && m.status === "active");
  return `${activeNames}|${a?.dose}-${a?.frequency}|${b?.dose}-${b?.frequency}`;
}

const SEVERITY_ORDER: Record<Interaction["severity"], number> = { mild: 0, moderate: 1, severe: 2 };

interface Props {
  patientName: string;
  patientId?: string;
}

export function PatientMedicationsView({ patientName, patientId }: Props) {
  const { openNewTask } = useTaskActions();
  const [meds, setMeds] = useState<Medication[]>(INITIAL_MEDS);
  const [statusTab, setStatusTab] = useState<MedStatus>("active");
  const [sortBy, setSortBy] = useState<"alpha" | "dimension" | "renewal">("alpha");
  const [search, setSearch] = useState("");
  const [alertLog, setAlertLog] = useState<AlertAction[]>([]);
  const [showAuditLog, setShowAuditLog] = useState(false);
  const [showResolved, setShowResolved] = useState(false);
  const [expandedOverrides, setExpandedOverrides] = useState<Set<string>>(new Set());

  // Alert action dialog state
  const [overrideTarget, setOverrideTarget] = useState<Interaction | null>(null);
  const [overrideStep, setOverrideStep] = useState<1 | 2>(1);
  const [overrideReason, setOverrideReason] = useState("");
  const [overrideNote, setOverrideNote] = useState("");
  const [deferTarget, setDeferTarget] = useState<Interaction | null>(null);
  const [deferDate, setDeferDate] = useState("");
  const [resolveTarget, setResolveTarget] = useState<Interaction | null>(null);

  // Edit dialog state
  const [editing, setEditing] = useState<Medication | null>(null);
  // Discontinue 2-step state
  const [discontinueTarget, setDiscontinueTarget] = useState<Medication | null>(null);
  const [discontinueStep, setDiscontinueStep] = useState<1 | 2>(1);
  const [discontinueReason, setDiscontinueReason] = useState<string>("");
  const [discontinueNotes, setDiscontinueNotes] = useState("");
  // Note dialog
  const [noteTarget, setNoteTarget] = useState<Medication | null>(null);
  const [noteText, setNoteText] = useState("");

  const interactions = useMemo(() => detectInteractions(meds), [meds]);

  const filtered = useMemo(() => {
    let list = meds.filter((m) => m.status === statusTab);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (m) =>
          m.name.toLowerCase().includes(q) ||
          m.indication.toLowerCase().includes(q) ||
          m.dimension.toLowerCase().includes(q),
      );
    }
    if (sortBy === "alpha") list = [...list].sort((a, b) => a.name.localeCompare(b.name));
    else if (sortBy === "renewal") list = [...list].sort((a, b) => (a.renewalDate || "").localeCompare(b.renewalDate || ""));
    return list;
  }, [statusTab, sortBy, search, meds]);

  const grouped = useMemo(() => {
    if (sortBy !== "dimension") return null;
    const map = new Map<string, Medication[]>();
    filtered.forEach((m) => {
      const arr = map.get(m.dimension) || [];
      arr.push(m);
      map.set(m.dimension, arr);
    });
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

  // ---- Actions ----
  const updateMed = (id: string, patch: Partial<Medication>) => {
    setMeds((ms) => ms.map((m) => (m.id === id ? { ...m, ...patch } : m)));
  };

  const handleSaveEdit = (updated: Medication) => {
    updateMed(updated.id, updated);
    setEditing(null);
    toast({ title: "Medication updated", description: `${updated.name} — changes saved.` });
  };

  const handleTogglePRN = (m: Medication) => {
    const next = !m.prn;
    updateMed(m.id, { prn: next });
    toast({
      title: next ? "Marked as PRN" : "Marked as scheduled",
      description: `${m.name} is now ${next ? "as-needed" : "scheduled"}.`,
    });
  };

  const handleConfirmDiscontinue = () => {
    if (!discontinueTarget) return;
    const ts = new Date().toISOString();
    const target = discontinueTarget;
    updateMed(target.id, {
      status: "past",
      endDate: ts.slice(0, 10),
      discontinueReason,
      discontinuedBy: CURRENT_DOCTOR,
      discontinuedAt: ts,
    });
    toast({
      title: "Medication discontinued",
      description: `${target.name} discontinued by ${CURRENT_DOCTOR} · logged ${new Date(ts).toLocaleString()}`,
    });
    // If this discontinuation came from an alert "Resolve" flow, log a resolve event
    if (pendingResolveFor) {
      const i = INTERACTIONS.find((x) => interactionKey(x) === pendingResolveFor);
      if (i) {
        logAlertAction({
          type: "resolve", key: pendingResolveFor,
          signature: combinationSignature(meds, i),
          severity: i.severity,
          via: `Discontinued ${target.name}`,
          by: CURRENT_DOCTOR, at: ts,
        });
        toast({
          title: "Interaction resolved",
          description: `${i.drugs.join(" × ")} resolved by discontinuing ${target.name}.`,
        });
      }
      setPendingResolveFor(null);
    }
    setDiscontinueTarget(null);
    setDiscontinueStep(1);
    setDiscontinueReason("");
    setDiscontinueNotes("");
  };

  const handleAddNote = () => {
    if (!noteTarget || !noteText.trim()) return;
    const ts = new Date().toISOString();
    const note: MedNote = { id: `n${Date.now()}`, text: noteText.trim(), author: CURRENT_DOCTOR, at: ts };
    updateMed(noteTarget.id, { notes: [...(noteTarget.notes || []), note] });
    toast({ title: "Note added", description: `Logged on ${noteTarget.name}.` });
    setNoteTarget(null);
    setNoteText("");
  };



  // ---- Alert state derivation (latest action per interaction key) ----
  const alertStateByKey = useMemo(() => {
    const map = new Map<string, AlertState>();
    interactions.forEach((i) => map.set(interactionKey(i), { kind: "unactioned" }));
    alertLog.forEach((a) => { if (!map.has(a.key)) map.set(a.key, { kind: "unactioned" }); });
    const sortedLog = [...alertLog].sort((a, b) => a.at.localeCompare(b.at));
    sortedLog.forEach((a) => {
      if (a.type === "acknowledge") map.set(a.key, { kind: "acknowledged", signature: a.signature, by: a.by, at: a.at });
      else if (a.type === "override") map.set(a.key, { kind: "overridden", signature: a.signature, reason: a.reason, reasonLabel: a.reasonLabel, note: a.note, by: a.by, at: a.at });
      else if (a.type === "defer") map.set(a.key, { kind: "deferred", signature: a.signature, until: a.until, by: a.by, at: a.at });
      else if (a.type === "resolve") map.set(a.key, { kind: "resolved", signature: a.signature, via: a.via, by: a.by, at: a.at });
    });
    return map;
  }, [alertLog, interactions]);

  // Re-surface logic
  useEffect(() => {
    const now = new Date();
    const newEvents: AlertAction[] = [];
    interactions.forEach((i) => {
      const state = alertStateByKey.get(interactionKey(i));
      if (!state || state.kind === "unactioned" || state.kind === "resolved") return;
      const currentSig = combinationSignature(meds, i);
      if ("signature" in state && state.signature !== currentSig) {
        const latest = [...alertLog].reverse().find((a) => a.key === interactionKey(i));
        if (latest?.type === "resurface" && latest.signature === currentSig) return;
        newEvents.push({
          type: "resurface", key: interactionKey(i), signature: currentSig,
          severity: i.severity, previousState: state.kind,
          reason: "Combination changed (dose/frequency or medication added/removed)",
          at: now.toISOString(),
        });
        return;
      }
      if (state.kind === "deferred" && new Date(state.until) < now) {
        const latest = [...alertLog].reverse().find((a) => a.key === interactionKey(i));
        if (latest?.type === "resurface" && latest.reason.includes("Defer expired")) return;
        newEvents.push({
          type: "resurface", key: interactionKey(i), signature: currentSig,
          severity: i.severity, previousState: state.kind,
          reason: `Defer expired (was due ${state.until})`,
          at: now.toISOString(),
        });
      }
    });
    if (newEvents.length) setAlertLog((prev) => [...prev, ...newEvents]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meds, interactions]);

  const getDisplayState = (i: Interaction): AlertState => {
    const state = alertStateByKey.get(interactionKey(i));
    if (!state) return { kind: "unactioned" };
    const currentSig = combinationSignature(meds, i);
    if (state.kind !== "unactioned" && state.kind !== "resolved" && "signature" in state && state.signature !== currentSig) {
      return { kind: "unactioned" };
    }
    if (state.kind === "deferred" && new Date(state.until) < new Date()) {
      return { kind: "unactioned" };
    }
    return state;
  };

  const logAlertAction = (action: AlertAction) => setAlertLog((prev) => [...prev, action]);

  const handleSimpleAcknowledge = (i: Interaction) => {
    const ts = new Date().toISOString();
    logAlertAction({
      type: "acknowledge", key: interactionKey(i), signature: combinationSignature(meds, i),
      severity: i.severity, by: CURRENT_DOCTOR, at: ts,
    });
    toast({ title: "Mild interaction acknowledged", description: `${i.drugs.join(" × ")} reviewed.` });
  };

  const handleConfirmOverride = () => {
    if (!overrideTarget || !overrideReason) return;
    const ts = new Date().toISOString();
    const reasonLabel = OVERRIDE_REASONS.find((r) => r.value === overrideReason)?.label || overrideReason;
    logAlertAction({
      type: "override", key: interactionKey(overrideTarget),
      signature: combinationSignature(meds, overrideTarget),
      severity: overrideTarget.severity, reason: overrideReason, reasonLabel,
      note: overrideNote.trim() || undefined, by: CURRENT_DOCTOR, at: ts,
    });
    toast({ title: "Interaction overridden", description: `${overrideTarget.drugs.join(" × ")} — ${reasonLabel}` });
    setOverrideTarget(null); setOverrideStep(1); setOverrideReason(""); setOverrideNote("");
  };

  const handleConfirmDefer = () => {
    if (!deferTarget || !deferDate) return;
    const ts = new Date().toISOString();
    logAlertAction({
      type: "defer", key: interactionKey(deferTarget),
      signature: combinationSignature(meds, deferTarget),
      severity: deferTarget.severity, until: deferDate, by: CURRENT_DOCTOR, at: ts,
    });
    toast({
      title: "Alert deferred · task created",
      description: `${deferTarget.drugs.join(" × ")} — review by ${deferDate}. Added to Tasks.`,
    });
    setDeferTarget(null); setDeferDate("");
  };

  const handleResolveSelectMed = (medId: string) => {
    const i = resolveTarget;
    if (!i) return;
    const m = meds.find((mm) => mm.id === medId);
    if (!m) return;
    setResolveTarget(null);
    setDiscontinueTarget(m);
    setDiscontinueStep(1);
    setPendingResolveFor(interactionKey(i));
  };

  const [pendingResolveFor, setPendingResolveFor] = useState<string | null>(null);

  const maxDeferDate = (sev: Interaction["severity"]) => {
    if (sev !== "severe") return undefined;
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().slice(0, 10);
  };

  const handlePrint = () => {
    const win = window.open("", "_blank", "width=900,height=1000");
    if (!win) return;
    const active = meds.filter((m) => m.status === "active");
    const past = meds.filter((m) => m.status === "past");
    const row = (m: Medication) => `
      <tr>
        <td><strong>${m.name}</strong><br/><span style="color:#666;font-size:11px">${m.indication}</span></td>
        <td>${m.dose}${m.prn ? " <em>(PRN)</em>" : ""}</td>
        <td>${m.frequency}</td>
        <td>${fmtDate(m.startDate)}</td>
        <td>${m.status === "past" ? fmtDate(m.endDate) : (m.renewalDate ? fmtDate(m.renewalDate) : "—")}</td>
      </tr>`;
    win.document.write(`
      <html><head><title>Medication list — ${patientName}</title>
      <style>
        body { font-family: ui-sans-serif, system-ui, sans-serif; padding: 32px; color: #111; }
        h1 { margin: 0 0 4px; font-size: 20px; }
        h2 { margin: 24px 0 8px; font-size: 14px; text-transform: uppercase; letter-spacing: .05em; color: #555; border-bottom: 1px solid #ddd; padding-bottom: 4px; }
        table { width: 100%; border-collapse: collapse; font-size: 12px; }
        th, td { text-align: left; padding: 8px 10px; border-bottom: 1px solid #eee; vertical-align: top; }
        th { background: #f7f5f0; font-size: 11px; text-transform: uppercase; letter-spacing: .04em; color: #555; }
        .meta { color: #666; font-size: 11px; margin-top: 4px; }
        @media print { body { padding: 16px; } }
      </style></head><body>
        <h1>Medication list</h1>
        <div class="meta">Patient: <strong>${patientName}</strong> · Generated ${new Date().toLocaleString()} · Prepared by ${CURRENT_DOCTOR}</div>
        <h2>Current medications (${active.length})</h2>
        <table><thead><tr><th>Medication</th><th>Dose</th><th>Frequency</th><th>Started</th><th>Renewal</th></tr></thead>
        <tbody>${active.map(row).join("") || `<tr><td colspan="5" style="color:#999">None</td></tr>`}</tbody></table>
        <h2>Past medications (${past.length})</h2>
        <table><thead><tr><th>Medication</th><th>Dose</th><th>Frequency</th><th>Started</th><th>Ended</th></tr></thead>
        <tbody>${past.map(row).join("") || `<tr><td colspan="5" style="color:#999">None</td></tr>`}</tbody></table>
      </body></html>`);
    win.document.close();
    setTimeout(() => win.print(), 250);
  };

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
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" className="gap-1.5" onClick={handlePrint}>
            <Printer className="h-4 w-4" /> Export / Print
          </Button>
          <Button size="sm" className="gap-1.5">
            <Plus className="h-4 w-4" /> Add Medication
          </Button>
        </div>
      </div>

      {/* Interaction alerts */}
      {(interactions.length > 0 || alertLog.some((a) => a.type === "resolve")) && (
        <Card className="border-destructive/40">
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm flex items-center gap-2 flex-wrap">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              Drug Interaction Alerts
              {(() => {
                const unactioned = interactions.filter((i) => getDisplayState(i).kind === "unactioned").length;
                const overridden = interactions.filter((i) => getDisplayState(i).kind === "overridden").length;
                const deferred = interactions.filter((i) => getDisplayState(i).kind === "deferred").length;
                const acked = interactions.filter((i) => getDisplayState(i).kind === "acknowledged").length;
                return (
                  <>
                    {unactioned > 0 && <Badge variant="destructive" className="ml-1">{unactioned} requires action</Badge>}
                    {overridden > 0 && <Badge variant="outline" className="ml-1">{overridden} overridden</Badge>}
                    {deferred > 0 && <Badge variant="outline" className="ml-1">{deferred} deferred</Badge>}
                    {acked > 0 && <Badge variant="outline" className="ml-1">{acked} reviewed</Badge>}
                  </>
                );
              })()}
            </CardTitle>
            <Button variant="ghost" size="sm" className="h-7 text-[11px] gap-1" onClick={() => setShowAuditLog(true)}>
              <ScrollText className="h-3.5 w-3.5" /> Audit log
            </Button>
          </CardHeader>
          <CardContent className="space-y-2 pt-0">
            {interactions.map((i, idx) => {
              const state = getDisplayState(i);
              const key = interactionKey(i);
              const lastResurface = [...alertLog].reverse().find((a) => a.key === key && a.type === "resurface") as Extract<AlertAction, { type: "resurface" }> | undefined;
              const showResurfaceBadge =
                lastResurface &&
                state.kind === "unactioned" &&
                lastResurface.signature === combinationSignature(meds, i);

              if (state.kind === "acknowledged") {
                return (
                  <div key={idx} className="border rounded-md px-2.5 py-1.5 flex items-center gap-2 text-xs bg-muted/30">
                    <ShieldCheck className="h-3.5 w-3.5 text-primary shrink-0" />
                    <span className="font-medium">{i.drugs[0]} × {i.drugs[1]}</span>
                    <Badge variant="outline" className="text-[10px]">reviewed</Badge>
                    <span className="text-muted-foreground ml-auto text-[11px]">
                      by {state.by} · {new Date(state.at).toLocaleString()}
                    </span>
                  </div>
                );
              }

              if (state.kind === "overridden") {
                const expanded = expandedOverrides.has(key);
                return (
                  <div key={idx} className="border rounded-md bg-muted/30 text-xs">
                    <button
                      className="w-full px-2.5 py-1.5 flex items-center gap-2 text-left"
                      onClick={() => {
                        const next = new Set(expandedOverrides);
                        if (expanded) next.delete(key); else next.add(key);
                        setExpandedOverrides(next);
                      }}
                    >
                      {expanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                      <span className="font-medium">{i.drugs[0]} × {i.drugs[1]}</span>
                      <Badge variant="outline" className="text-[10px]">overridden</Badge>
                      <Badge className={cn("text-[10px] uppercase", SEVERITY_BADGE[i.severity])}>{i.severity}</Badge>
                      <span className="text-muted-foreground ml-auto text-[11px]">
                        {state.reasonLabel} · {state.by} · {new Date(state.at).toLocaleString()}
                      </span>
                    </button>
                    {expanded && (
                      <div className="px-3 pb-2 pt-0 space-y-1 text-[11px] text-muted-foreground border-t">
                        <p className="pt-2"><span className="font-medium text-foreground">Reason:</span> {state.reasonLabel}</p>
                        {state.note && <p><span className="font-medium text-foreground">Note:</span> {state.note}</p>}
                        <p><span className="font-medium text-foreground">Original alert:</span> {i.description}</p>
                      </div>
                    )}
                  </div>
                );
              }

              if (state.kind === "deferred") {
                return (
                  <div key={idx} className="border rounded-md px-2.5 py-1.5 flex items-center gap-2 text-xs bg-muted/40 border-dashed">
                    <Clock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <span className="font-medium">{i.drugs[0]} × {i.drugs[1]}</span>
                    <Badge className={cn("text-[10px] uppercase", SEVERITY_BADGE[i.severity])}>{i.severity}</Badge>
                    <Badge variant="outline" className="text-[10px]">Deferred until {state.until}</Badge>
                    <span className="text-muted-foreground ml-auto text-[11px]">by {state.by}</span>
                  </div>
                );
              }

              const isMild = i.severity === "mild";
              return (
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
                      {showResurfaceBadge && (
                        <Badge variant="outline" className="text-[10px] gap-1 border-amber-500/50 text-amber-700 dark:text-amber-400">
                          <History className="h-2.5 w-2.5" /> Re-surfaced — {lastResurface!.reason}
                        </Badge>
                      )}
                    </div>
                    <p className="text-foreground/80 leading-snug mb-2">{i.description}</p>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {isMild ? (
                        <Button size="sm" variant="outline" className="h-7 px-2 text-[11px] gap-1" onClick={() => handleSimpleAcknowledge(i)}>
                          <ShieldCheck className="h-3 w-3" /> Acknowledge
                        </Button>
                      ) : (
                        <>
                          <Button size="sm" variant="default" className="h-7 px-2 text-[11px] gap-1" onClick={() => setResolveTarget(i)}>
                            <Replace className="h-3 w-3" /> Resolve
                          </Button>
                          <Button size="sm" variant="outline" className="h-7 px-2 text-[11px] gap-1" onClick={() => { setOverrideTarget(i); setOverrideStep(1); setOverrideReason(""); setOverrideNote(""); }}>
                            <ShieldCheck className="h-3 w-3" /> Override with reason
                          </Button>
                          <Button size="sm" variant="outline" className="h-7 px-2 text-[11px] gap-1" onClick={() => { setDeferTarget(i); setDeferDate(""); }}>
                            <Clock className="h-3 w-3" /> Defer
                            {i.severity === "severe" && <span className="opacity-70 ml-0.5">· max 7d</span>}
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {(() => {
              const resolved = alertLog.filter((a) => a.type === "resolve") as Extract<AlertAction, { type: "resolve" }>[];
              if (resolved.length === 0) return null;
              const latestByKey = new Map<string, typeof resolved[number]>();
              resolved.forEach((r) => latestByKey.set(r.key, r));
              const list = Array.from(latestByKey.values());
              return (
                <div className="border rounded-md bg-muted/20 text-xs mt-2">
                  <button
                    className="w-full px-2.5 py-1.5 flex items-center gap-2 text-left"
                    onClick={() => setShowResolved((s) => !s)}
                  >
                    {showResolved ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                    <Check className="h-3.5 w-3.5 text-primary" />
                    <span className="font-medium">Resolved alerts</span>
                    <Badge variant="outline" className="text-[10px]">{list.length}</Badge>
                  </button>
                  {showResolved && (
                    <div className="px-3 pb-2 pt-0 space-y-1 border-t">
                      {list.map((r, ix) => {
                        const drugs = r.key.split("__");
                        return (
                          <div key={ix} className="flex items-center gap-2 text-[11px] py-1">
                            <Check className="h-3 w-3 text-primary" />
                            <span className="font-medium text-foreground">{drugs.join(" × ")}</span>
                            <span className="text-muted-foreground">{r.via}</span>
                            <span className="text-muted-foreground ml-auto">by {r.by} · {new Date(r.at).toLocaleString()}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })()}
          </CardContent>
        </Card>
      )}

      {/* Controls */}
      <div className="flex items-center gap-3 flex-wrap">
        <Tabs value={statusTab} onValueChange={(v) => setStatusTab(v as MedStatus)}>
          <TabsList>
            <TabsTrigger value="active">Current ({meds.filter((m) => m.status === "active").length})</TabsTrigger>
            <TabsTrigger value="past">Past ({meds.filter((m) => m.status === "past").length})</TabsTrigger>
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
          <SelectTrigger className="w-[200px] h-9"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="alpha">Sort: Alphabetical</SelectItem>
            <SelectItem value="dimension">Sort: Health Dimension</SelectItem>
            {statusTab === "active" && <SelectItem value="renewal">Sort: Renewal Date</SelectItem>}
          </SelectContent>
        </Select>
      </div>

      {/* List */}
      <ScrollArea className="flex-1">
        {filtered.length === 0 && (
          <p className="text-sm text-muted-foreground py-12 text-center border rounded-md border-dashed">
            No medications match your filters.
          </p>
        )}

        {sortBy === "dimension" && grouped ? (
          <div className="space-y-5">
            {grouped.map(([dim, ms]) => (
              <div key={dim} className="space-y-2">
                <div className="flex items-center gap-2 px-1">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{dim}</h3>
                  <span className="text-xs text-muted-foreground">· {ms.length}</span>
                  <div className="flex-1 border-t border-border/60" />
                </div>
                <div className="space-y-2">
                  {ms.map((m) => (
                    <MedicationRow
                      key={m.id} med={m}
                      flagged={interactingNames.has(m.name)}
                      onEdit={() => setEditing(m)}
                      onDiscontinue={() => { setDiscontinueTarget(m); setDiscontinueStep(1); }}
                      onTogglePRN={() => handleTogglePRN(m)}
                      onAddNote={() => { setNoteTarget(m); setNoteText(""); }}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((m) => (
              <MedicationRow
                key={m.id} med={m}
                flagged={interactingNames.has(m.name)}
                onEdit={() => setEditing(m)}
                onDiscontinue={() => { setDiscontinueTarget(m); setDiscontinueStep(1); }}
                onTogglePRN={() => handleTogglePRN(m)}
                onAddNote={() => { setNoteTarget(m); setNoteText(""); }}
              />
            ))}
          </div>
        )}
      </ScrollArea>

      {/* Edit dialog */}
      {editing && (
        <EditMedicationDialog
          med={editing}
          onClose={() => setEditing(null)}
          onSave={handleSaveEdit}
        />
      )}

      {/* Discontinue dialog (2-step) */}
      <Dialog open={!!discontinueTarget} onOpenChange={(o) => { if (!o) { setDiscontinueTarget(null); setDiscontinueStep(1); setDiscontinueReason(""); setDiscontinueNotes(""); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Ban className="h-5 w-5 text-destructive" />
              Discontinue {discontinueTarget?.name}
            </DialogTitle>
            <DialogDescription>
              {discontinueStep === 1
                ? "This is a clinical event and will be permanently logged with your name and a timestamp."
                : "Confirm — this medication will be moved to the past list. This cannot be undone from this view."}
            </DialogDescription>
          </DialogHeader>

          {discontinueStep === 1 ? (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label>Reason <span className="text-destructive">*</span></Label>
                <Select value={discontinueReason} onValueChange={setDiscontinueReason}>
                  <SelectTrigger><SelectValue placeholder="Select a reason..." /></SelectTrigger>
                  <SelectContent>
                    {DISCONTINUE_REASONS.map((r) => (
                      <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Additional notes (optional)</Label>
                <Textarea value={discontinueNotes} onChange={(e) => setDiscontinueNotes(e.target.value)} rows={2} />
              </div>
            </div>
          ) : (
            <div className="rounded-md border bg-muted/40 p-3 text-sm space-y-1">
              <p><span className="text-muted-foreground">Medication:</span> <strong>{discontinueTarget?.name} {discontinueTarget?.dose}</strong></p>
              <p><span className="text-muted-foreground">Reason:</span> {DISCONTINUE_REASONS.find((r) => r.value === discontinueReason)?.label}</p>
              <p><span className="text-muted-foreground">Logged by:</span> {CURRENT_DOCTOR}</p>
              <p><span className="text-muted-foreground">Timestamp:</span> {new Date().toLocaleString()}</p>
            </div>
          )}

          <DialogFooter>
            {discontinueStep === 1 ? (
              <>
                <Button variant="outline" onClick={() => setDiscontinueTarget(null)}>Cancel</Button>
                <Button
                  variant="destructive"
                  disabled={!discontinueReason}
                  onClick={() => setDiscontinueStep(2)}
                >
                  Continue
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" onClick={() => setDiscontinueStep(1)}>Back</Button>
                <Button variant="destructive" onClick={handleConfirmDiscontinue}>
                  Confirm discontinuation
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Note dialog */}
      <Dialog open={!!noteTarget} onOpenChange={(o) => { if (!o) { setNoteTarget(null); setNoteText(""); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-primary" />
              Add note · {noteTarget?.name}
            </DialogTitle>
            <DialogDescription>
              Log a clinical observation, adherence concern, or flag.
            </DialogDescription>
          </DialogHeader>
          {noteTarget && noteTarget.notes && noteTarget.notes.length > 0 && (
            <div className="space-y-1.5 max-h-32 overflow-y-auto border rounded-md p-2 bg-muted/30">
              {noteTarget.notes.map((n) => (
                <div key={n.id} className="text-xs">
                  <p>{n.text}</p>
                  <p className="text-muted-foreground text-[10px]">— {n.author} · {new Date(n.at).toLocaleString()}</p>
                </div>
              ))}
            </div>
          )}
          <Textarea
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            rows={3}
            placeholder="e.g. Patient reports occasional missed evening doses."
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setNoteTarget(null)}>Cancel</Button>
            <Button onClick={handleAddNote} disabled={!noteText.trim()}>Save note</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Resolve dialog — pick which med to discontinue */}
      <Dialog open={!!resolveTarget} onOpenChange={(o) => { if (!o) setResolveTarget(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Replace className="h-5 w-5 text-primary" />
              Resolve interaction
            </DialogTitle>
            <DialogDescription>
              Select which medication to discontinue. The discontinue flow will open pre-filled.
            </DialogDescription>
          </DialogHeader>
          {resolveTarget && (
            <div className="space-y-2">
              {resolveTarget.drugs.map((drugName) => {
                const m = meds.find((mm) => mm.name === drugName && mm.status === "active");
                if (!m) return null;
                return (
                  <button
                    key={m.id}
                    onClick={() => handleResolveSelectMed(m.id)}
                    className="w-full border rounded-md p-3 text-left hover:bg-muted/40 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-sm">{m.name} {m.dose}</p>
                        <p className="text-xs text-muted-foreground">{m.indication} · {m.frequency}</p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </button>
                );
              })}
            </div>
          )}
          <DialogFooter className="gap-2 sm:gap-2">
            {resolveTarget && (
              <Button
                variant="outline"
                onClick={() => {
                  const drugs = resolveTarget.drugs.join(" × ");
                  openNewTask({
                    title: `Book pharmacist review — ${drugs}`,
                    patient_id: patientId ?? null,
                    category: "care_coordination",
                    priority: resolveTarget.severity === "severe" ? "urgent" : "high",
                    assignee_name: "Nurse Mäkinen",
                    created_from: `${drugs} interaction`,
                    description: resolveTarget.description,
                  });
                  setResolveTarget(null);
                }}
              >
                <ListChecks className="h-3.5 w-3.5" /> Create task instead
              </Button>
            )}
            <Button variant="outline" onClick={() => setResolveTarget(null)}>Cancel</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Override dialog */}
      <Dialog open={!!overrideTarget} onOpenChange={(o) => { if (!o) { setOverrideTarget(null); setOverrideStep(1); setOverrideReason(""); setOverrideNote(""); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary" />
              Override interaction
            </DialogTitle>
            <DialogDescription>
              {overrideTarget && (
                <>
                  {overrideTarget.drugs[0]} × {overrideTarget.drugs[1]} —{" "}
                  <span className="uppercase font-medium">{overrideTarget.severity}</span>.
                  This decision will be permanently logged.
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          {overrideStep === 1 ? (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label>Reason <span className="text-destructive">*</span></Label>
                <Select value={overrideReason} onValueChange={setOverrideReason}>
                  <SelectTrigger><SelectValue placeholder="Select a reason..." /></SelectTrigger>
                  <SelectContent>
                    {OVERRIDE_REASONS.map((r) => (
                      <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>
                  {overrideTarget?.severity === "severe" ? "Written justification (required)" : "Additional note (optional)"}
                </Label>
                <Textarea
                  value={overrideNote}
                  onChange={(e) => setOverrideNote(e.target.value)}
                  rows={3}
                  placeholder="Clinical rationale, monitoring plan, patient discussion..."
                />
              </div>
            </div>
          ) : (
            <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm space-y-1">
              <p className="font-semibold text-destructive flex items-center gap-1.5">
                <AlertTriangle className="h-4 w-4" /> Confirm override of SEVERE interaction
              </p>
              <p className="text-muted-foreground text-xs pt-1">
                Are you sure you want to override a severe interaction? This will be logged with your name and timestamp for regulatory audit (THL, EU AI Act).
              </p>
            </div>
          )}

          <DialogFooter>
            {overrideStep === 1 ? (
              <>
                <Button variant="outline" onClick={() => setOverrideTarget(null)}>Cancel</Button>
                <Button
                  disabled={!overrideReason || (overrideTarget?.severity === "severe" && !overrideNote.trim())}
                  onClick={() => {
                    if (overrideTarget?.severity === "severe") setOverrideStep(2);
                    else handleConfirmOverride();
                  }}
                >
                  {overrideTarget?.severity === "severe" ? "Continue" : "Confirm override"}
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" onClick={() => setOverrideStep(1)}>Back</Button>
                <Button variant="destructive" onClick={handleConfirmOverride}>Yes, override severe interaction</Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Defer dialog */}
      <Dialog open={!!deferTarget} onOpenChange={(o) => { if (!o) { setDeferTarget(null); setDeferDate(""); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              Defer alert
            </DialogTitle>
            <DialogDescription>
              {deferTarget && (
                <>
                  {deferTarget.drugs[0]} × {deferTarget.drugs[1]} — set a follow-up date. A task will be created in the Tasks view.
                  {deferTarget.severity === "severe" && (
                    <span className="block mt-1 text-destructive font-medium">Severe interactions may not be deferred beyond 7 days.</span>
                  )}
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label>Review by <span className="text-destructive">*</span></Label>
            <Input
              type="date"
              value={deferDate}
              min={new Date().toISOString().slice(0, 10)}
              max={deferTarget ? maxDeferDate(deferTarget.severity) : undefined}
              onChange={(e) => setDeferDate(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeferTarget(null)}>Cancel</Button>
            <Button onClick={handleConfirmDefer} disabled={!deferDate}>Defer & create task</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Audit log dialog */}
      <Dialog open={showAuditLog} onOpenChange={setShowAuditLog}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ScrollText className="h-5 w-5 text-primary" />
              Interaction alert audit log
            </DialogTitle>
            <DialogDescription>
              All actions taken on drug interaction alerts. Required for regulatory compliance (THL, EU AI Act).
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh]">
            {alertLog.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">No actions logged yet.</p>
            ) : (
              <div className="space-y-1.5">
                {[...alertLog].reverse().map((a, idx) => {
                  const drugs = a.key.split("__").join(" × ");
                  const labels: Record<AlertAction["type"], string> = {
                    acknowledge: "Acknowledged",
                    override: "Overridden",
                    defer: "Deferred",
                    resolve: "Resolved",
                    resurface: "Re-surfaced",
                  };
                  return (
                    <div key={idx} className="border rounded-md p-2 text-xs flex items-start gap-2">
                      <Badge variant="outline" className="text-[10px] shrink-0">{labels[a.type]}</Badge>
                      <Badge className={cn("text-[10px] uppercase shrink-0", SEVERITY_BADGE[a.severity])}>{a.severity}</Badge>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium">{drugs}</p>
                        <p className="text-muted-foreground text-[11px]">
                          {a.type === "override" && `Reason: ${a.reasonLabel}${a.note ? ` — ${a.note}` : ""}`}
                          {a.type === "defer" && `Until: ${a.until}`}
                          {a.type === "resolve" && a.via}
                          {a.type === "resurface" && a.reason}
                          {a.type === "acknowledge" && "Mild interaction acknowledged"}
                        </p>
                      </div>
                      <div className="text-[11px] text-muted-foreground text-right shrink-0">
                        {a.type !== "resurface" && <p>{a.by}</p>}
                        <p>{new Date(a.at).toLocaleString()}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ---------------- Edit dialog ----------------
function EditMedicationDialog({ med, onClose, onSave }: { med: Medication; onClose: () => void; onSave: (m: Medication) => void; }) {
  const [dose, setDose] = useState(med.dose);
  const [frequency, setFrequency] = useState(med.frequency);
  const [indication, setIndication] = useState(med.indication);

  useEffect(() => {
    setDose(med.dose);
    setFrequency(med.frequency);
    setIndication(med.indication);
  }, [med]);

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="h-5 w-5 text-primary" />
            Edit {med.name}
          </DialogTitle>
          <DialogDescription>Update dose, frequency, or indication.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Dose</Label>
            <Input value={dose} onChange={(e) => setDose(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Frequency</Label>
            <Input value={frequency} onChange={(e) => setFrequency(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Indication</Label>
            <Input value={indication} onChange={(e) => setIndication(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => onSave({ ...med, dose, frequency, indication })}>Save changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------------- Row ----------------
function MedicationRow({
  med, flagged, onEdit, onDiscontinue, onTogglePRN, onAddNote, patientId, patientName,
}: {
  med: Medication;
  flagged: boolean;
  onEdit: () => void;
  onDiscontinue: () => void;
  onTogglePRN: () => void;
  onAddNote: () => void;
  patientId?: string;
  patientName?: string;
}) {
  const { openNewTask } = useTaskActions();
  const [renewed, setRenewed] = useState(false);
  const remainingPct = med.totalPills > 0 ? (med.remainingPills / med.totalPills) * 100 : 0;
  const renewIn = daysUntil(med.renewalDate);
  const lowSupply = med.status === "active" && remainingPct < 25;
  const renewSoon = renewIn !== null && renewIn <= 30 && renewIn >= 0;
  const renewOverdue = renewIn !== null && renewIn < 0;
  const showRenewBtn = med.status === "active" && (renewSoon || renewOverdue || lowSupply) && !renewed;
  const renewReason = renewOverdue ? "overdue" : renewSoon ? "renewal soon" : "low supply";

  const handleRenew = () => {
    setRenewed(true);
    toast({
      title: "Prescription renewed",
      description: `${med.name} ${med.dose} — renewal request sent to pharmacy.`,
    });
  };

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
            {med.prn && (
              <Badge variant="outline" className="text-[10px] border-primary/50 text-primary">PRN</Badge>
            )}
            {flagged && (
              <Badge variant="destructive" className="text-[10px] gap-1 px-1.5">
                <AlertTriangle className="h-2.5 w-2.5" /> Interaction
              </Badge>
            )}
            {med.notes && med.notes.length > 0 && (
              <Badge variant="outline" className="text-[10px] gap-1">
                <MessageSquare className="h-2.5 w-2.5" /> {med.notes.length}
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground truncate">{med.indication}</p>
          <p className="text-[11px] text-muted-foreground/80 mt-0.5">{med.dimension}</p>
          {med.status === "past" && med.discontinueReason && (
            <p className="text-[10px] text-muted-foreground mt-1 italic">
              Discontinued: {DISCONTINUE_REASONS.find((r) => r.value === med.discontinueReason)?.label}
              {med.discontinuedBy && ` · ${med.discontinuedBy}`}
            </p>
          )}
        </div>

        {/* Dose & frequency */}
        <div className="col-span-6 md:col-span-2">
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Dose</p>
          <p className="text-sm font-medium">{med.dose}</p>
          <p className="text-xs text-muted-foreground leading-tight">{med.frequency}</p>
        </div>

        {/* Dates */}
        <div className="col-span-6 md:col-span-3">
          <div className="grid grid-cols-2 gap-2">
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
                renewOverdue && "text-destructive",
              )}>
                {med.status === "past" ? fmtDate(med.endDate) : fmtDate(med.renewalDate)}
                {(renewSoon || renewOverdue) && <CalendarIcon className="h-3 w-3" />}
              </p>
              {med.status === "active" && renewIn !== null && (
                <p className={cn(
                  "text-[10px] text-muted-foreground",
                  renewOverdue && "text-destructive",
                )}>
                  {renewIn >= 0 ? `in ${renewIn}d` : `${Math.abs(renewIn)}d overdue`}
                </p>
              )}
            </div>
          </div>
          {showRenewBtn && (
            <Button
              size="sm"
              variant={renewOverdue ? "destructive" : "default"}
              onClick={handleRenew}
              className="h-7 px-2 mt-2 text-[11px] gap-1"
            >
              <RefreshCw className="h-3 w-3" />
              Renew prescription
              <span className="text-[10px] opacity-80 ml-1">· {renewReason}</span>
            </Button>
          )}
          {renewed && (
            <Badge variant="outline" className="mt-2 text-[10px] gap-1 border-primary/50 text-primary">
              <Check className="h-2.5 w-2.5" /> Renewal sent
            </Badge>
          )}
        </div>

        {/* Supply + actions */}
        <div className="col-span-12 md:col-span-4">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              {med.status === "active" ? (
                <>
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Supply remaining</p>
                    <p className={cn("text-xs font-medium", lowSupply && "text-destructive")}>
                      {med.remainingPills} / {med.totalPills}
                      {lowSupply && " · low"}
                    </p>
                  </div>
                  <Progress
                    value={remainingPct}
                    className={cn("h-1.5", lowSupply && "[&>div]:bg-destructive")}
                  />
                  <div className="flex items-center justify-between mt-2 gap-2">
                    <label className="flex items-center gap-1.5 text-[11px] text-muted-foreground cursor-pointer">
                      <Switch checked={!!med.prn} onCheckedChange={onTogglePRN} className="scale-75 -my-1" />
                      PRN (as needed)
                    </label>
                  </div>
                </>
              ) : (
                <div className="flex items-center justify-end h-full">
                  <Badge variant="outline" className="text-[10px]">Completed</Badge>
                </div>
              )}
            </div>

            {/* Actions menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={onEdit} disabled={med.status === "past"}>
                  <Pencil className="h-3.5 w-3.5" /> Edit
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onTogglePRN} disabled={med.status === "past"}>
                  <FileText className="h-3.5 w-3.5" /> {med.prn ? "Mark as scheduled" : "Mark as PRN"}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onAddNote}>
                  <MessageSquare className="h-3.5 w-3.5" /> Add note / flag
                </DropdownMenuItem>
                {med.status === "active" && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={onDiscontinue} className="text-destructive focus:text-destructive">
                      <Ban className="h-3.5 w-3.5" /> Discontinue
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </div>
  );
}
