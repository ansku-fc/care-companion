// Inline panel shown inside TaskDetailPanel for "Prepare & send lab order" tasks.
// Reads the linked lab_order, lets nurse pick destination, and marks as Sent.

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { FlaskConical, Send, CheckCircle2, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { LAB_DESTINATIONS, labOrderStatusLabel, type LabOrderStatus } from "@/lib/labOrders";

interface Props {
  labOrderId: string;
  doctorName?: string | null;
  onChanged?: () => void;
  onClose?: () => void;
}

export function LabOrderTaskPanel({ labOrderId, doctorName, onChanged, onClose }: Props) {
  const { user } = useAuth();
  const [order, setOrder] = useState<any>(null);
  const [destination, setDestination] = useState<string>("HUSLAB");
  const [marking, setMarking] = useState(false);

  const load = async () => {
    const { data } = await supabase.from("lab_orders").select("*").eq("id", labOrderId).maybeSingle();
    setOrder(data);
    if (data?.destination) setDestination(data.destination);
  };
  useEffect(() => { load(); }, [labOrderId]);

  if (!order) return <p className="text-xs text-muted-foreground">Loading lab order…</p>;
  const status: LabOrderStatus = order.status;

  const markSent = async () => {
    if (!user) return;
    setMarking(true);
    await supabase.from("lab_orders").update({
      status: "sent", destination, sent_at: new Date().toISOString(), sent_by: user.id,
    }).eq("id", order.id);
    // Mark this task done as well
    const { data: t } = await supabase.from("tasks").select("id").filter("referral_progress->>lab_order_id", "eq", order.id).maybeSingle();
    if (t?.id) await supabase.from("tasks").update({ status: "done" }).eq("id", t.id);
    setMarking(false);
    toast.success(`Lab order sent to ${destination}`);
    onChanged?.();
    onClose?.();
  };

  return (
    <div className="space-y-3">
      <Separator />
      <div className="flex items-center justify-between">
        <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
          <FlaskConical className="h-3.5 w-3.5" /> Lab order
        </div>
        {status === "results_received" ? (
          <Badge className="gap-1 bg-success text-success-foreground border-transparent text-[10px]"><CheckCircle2 className="h-3 w-3" /> Results</Badge>
        ) : status === "sent" ? (
          <Badge className="gap-1 bg-primary text-primary-foreground border-transparent text-[10px]"><Send className="h-3 w-3" /> Sent</Badge>
        ) : (
          <Badge variant="secondary" className="gap-1 text-[10px]"><Clock className="h-3 w-3" /> Pending</Badge>
        )}
      </div>

      <div>
        <div className="text-xs text-muted-foreground mb-1">Markers ({order.markers?.length ?? 0})</div>
        <div className="flex flex-wrap gap-1">
          {(order.markers ?? []).map((m: string) => (
            <Badge key={m} variant="outline" className="text-[10px]">{m}</Badge>
          ))}
        </div>
      </div>

      {order.internal_note && (
        <div className="rounded-md border bg-warning/5 border-warning/40 p-2.5">
          <div className="text-[11px] font-medium text-muted-foreground mb-0.5">
            Note from {doctorName ?? "Dr. Laine"}
          </div>
          <div className="text-sm">{order.internal_note}</div>
        </div>
      )}

      {status === "pending" ? (
        <div className="space-y-2">
          <div className="text-xs text-muted-foreground">Lab destination</div>
          <Select value={destination} onValueChange={setDestination}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {LAB_DESTINATIONS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button className="w-full gap-1.5" onClick={markSent} disabled={marking}>
            <Send className="h-3.5 w-3.5" /> Mark as Sent
          </Button>
        </div>
      ) : (
        <div className="text-xs text-muted-foreground">
          Sent to <span className="font-medium text-foreground">{order.destination}</span>{order.sent_at ? ` on ${new Date(order.sent_at).toLocaleDateString()}` : ""}
        </div>
      )}
    </div>
  );
}
