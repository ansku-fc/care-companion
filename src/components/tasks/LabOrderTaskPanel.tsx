// Inline panel shown inside TaskDetailPanel for "Prepare & send lab order" tasks.
// Lets nurse pick a package, edit markers, choose destination, add notes and mark as Sent.

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { FlaskConical, Send, CheckCircle2, Clock, X, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { LAB_DESTINATIONS, LAB_PACKAGES, ALL_MARKERS, dedupeMarkers, type LabOrderStatus } from "@/lib/labOrders";

interface Props {
  labOrderId: string;
  doctorName?: string | null;
  onChanged?: () => void;
  onClose?: () => void;
}

type PackageId = "comprehensive" | "basic" | "hormones" | "custom";

const PACKAGE_OPTIONS: { id: PackageId; label: string; markers: string[] }[] = [
  { id: "comprehensive", label: "Comprehensive", markers: LAB_PACKAGES.find(p => p.key === "comprehensive")!.markers },
  { id: "basic",         label: "Basic Metabolic", markers: LAB_PACKAGES.find(p => p.key === "basic")!.markers },
  { id: "hormones",      label: "Hormones", markers: LAB_PACKAGES.find(p => p.key === "metabolic")!.markers },
  { id: "custom",        label: "Custom", markers: [] },
];

function detectPackage(markers: string[]): PackageId {
  const set = new Set(markers);
  for (const opt of PACKAGE_OPTIONS) {
    if (opt.id === "custom") continue;
    if (opt.markers.length === set.size && opt.markers.every((m) => set.has(m))) return opt.id;
  }
  return "custom";
}

export function LabOrderTaskPanel({ labOrderId, doctorName, onChanged, onClose }: Props) {
  const { user } = useAuth();
  const [order, setOrder] = useState<any>(null);
  const [destination, setDestination] = useState<string>("HUSLAB");
  const [markers, setMarkers] = useState<string[]>([]);
  const [pkg, setPkg] = useState<PackageId>("comprehensive");
  const [collectionNotes, setCollectionNotes] = useState<string>("");
  const [marking, setMarking] = useState(false);
  const [addOpen, setAddOpen] = useState(false);

  const load = async () => {
    const { data } = await supabase.from("lab_orders").select("*").eq("id", labOrderId).maybeSingle();
    setOrder(data);
    if (data?.destination) setDestination(data.destination);
    const m = (data?.markers ?? []) as string[];
    setMarkers(m);
    setPkg(detectPackage(m));
    // Use internal_note ONLY if it differs from the doctor note workflow — keep collection notes local
    setCollectionNotes("");
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [labOrderId]);

  const status: LabOrderStatus = order?.status;
  const isSent = status === "sent" || status === "results_received";

  const availableToAdd = useMemo(
    () => ALL_MARKERS.filter((m) => !markers.includes(m)),
    [markers]
  );

  const choosePackage = (id: PackageId) => {
    setPkg(id);
    const found = PACKAGE_OPTIONS.find((p) => p.id === id);
    if (id !== "custom" && found) setMarkers(found.markers);
    if (id === "custom") setMarkers([]);
  };

  const removeMarker = (m: string) => {
    const next = markers.filter((x) => x !== m);
    setMarkers(next);
    setPkg(detectPackage(next));
  };

  const addMarker = (m: string) => {
    const next = dedupeMarkers([...markers, m]);
    setMarkers(next);
    setPkg(detectPackage(next));
    setAddOpen(false);
  };

  const markSent = async () => {
    if (!user) return;
    setMarking(true);
    await supabase.from("lab_orders").update({
      status: "sent",
      destination,
      markers,
      sent_at: new Date().toISOString(),
      sent_by: user.id,
    }).eq("id", order.id);
    const { data: t } = await supabase.from("tasks").select("id").filter("referral_progress->>lab_order_id", "eq", order.id).maybeSingle();
    if (t?.id) await supabase.from("tasks").update({ status: "done" }).eq("id", t.id);
    setMarking(false);
    toast.success(`Lab order sent to ${destination}`);
    onChanged?.();
    onClose?.();
  };

  if (!order) return <p className="text-xs text-muted-foreground">Loading lab order…</p>;

  return (
    <div className="space-y-4">
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

      {/* 1. Package selector */}
      <div>
        <div className="text-xs text-muted-foreground mb-1.5">Lab package</div>
        <div className="flex flex-wrap gap-1.5">
          {PACKAGE_OPTIONS.map((opt) => {
            const active = pkg === opt.id;
            const count = opt.id === "custom" ? markers.length : opt.markers.length;
            return (
              <button
                key={opt.id}
                type="button"
                disabled={isSent}
                onClick={() => choosePackage(opt.id)}
                className={`px-2.5 py-1 rounded-full text-xs border transition-colors ${
                  active
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background text-foreground border-border hover:bg-muted"
                } ${isSent ? "opacity-60 cursor-not-allowed" : ""}`}
              >
                {opt.label} {opt.id !== "custom" && <span className="opacity-70">({count})</span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Editable marker list */}
      <div>
        <div className="text-xs text-muted-foreground mb-1.5">Markers ({markers.length})</div>
        <div className="flex flex-wrap gap-1">
          {markers.map((m) => (
            <Badge key={m} variant="outline" className="text-[10px] gap-1 pr-1">
              {m}
              {!isSent && (
                <button
                  type="button"
                  onClick={() => removeMarker(m)}
                  className="hover:bg-muted rounded-sm p-0.5"
                  aria-label={`Remove ${m}`}
                >
                  <X className="h-2.5 w-2.5" />
                </button>
              )}
            </Badge>
          ))}
          {markers.length === 0 && (
            <span className="text-[11px] text-muted-foreground italic">No markers selected</span>
          )}
        </div>
        {!isSent && (
          <Popover open={addOpen} onOpenChange={setAddOpen}>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="sm" className="mt-1.5 h-7 px-2 text-xs gap-1">
                <Plus className="h-3 w-3" /> Add marker
              </Button>
            </PopoverTrigger>
            <PopoverContent className="p-0 w-64" align="start">
              <Command>
                <CommandInput placeholder="Search markers…" className="h-8" />
                <CommandList>
                  <CommandEmpty>No markers found.</CommandEmpty>
                  <CommandGroup>
                    {availableToAdd.map((m) => (
                      <CommandItem key={m} value={m} onSelect={() => addMarker(m)}>
                        {m}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        )}
      </div>

      {/* 3. Note from doctor */}
      {order.internal_note && (
        <div className="rounded-md border border-purple-300/60 bg-purple-50 dark:bg-purple-950/20 p-2.5">
          <div className="text-[11px] font-medium text-muted-foreground mb-0.5">
            Note from {doctorName ?? "Dr. Laine"}
          </div>
          <div className="text-sm">{order.internal_note}</div>
        </div>
      )}

      {/* 4. Destination */}
      <div className="space-y-1.5">
        <div className="text-xs text-muted-foreground">Lab destination</div>
        <Select value={destination} onValueChange={setDestination} disabled={isSent}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {LAB_DESTINATIONS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* 6. Collection notes */}
      <div className="space-y-1.5">
        <div className="text-xs text-muted-foreground">Collection notes</div>
        <Textarea
          value={collectionNotes}
          onChange={(e) => setCollectionNotes(e.target.value)}
          placeholder="Add collection instructions or notes for the lab…"
          rows={3}
          disabled={isSent}
          className="text-sm"
        />
      </div>

      {/* 5. Send button (no separate status dropdown) */}
      {isSent ? (
        <Button className="w-full gap-1.5 bg-success text-success-foreground hover:bg-success" disabled>
          <CheckCircle2 className="h-3.5 w-3.5" /> Sent ✓
        </Button>
      ) : (
        <Button className="w-full gap-1.5" onClick={markSent} disabled={marking || markers.length === 0}>
          <Send className="h-3.5 w-3.5" /> Mark as Sent
        </Button>
      )}
      {isSent && (
        <div className="text-xs text-muted-foreground text-center">
          Sent to <span className="font-medium text-foreground">{order.destination}</span>
          {order.sent_at ? ` on ${new Date(order.sent_at).toLocaleDateString()}` : ""}
        </div>
      )}
    </div>
  );
}
