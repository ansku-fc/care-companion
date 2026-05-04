// Inline editable referral document + print-isolated PDF.
// Renders an editable form (To, Specialty, Patient, Reason, Clinical notes)
// AND a hidden #referral-print-area block that mirrors the form for print.
//
// "Download as PDF" injects @media print CSS that hides everything except
// #referral-print-area, calls window.print(), then cleans up via onafterprint.

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Download, Pencil, FileText } from "lucide-react";
import foundationClinicLogo from "@/assets/foundation-clinic-logo-white.jpg";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import type { Task } from "@/lib/tasks";

interface Props {
  task: Task;
  patientName: string | null;
  defaultTo: string;
  defaultSpecialty: string;
}

export function ReferralFormPanel({ task, patientName, defaultTo, defaultSpecialty }: Props) {
  const [editing, setEditing] = useState(false);
  const [to, setTo] = useState(defaultTo);
  const [specialty, setSpecialty] = useState(defaultSpecialty);
  const [reason, setReason] = useState(task.title ?? "");
  const [notes, setNotes] = useState(task.description ?? "");
  const [diagnoses, setDiagnoses] = useState<string>("Loading…");
  const [medications, setMedications] = useState<string>("Loading…");
  const dateStr = format(new Date(), "dd MMM yyyy");
  const cleanupRef = useRef<() => void>();

  useEffect(() => () => cleanupRef.current?.(), []);

  // Pre-fill diagnoses & medications from the patient's profile.
  useEffect(() => {
    let cancelled = false;
    if (!task.patient_id) {
      setDiagnoses("None on record");
      setMedications("None on record");
      return;
    }
    (async () => {
      const [dxRes, medRes] = await Promise.all([
        supabase
          .from("patient_diagnoses")
          .select("diagnosis, icd_code, status")
          .eq("patient_id", task.patient_id)
          .eq("status", "active")
          .order("created_at", { ascending: true }),
        supabase
          .from("patient_medications")
          .select("medication_name, dose, frequency, status")
          .eq("patient_id", task.patient_id)
          .eq("status", "active")
          .order("created_at", { ascending: true }),
      ]);
      if (cancelled) return;

      const dxLines = (dxRes.data ?? [])
        .map((d) => (d.icd_code ? `${d.diagnosis} (${d.icd_code})` : d.diagnosis))
        .filter(Boolean);
      setDiagnoses(dxLines.length ? dxLines.join("\n") : "None on record");

      const medLines = (medRes.data ?? [])
        .map((m) => [m.medication_name, m.dose, m.frequency].filter(Boolean).join(" · "))
        .filter(Boolean);
      setMedications(medLines.length ? medLines.join("\n") : "None on record");
    })();
    return () => { cancelled = true; };
  }, [task.patient_id]);

    const style = document.createElement("style");
    style.id = "print-hide-style";
    style.textContent = `
      @media print {
        body * { visibility: hidden !important; }
        #referral-print-area, #referral-print-area * { visibility: visible !important; }
        #referral-print-area {
          position: fixed !important;
          left: 0 !important;
          top: 0 !important;
          width: 100% !important;
          padding: 40px !important;
          background: #fff !important;
          color: #000 !important;
        }
        @page { margin: 16mm; }
      }
    `;
    document.head.appendChild(style);

    const cleanup = () => {
      const el = document.getElementById("print-hide-style");
      if (el) el.remove();
      window.onafterprint = null;
      cleanupRef.current = undefined;
    };
    cleanupRef.current = cleanup;
    window.onafterprint = cleanup;
    window.print();
    // Safari fallback: clean up shortly after if onafterprint never fires.
    setTimeout(cleanup, 2000);
  };

  return (
    <div className="space-y-3">
      {/* Editable on-screen form */}
      <div className="rounded-md border bg-muted/30 p-3 space-y-2.5 text-xs">
        <div className="flex items-center gap-1.5 font-semibold text-foreground">
          <FileText className="h-3.5 w-3.5" /> Referral document
        </div>

        {editing ? (
          <div className="space-y-2">
            <Field label="To">
              <Input value={to} onChange={(e) => setTo(e.target.value)} className="h-7 text-xs" />
            </Field>
            <Field label="Specialty">
              <Input value={specialty} onChange={(e) => setSpecialty(e.target.value)} className="h-7 text-xs" />
            </Field>
            <Field label="Patient">
              <Input value={patientName ?? ""} disabled className="h-7 text-xs" />
            </Field>
            <Field label="Reason">
              <Input value={reason} onChange={(e) => setReason(e.target.value)} className="h-7 text-xs" />
            </Field>
            <Field label="Clinical notes">
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={4}
                className="text-xs"
                placeholder="History, findings, current medications, requested investigations…"
              />
            </Field>
          </div>
        ) : (
          <div className="space-y-1">
            <p><span className="text-muted-foreground">To:</span> {to || "—"}</p>
            <p><span className="text-muted-foreground">Specialty:</span> {specialty || "—"}</p>
            <p><span className="text-muted-foreground">Patient:</span> {patientName ?? "—"}</p>
            <p><span className="text-muted-foreground">Reason:</span> {reason || "—"}</p>
            {notes && (
              <p className="text-muted-foreground leading-relaxed pt-1 whitespace-pre-wrap">{notes}</p>
            )}
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={() => setEditing((v) => !v)}
        >
          <Pencil className="h-3.5 w-3.5" />
          {editing ? "Done editing" : "Open & edit"}
        </Button>
        <Button size="sm" className="gap-1.5" onClick={handleDownloadPdf}>
          <Download className="h-3.5 w-3.5" /> Download as PDF
        </Button>
      </div>

      {/* Hidden print-only document — visible only during window.print() */}
      <div
        id="referral-print-area"
        aria-hidden="true"
        style={{
          position: "fixed",
          left: "-10000px",
          top: 0,
          width: "210mm",
          background: "#fff",
          color: "#000",
          fontFamily: "Helvetica, Arial, sans-serif",
          fontSize: "12px",
          lineHeight: 1.5,
        }}
      >
        {/* Header */}
        <div
          className="header"
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "16px",
          }}
        >
          <div
            className="header-left"
            style={{ display: "flex", alignItems: "center", marginLeft: 0, paddingLeft: 0 }}
          >
            <img
              src={foundationClinicLogo}
              alt="Foundation Clinic"
              style={{ height: "48px", width: "auto", display: "block" }}
            />
          </div>
          <div className="header-right" style={{ textAlign: "right", fontSize: "11px", color: "#555" }}>
            <div>{dateStr}</div>
            <div>Referral</div>
          </div>
        </div>

        <hr style={{ border: "none", borderTop: "1px solid #ccc", margin: "12px 0" }} />

        <h1 style={{ fontSize: "18px", fontWeight: 700, margin: "0 0 12px 0" }}>REFERRAL</h1>

        <div style={{ marginBottom: 8 }}>
          <strong>To:</strong> {to || "—"}
        </div>
        <div style={{ marginBottom: 8 }}>
          <strong>Specialty:</strong> {specialty || "—"}
        </div>
        <div style={{ marginBottom: 8 }}>
          <strong>Patient:</strong> {patientName ?? "—"}
        </div>
        <div style={{ marginBottom: 8 }}>
          <strong>Reason for referral:</strong> {reason || "—"}
        </div>

        <hr style={{ border: "none", borderTop: "1px solid #ccc", margin: "16px 0 12px 0" }} />

        <div style={{ marginBottom: 8 }}>
          <strong>Clinical notes</strong>
        </div>
        <pre
          style={{
            whiteSpace: "pre-wrap",
            fontFamily: "Helvetica, Arial, sans-serif",
            fontSize: "12px",
            margin: 0,
          }}
        >
          {notes || "—"}
        </pre>

        <div style={{ marginTop: "32px", fontSize: "11px", color: "#555" }}>
          Issued by Foundation Clinic · {dateStr}
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label className="text-[11px] text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}
