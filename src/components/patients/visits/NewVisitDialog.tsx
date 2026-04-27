// Dialog for creating a new visit (any type) with optional lab order.
// Saves to visit_notes (with structured columns) + optional lab_orders + appointments
// + auto-creates the nurse "Prepare & send lab order" task when applicable.

import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FlaskConical, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  VISIT_TYPES, VISIT_MODES, type VisitType, type VisitMode,
  LAB_PACKAGES, type LabPackageKey, ALL_MARKERS, markersForPackages,
  defaultLabOrderToggle, isLabOrderRequired, visitTypeLabel,
} from "@/lib/labOrders";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  patientId: string;
  patientName: string;
  onCreated: () => void;
}

const DOCTORS = ["Dr. Laine", "Dr. Virtanen"];
const NURSES  = ["Nurse Mäkinen", "Nurse Korhonen"];

export function NewVisitDialog({ open, onOpenChange, patientId, patientName, onCreated }: Props) {
  const { user } = useAuth();
  const today = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState(today);
  const [time, setTime] = useState("09:00");
  const [visitType, setVisitType] = useState<VisitType>("annual_checkup");
  const [visitMode, setVisitMode] = useState<VisitMode>("in_person");
  const [doctor, setDoctor] = useState("Dr. Laine");
  const [nurse, setNurse] = useState<string>("");
  const [internalNote, setInternalNote] = useState("");
  const [labOrderOn, setLabOrderOn] = useState(true);
  const [pkgs, setPkgs] = useState<LabPackageKey[]>(["basic"]);
  const [customMarkers, setCustomMarkers] = useState<string[]>([]);
  const [customSearch, setCustomSearch] = useState("");
  const [inviteNurse, setInviteNurse] = useState(true);
  const [invitePatient, setInvitePatient] = useState(false);
  const [saving, setSaving] = useState(false);

  // Reset every time the dialog reopens.
  useEffect(() => {
    if (!open) return;
    setDate(today);
    setTime("09:00");
    setVisitType("annual_checkup");
    setVisitMode("in_person");
    setDoctor("Dr. Laine");
    setNurse("");
    setInternalNote("");
    setLabOrderOn(defaultLabOrderToggle("annual_checkup"));
    setPkgs(["basic"]);
    setCustomMarkers([]);
    setCustomSearch("");
    setInviteNurse(true);
    setInvitePatient(false);
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  // Update toggle default when visit type changes.
  useEffect(() => {
    setLabOrderOn(defaultLabOrderToggle(visitType));
  }, [visitType]);

  const togglePkg = (k: LabPackageKey) => {
    setPkgs((prev) => prev.includes(k) ? prev.filter((p) => p !== k) : [...prev, k]);
  };

  const allMarkers = useMemo(
    () => Array.from(new Set([...markersForPackages(pkgs), ...customMarkers])),
    [pkgs, customMarkers]
  );

  const filteredCustom = useMemo(() => {
    if (!customSearch.trim()) return [];
    const q = customSearch.toLowerCase();
    return ALL_MARKERS.filter((m) => m.toLowerCase().includes(q) && !customMarkers.includes(m)).slice(0, 8);
  }, [customSearch, customMarkers]);

  const labRequired = isLabOrderRequired(visitType);
  const labOn = labRequired || labOrderOn;

  const handleSave = async () => {
    if (!user) { toast.error("Not authenticated"); return; }
    setSaving(true);
    try {
      const startISO = new Date(`${date}T${time}:00`).toISOString();
      const endISO = new Date(new Date(`${date}T${time}:00`).getTime() + 45 * 60 * 1000).toISOString();

      // 1. Create lab order first (so visit_notes can reference it)
      let labOrderId: string | null = null;
      if (labOn && allMarkers.length > 0) {
        const { data: lo, error: loErr } = await supabase.from("lab_orders").insert({
          patient_id: patientId,
          packages: pkgs,
          markers: allMarkers,
          status: "pending",
          internal_note: internalNote || null,
          created_by: user.id,
        }).select("id").single();
        if (loErr) throw loErr;
        labOrderId = lo.id;
      }

      // 2. Create the visit_notes record (auto-id idempotency not needed — fresh insert)
      const visitTitle = visitTypeLabel(visitType);
      const { data: vn, error: vnErr } = await supabase.from("visit_notes").insert({
        patient_id: patientId,
        provider_id: user.id,
        visit_date: date,
        chief_complaint: visitTitle,
        visit_type: visitType,
        visit_mode: visitMode,
        visit_time: time,
        attending_doctor: doctor,
        attending_nurse: nurse || null,
        internal_note_to_nurse: internalNote || null,
        lab_order_id: labOrderId,
        vitals: { visit_type: visitType, visit_mode: visitMode, attending_doctor: doctor, status: "scheduled" },
      }).select("id").single();
      if (vnErr) throw vnErr;

      // Link the lab order back to visit
      if (labOrderId) {
        await supabase.from("lab_orders").update({ visit_id: vn.id }).eq("id", labOrderId);
      }

      // 3. Create appointment so the visit shows on the calendar / upcoming list
      await supabase.from("appointments").insert({
        patient_id: patientId,
        provider_id: user.id,
        title: `${visitTitle} — ${patientName}`,
        appointment_type: visitType === "annual_checkup" ? "check_up" : visitType === "acute" ? "urgent" : "consultation",
        start_time: startISO,
        end_time: endISO,
        visit_modality: visitMode === "remote" ? "remote" : "in_person",
        is_home_visit: visitMode === "home",
        is_onboarding: visitType === "onboarding",
        is_labs: visitType === "laboratory",
        is_nurse_visit: !!nurse,
        notes: internalNote || null,
      });

      // 4. Auto-create nurse task for the lab order
      if (labOrderId) {
        const assignee = nurse || "Dr. Laine";
        await supabase.from("tasks").insert({
          title: `Prepare & send lab order — ${patientName}`,
          description: `Markers (${allMarkers.length}): ${allMarkers.join(", ")}${internalNote ? `\n\nNote from ${doctor}: ${internalNote}` : ""}`,
          patient_id: patientId,
          assignee_name: assignee,
          assignee_type: assignee.toLowerCase().includes("nurse") ? "nurse_internal" : "doctor_internal",
          category: "care_coordination",
          task_category: "care_coordination",
          priority: "medium",
          status: "todo",
          due_date: date,
          created_by: user.id,
          created_from: `Visit ${visitTitle} on ${date}`,
          referral_progress: { lab_order_id: labOrderId },
        });
      }

      // 5. In-app reminder task for the nurse if "send invite" was checked.
      if (inviteNurse && nurse) {
        await supabase.from("tasks").insert({
          title: `Visit reminder — ${patientName}`,
          description: `${visitTitle} on ${date} at ${time} with ${doctor}.`,
          patient_id: patientId,
          assignee_name: nurse,
          assignee_type: "nurse_internal",
          category: "care_coordination",
          task_category: "care_coordination",
          priority: "low",
          status: "todo",
          due_date: date,
          created_by: user.id,
          created_from: `Visit invite on ${date}`,
        });
      }
      // Patient invites are recorded via the appointment row; no patient accounts to notify yet.

      toast.success("Visit created");
      onOpenChange(false);
      onCreated();
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || "Failed to create visit");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-6 py-4 border-b">
          <DialogTitle>New Visit — {patientName}</DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 px-6 py-4">
          <div className="space-y-5">
            {/* Date + time */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Visit date *</Label>
                <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Time *</Label>
                <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
              </div>
            </div>

            {/* Type + mode */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Visit type *</Label>
                <Select value={visitType} onValueChange={(v) => setVisitType(v as VisitType)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {VISIT_TYPES.map((t) => <SelectItem key={t.key} value={t.key}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Mode *</Label>
                <Select value={visitMode} onValueChange={(v) => setVisitMode(v as VisitMode)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {VISIT_MODES.map((m) => <SelectItem key={m.key} value={m.key}>{m.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Doctor + nurse */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Attending doctor *</Label>
                <Select value={doctor} onValueChange={setDoctor}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {DOCTORS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Attending nurse</Label>
                <Select value={nurse || "__none"} onValueChange={(v) => setNurse(v === "__none" ? "" : v)}>
                  <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none">None</SelectItem>
                    {NURSES.map((n) => <SelectItem key={n} value={n}>{n}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Internal note */}
            <div className="space-y-1">
              <Label>Internal note — not visible to patient</Label>
              <Textarea
                value={internalNote}
                onChange={(e) => setInternalNote(e.target.value)}
                placeholder="Notes for the nurse / care team…"
                className="min-h-[80px]"
              />
            </div>

            {/* Lab order */}
            <div className="rounded-lg border p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FlaskConical className="h-4 w-4 text-primary" />
                  <Label className="m-0">Include lab order with this visit</Label>
                  {labRequired && <Badge variant="secondary" className="text-[10px]">Required</Badge>}
                </div>
                <Switch checked={labOn} onCheckedChange={setLabOrderOn} disabled={labRequired} />
              </div>

              {labOn && (
                <div className="space-y-3">
                  <div>
                    <Label className="text-xs text-muted-foreground">Packages (select one or more)</Label>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {LAB_PACKAGES.map((p) => (
                        <button
                          key={p.key}
                          type="button"
                          onClick={() => togglePkg(p.key)}
                          className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                            pkgs.includes(p.key)
                              ? "bg-primary text-primary-foreground border-primary"
                              : "bg-background border-border hover:border-primary/50"
                          }`}
                        >
                          {p.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <Label className="text-xs text-muted-foreground">Custom markers (search)</Label>
                    <Input
                      value={customSearch}
                      onChange={(e) => setCustomSearch(e.target.value)}
                      placeholder="Type to search markers…"
                      className="mt-1.5"
                    />
                    {filteredCustom.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {filteredCustom.map((m) => (
                          <button
                            key={m}
                            type="button"
                            onClick={() => { setCustomMarkers((prev) => [...prev, m]); setCustomSearch(""); }}
                            className="text-xs px-2 py-1 rounded border bg-background hover:bg-muted"
                          >
                            + {m}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div>
                    <Label className="text-xs text-muted-foreground">All selected markers ({allMarkers.length})</Label>
                    <div className="mt-1.5 flex flex-wrap gap-1.5 min-h-[40px] p-2 rounded border bg-muted/30">
                      {allMarkers.length === 0 ? (
                        <span className="text-xs text-muted-foreground italic">No markers selected</span>
                      ) : allMarkers.map((m) => (
                        <Badge key={m} variant="secondary" className="text-xs gap-1">
                          {m}
                          {customMarkers.includes(m) && (
                            <button
                              onClick={() => setCustomMarkers((prev) => prev.filter((c) => c !== m))}
                              className="hover:text-destructive"
                            ><X className="h-3 w-3" /></button>
                          )}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Calendar invites */}
            <div className="rounded-lg border p-4 space-y-2">
              <Label>Calendar invites</Label>
              <div className="flex items-center gap-2">
                <Checkbox id="inv-nurse" checked={inviteNurse} onCheckedChange={(v) => setInviteNurse(!!v)} disabled={!nurse} />
                <label htmlFor="inv-nurse" className="text-sm">Send calendar invite to nurse{!nurse && <span className="text-muted-foreground"> (select a nurse first)</span>}</label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox id="inv-pt" checked={invitePatient} onCheckedChange={(v) => setInvitePatient(!!v)} />
                <label htmlFor="inv-pt" className="text-sm">Send calendar invite to patient</label>
              </div>
            </div>
          </div>
        </ScrollArea>

        <DialogFooter className="px-6 py-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving || (labOn && allMarkers.length === 0)}>
            {saving ? "Creating…" : "Create Visit"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
