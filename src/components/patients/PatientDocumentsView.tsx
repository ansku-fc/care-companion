import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Upload, Download, Trash2, FileText, Image as ImageIcon, FileQuestion } from "lucide-react";

const HEALTH_DIMENSIONS = [
  "Cardiovascular System",
  "Metabolic & Endocrine",
  "Brain & Mental Health",
  "Musculoskeletal System",
  "Respiratory System",
  "Digestive System",
  "Kidney Function",
  "Liver Function",
  "Skin & Mucous Membranes",
  "Hormone Function",
  "Immunity & Allergies",
  "Cancer Risk",
  "Sleep",
  "Senses",
  "Nervous System",
  "Body Composition & Nutrition",
  "Mental Health",
  "Alcohol & Other Substances",
  "Physical Performance",
] as const;

const UNCATEGORIZED = "Uncategorized";

interface PatientFile {
  id: string;
  file_category: string;
  file_name: string;
  file_path: string;
  file_size: number | null;
  notes: string | null;
  health_dimension: string | null;
  source: string | null;
  created_at: string;
}

function fileTypeBadge(name: string): { label: string; tone: "pdf" | "image" | "other" } {
  const lower = name.toLowerCase();
  if (lower.endsWith(".pdf")) return { label: "PDF", tone: "pdf" };
  if (/\.(jpe?g|png|webp|gif)$/i.test(lower)) {
    const ext = lower.split(".").pop()!.toUpperCase();
    return { label: ext === "JPEG" ? "JPG" : ext, tone: "image" };
  }
  return { label: lower.split(".").pop()?.toUpperCase() || "FILE", tone: "other" };
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
  } catch {
    return iso;
  }
}

export function PatientDocumentsView({ patientId }: { patientId: string }) {
  const [files, setFiles] = useState<PatientFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadOpen, setUploadOpen] = useState(false);

  const fetchFiles = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("patient_health_files")
      .select("*")
      .eq("patient_id", patientId)
      .order("created_at", { ascending: false });
    if (error) {
      toast.error("Failed to load files");
    } else {
      setFiles((data || []) as PatientFile[]);
    }
    setLoading(false);
  };

  useEffect(() => { fetchFiles(); }, [patientId]);

  const grouped = useMemo(() => {
    const map = new Map<string, PatientFile[]>();
    for (const f of files) {
      const key = f.health_dimension || UNCATEGORIZED;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(f);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [files]);

  const handleDownload = async (file: PatientFile) => {
    const { data, error } = await supabase.storage
      .from("patient-health-files")
      .createSignedUrl(file.file_path, 60);
    if (error || !data?.signedUrl) {
      toast.error("Failed to generate download link");
      return;
    }
    window.open(data.signedUrl, "_blank");
  };

  const handleDelete = async (file: PatientFile) => {
    if (!confirm(`Delete ${file.file_name}?`)) return;
    await supabase.storage.from("patient-health-files").remove([file.file_path]);
    const { error } = await supabase.from("patient_health_files").delete().eq("id", file.id);
    if (error) toast.error("Failed to delete file");
    else { toast.success("File deleted"); fetchFiles(); }
  };

  return (
    <div className="space-y-6 p-1">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Documents & Images</h1>
          <p className="text-sm text-muted-foreground">All files uploaded for this patient, grouped by health dimension.</p>
        </div>
        <Button onClick={() => setUploadOpen(true)} className="gap-1.5">
          <Upload className="h-4 w-4" />
          Upload file
        </Button>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : files.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-12 text-center">
          <FileQuestion className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground">No files uploaded yet.</p>
          <Button variant="outline" size="sm" onClick={() => setUploadOpen(true)} className="mt-3 gap-1.5">
            <Upload className="h-3.5 w-3.5" /> Upload first file
          </Button>
        </div>
      ) : (
        <div className="space-y-6">
          {grouped.map(([dimension, list]) => (
            <section key={dimension} className="space-y-2">
              <h2 className="text-sm font-medium text-foreground/80 uppercase tracking-wide">
                {dimension} <span className="text-muted-foreground font-normal">({list.length})</span>
              </h2>
              <div className="rounded-xl border border-border overflow-hidden">
                {list.map((f, idx) => {
                  const badge = fileTypeBadge(f.file_name);
                  const Icon = badge.tone === "image" ? ImageIcon : FileText;
                  return (
                    <div
                      key={f.id}
                      className={`flex items-center gap-3 px-4 py-3 ${idx > 0 ? "border-t border-border" : ""} hover:bg-muted/30`}
                    >
                      <Icon className="h-5 w-5 text-muted-foreground shrink-0" />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium truncate" title={f.file_name}>{f.file_name}</span>
                          <Badge variant="outline" className="text-[10px] uppercase">{badge.label}</Badge>
                          {f.source && (
                            <Badge variant="secondary" className="text-[10px]">{f.source}</Badge>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          Uploaded {formatDate(f.created_at)}
                          {f.health_dimension && (
                            <>
                              {" · "}
                              <span className="text-foreground/70">{f.health_dimension}</span>
                            </>
                          )}
                        </div>
                      </div>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleDownload(f)}
                        aria-label="Download"
                        className="h-8 w-8 text-muted-foreground hover:text-foreground"
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleDelete(f)}
                        aria-label="Delete"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}

      <UploadDialog
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        patientId={patientId}
        onUploaded={() => { setUploadOpen(false); fetchFiles(); }}
      />
    </div>
  );
}

function UploadDialog({
  open,
  onOpenChange,
  patientId,
  onUploaded,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patientId: string;
  onUploaded: () => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [dimension, setDimension] = useState<string>("");
  const [label, setLabel] = useState("");
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setFile(null);
      setDimension("");
      setLabel("");
    }
  }, [open]);

  const handleSubmit = async () => {
    if (!file) {
      toast.error("Choose a file to upload");
      return;
    }
    setBusy(true);
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      toast.error("Not authenticated");
      setBusy(false);
      return;
    }
    const path = `${patientId}/uploads/${Date.now()}_${file.name}`;
    const { error: upErr } = await supabase.storage
      .from("patient-health-files")
      .upload(path, file);
    if (upErr) {
      toast.error("Upload failed: " + upErr.message);
      setBusy(false);
      return;
    }
    const { error: dbErr } = await supabase.from("patient_health_files").insert({
      patient_id: patientId,
      created_by: userData.user.id,
      file_category: "document",
      file_name: file.name,
      file_path: path,
      file_size: file.size,
      health_dimension: dimension || null,
      notes: label || null,
      source: "Manual upload",
    } as any);
    setBusy(false);
    if (dbErr) {
      toast.error("Failed to save file record");
      return;
    }
    toast.success("File uploaded");
    onUploaded();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Upload file</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="text-xs uppercase tracking-wide text-muted-foreground">File</label>
            <input
              ref={inputRef}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.webp"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="mt-1 block w-full text-sm file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:bg-secondary file:text-secondary-foreground hover:file:bg-secondary/80"
            />
          </div>
          <div>
            <label className="text-xs uppercase tracking-wide text-muted-foreground">Health dimension</label>
            <Select value={dimension} onValueChange={setDimension}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Select a dimension (optional)" />
              </SelectTrigger>
              <SelectContent>
                {HEALTH_DIMENSIONS.map((d) => (
                  <SelectItem key={d} value={d}>{d}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs uppercase tracking-wide text-muted-foreground">Label / description</label>
            <Input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Optional description"
              className="mt-1"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={busy}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={busy || !file}>
            {busy ? "Uploading…" : "Upload"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
