import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { LabResultsStep, defaultLabResults, type LabResultsData } from "./LabResultsStep";
import { LabResultsVerifyDialog } from "./LabResultsVerifyDialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, FileText } from "lucide-react";

interface Props {
  patientId: string;
  onSaved: () => void;
  children?: React.ReactNode;
}

export function AddLabResultsDialog({ patientId, onSaved, children }: Props) {
  const [open, setOpen] = useState(false);
  const [verifyOpen, setVerifyOpen] = useState(false);
  const [data, setData] = useState<LabResultsData>({ ...defaultLabResults });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      toast.error("Not authenticated");
      setSaving(false);
      return;
    }

    const { _file_content, ...rest } = data;
    const { error } = await supabase.from("patient_lab_results").insert({
      ...rest,
      patient_id: patientId,
      created_by: userData.user.id,
    });

    setSaving(false);
    if (error) {
      toast.error("Failed to save lab results");
      console.error(error);
    } else {
      toast.success("Lab results saved");
      setData({ ...defaultLabResults });
      setOpen(false);
      onSaved();
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (v) setData({ ...defaultLabResults }); }}>
        <DialogTrigger asChild>
          {children || (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="gap-1.5">
                <Plus className="h-4 w-4" /> Add Lab Results
              </Button>
            </div>
          )}
        </DialogTrigger>
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Add Lab Results</DialogTitle>
          </DialogHeader>
          <div className="flex justify-end">
            <Button
              variant="secondary"
              size="sm"
              className="gap-1.5"
              onClick={() => { setOpen(false); setVerifyOpen(true); }}
            >
              <FileText className="h-4 w-4" /> Verify from PDF
            </Button>
          </div>
          <ScrollArea className="flex-1 pr-4">
            <LabResultsStep data={data} onChange={setData} />
          </ScrollArea>
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : "Save Lab Results"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <LabResultsVerifyDialog
        open={verifyOpen}
        onOpenChange={setVerifyOpen}
        patientId={patientId}
        onSaved={onSaved}
      />
    </>
  );
}
