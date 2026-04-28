// Lab order section displayed inside a visit detail. Handles status display,
// requisition + results PDF upload, and "Mark as Sent" action.
//
// On confirmed lab results upload it:
// - sets status = results_received
// - posts a notification to the assigned doctor
// - creates a "Review new lab results" task if any flagged values

import { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Upload, FileText, CheckCircle2, Clock, FlaskConical, Send, Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { LAB_DESTINATIONS, labOrderStatusLabel, type LabOrderStatus } from "@/lib/labOrders";
import { LabResultsVerifyDialog } from "@/components/patients/LabResultsVerifyDialog";
import type { Tables } from "@/integrations/supabase/types";
import { logActivity } from "@/lib/activityLog";

interface Props {
  patient: Tables<"patients">;
  labOrderId: string;
  onChanged?: () => void;
}

export function VisitLabOrderSection({ patient, labOrderId, onChanged }: Props) {
  const { user } = useAuth();
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [destination, setDestination] = useState<string>("HUSLAB");
  const [verifyOpen, setVerifyOpen] = useState(false);
  const [marking, setMarking] = useState(false);
  const reqFileRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("lab_orders").select("*").eq("id", labOrderId).maybeSingle();
    setOrder(data);
    if (data?.destination) setDestination(data.destination);
    setLoading(false);
  };

  useEffect(() => { load(); }, [labOrderId]);

  if (loading) return <Card><CardContent className="py-6 text-sm text-muted-foreground">Loading lab order…</CardContent></Card>;
  if (!order) return null;

  const status: LabOrderStatus = order.status;

  const uploadRequisition = async (file: File) => {
    const path = `lab-orders/${order.id}/requisition-${Date.now()}-${file.name}`;
    const { error: upErr } = await supabase.storage.from("patient-health-files").upload(path, file);
    if (upErr) { toast.error("Upload failed"); return; }
    await supabase.from("lab_orders").update({ requisition_file_path: path }).eq("id", order.id);
    toast.success("Requisition uploaded");
    load();
  };

  const downloadFile = async (path: string) => {
    const { data, error } = await supabase.storage.from("patient-health-files").createSignedUrl(path, 60);
    if (error || !data) { toast.error("Could not get download link"); return; }
    window.open(data.signedUrl, "_blank");
  };

  const markAsSent = async () => {
    if (!user) return;
    setMarking(true);
    await supabase.from("lab_orders").update({
      status: "sent",
      destination,
      sent_at: new Date().toISOString(),
      sent_by: user.id,
    }).eq("id", order.id);
    setMarking(false);
    toast.success(`Marked as sent to ${destination}`);
    load();
    onChanged?.();
  };

  const onResultsConfirmed = async () => {
    // Hook called by LabResultsVerifyDialog onSaved
    if (!user) return;
    try {
      // Tag the most recent lab result for this patient with this visit/order
      const { error: resultError } = await supabase
        .from("patient_lab_results")
        .update({ visit_id: order.visit_id, lab_order_id: order.id })
        .eq("patient_id", patient.id)
        .order("created_at", { ascending: false })
        .limit(1);
      if (resultError) throw resultError;

      const { error: orderError } = await supabase.from("lab_orders").update({
        status: "results_received",
        results_received_at: new Date().toISOString(),
      }).eq("id", order.id);
      if (orderError) throw orderError;

      // Notify the doctor (the visit's provider)
      let providerId = user.id;
      if (order.visit_id) {
        const { data: vn, error: visitError } = await supabase.from("visit_notes").select("provider_id").eq("id", order.visit_id).maybeSingle();
        if (visitError) throw visitError;
        if (vn?.provider_id) providerId = vn.provider_id;
      }
      const { error: notificationError } = await supabase.from("user_notifications").insert({
        user_id: providerId,
        type: "lab_results_ready",
        title: `Lab results ready — ${patient.full_name}`,
        body: `${order.markers?.length ?? 0} markers received from ${order.destination ?? "lab"}.`,
        link: `/patients/${patient.id}`,
        patient_id: patient.id,
      });
      if (notificationError) throw notificationError;

      // Auto-create lab review task (priority HIGH per spec — assume any new results warrants review)
      const { error: taskError } = await supabase.from("tasks").insert({
        title: `Review new lab results — ${patient.full_name}`,
        description: `Lab order with ${order.markers?.length ?? 0} markers from ${order.destination ?? "lab"} returned. Please review and update care plan.`,
        patient_id: patient.id,
        assignee_name: "Dr. Laine",
        assignee_type: "doctor_internal",
        category: "clinical",
        task_category: "clinical",
        priority: "high",
        status: "todo",
        due_date: new Date().toISOString().slice(0, 10),
        created_by: user.id,
        created_from: `Lab results received on ${new Date().toLocaleDateString()}`,
        referral_progress: { lab_order_id: order.id },
      });
      if (taskError) throw taskError;

      await logActivity({
        eventType: "lab_results_uploaded",
        title: "New lab results uploaded",
        patientId: patient.id,
        patientName: patient.full_name,
        actorName: "Lab system",
        actorType: "lab",
        section: "health-data",
        createdBy: user.id,
        metadata: { lab_order_id: order.id, markers: order.markers ?? [] },
      });

      toast.success("Results recorded — doctor notified");
      load();
      onChanged?.();
    } catch (error: any) {
      console.error("Failed to persist lab results workflow", error);
      toast.error(error?.message ?? "Failed to record lab results workflow");
    }
  };

  const statusBadge = status === "results_received"
    ? <Badge className="gap-1 bg-success text-success-foreground border-transparent"><CheckCircle2 className="h-3 w-3" /> Results Received</Badge>
    : status === "sent"
      ? <Badge className="gap-1 bg-primary text-primary-foreground border-transparent"><Send className="h-3 w-3" /> Sent</Badge>
      : <Badge variant="secondary" className="gap-1"><Clock className="h-3 w-3" /> Pending</Badge>;

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground flex items-center justify-between">
            <span className="flex items-center gap-2"><FlaskConical className="h-4 w-4" /> Lab Order</span>
            {statusBadge}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Markers */}
          <div>
            <div className="text-xs text-muted-foreground mb-1.5">Markers ({order.markers?.length ?? 0})</div>
            <div className="flex flex-wrap gap-1.5">
              {(order.markers ?? []).map((m: string) => (
                <Badge key={m} variant="outline" className="text-xs">{m}</Badge>
              ))}
            </div>
          </div>

          {order.internal_note && (
            <div className="rounded-md bg-muted/50 p-3">
              <div className="text-xs font-medium text-muted-foreground mb-1">Internal note</div>
              <div className="text-sm">{order.internal_note}</div>
            </div>
          )}

          <Separator />

          {/* Requisition */}
          <div className="space-y-2">
            <div className="text-xs font-medium text-muted-foreground">Lab requisition PDF</div>
            {order.requisition_file_path ? (
              <Button variant="outline" size="sm" className="gap-1.5" onClick={() => downloadFile(order.requisition_file_path)}>
                <Download className="h-3.5 w-3.5" /> Download requisition
              </Button>
            ) : (
              <>
                <input
                  ref={reqFileRef}
                  type="file"
                  accept=".pdf"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) uploadRequisition(f);
                  }}
                />
                <Button variant="outline" size="sm" className="gap-1.5" onClick={() => reqFileRef.current?.click()}>
                  <Upload className="h-3.5 w-3.5" /> Upload requisition PDF
                </Button>
              </>
            )}
          </div>

          {/* Status transitions */}
          {status === "pending" && (
            <div className="space-y-2">
              <div className="text-xs font-medium text-muted-foreground">Mark as sent</div>
              <div className="flex gap-2">
                <Select value={destination} onValueChange={setDestination}>
                  <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {LAB_DESTINATIONS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Button onClick={markAsSent} disabled={marking} className="gap-1.5">
                  <Send className="h-3.5 w-3.5" /> Mark as Sent
                </Button>
              </div>
            </div>
          )}

          {status !== "pending" && order.sent_at && (
            <div className="text-xs text-muted-foreground">
              Sent to <span className="font-medium text-foreground">{order.destination}</span> on{" "}
              {new Date(order.sent_at).toLocaleDateString()}
            </div>
          )}

          {/* Results upload */}
          {status === "sent" && (
            <Button onClick={() => setVerifyOpen(true)} className="gap-1.5">
              <Upload className="h-4 w-4" /> Upload lab results PDF
            </Button>
          )}
          {status === "results_received" && order.results_received_at && (
            <div className="text-xs text-muted-foreground">
              Results received on {new Date(order.results_received_at).toLocaleDateString()}
            </div>
          )}
        </CardContent>
      </Card>

      <LabResultsVerifyDialog
        open={verifyOpen}
        onOpenChange={setVerifyOpen}
        patientId={patient.id}
        onSaved={onResultsConfirmed}
      />
    </>
  );
}
