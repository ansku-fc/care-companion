import { useState, useEffect, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Upload, Trash2, Download, Camera, Radio, HeartPulse, Watch, Apple, FlaskConical, Loader2 } from "lucide-react";

export type HealthDataTab = "lab_results" | "mole_image" | "radiology" | "ekg" | "oura" | "apple_health";

interface HealthFile {
  id: string;
  file_category: string;
  file_name: string;
  file_path: string;
  file_size: number | null;
  notes: string | null;
  created_at: string;
}

const FILE_CATEGORIES: { key: Exclude<HealthDataTab, "lab_results">; label: string; icon: typeof Camera; accept: string; description: string }[] = [
  { key: "mole_image", label: "Mole Images", icon: Camera, accept: ".jpg,.jpeg,.png", description: "Upload dermoscopy or mole photos (.jpg, .png)" },
  { key: "radiology", label: "Radiology / MRI", icon: Radio, accept: ".dcm,.dicom,.zip", description: "Upload DICOM radiology or MRI files (.dcm, .zip)" },
  { key: "ekg", label: "EKG", icon: HeartPulse, accept: ".pdf", description: "Upload EKG reports (.pdf)" },
  { key: "oura", label: "Oura Data", icon: Watch, accept: ".csv", description: "Upload Oura ring exported data (.csv)" },
  { key: "apple_health", label: "Apple Health", icon: Apple, accept: ".xml,.zip", description: "Upload Apple Health export (.xml, .zip)" },
];

const ALL_TABS: { key: HealthDataTab; label: string; icon: typeof Camera }[] = [
  { key: "lab_results", label: "Lab Results", icon: FlaskConical },
  ...FILE_CATEGORIES.map(c => ({ key: c.key as HealthDataTab, label: c.label, icon: c.icon })),
];

function formatFileSize(bytes: number | null): string {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface Props {
  patientId: string;
  activeTab: HealthDataTab;
  onTabChange: (tab: HealthDataTab) => void;
  labResultsCount?: number;
  children?: React.ReactNode; // lab results content rendered when lab_results tab active
}

export function HealthFileUploads({ patientId, activeTab, onTabChange, labResultsCount, children }: Props) {
  const [files, setFiles] = useState<HealthFile[]>([]);
  const [uploading, setUploading] = useState<string | null>(null);
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const fetchFiles = async () => {
    const { data } = await supabase
      .from("patient_health_files")
      .select("*")
      .eq("patient_id", patientId)
      .order("created_at", { ascending: false });
    if (data) setFiles(data as HealthFile[]);
  };

  useEffect(() => { fetchFiles(); }, [patientId]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>, category: string) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(category);
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) { toast.error("Not authenticated"); setUploading(null); return; }

    const filePath = `${patientId}/${category}/${Date.now()}_${file.name}`;
    const { error: uploadError } = await supabase.storage.from("patient-health-files").upload(filePath, file);
    if (uploadError) { toast.error("Upload failed: " + uploadError.message); setUploading(null); return; }

    const { error: dbError } = await supabase.from("patient_health_files").insert({
      patient_id: patientId, created_by: userData.user.id,
      file_category: category, file_name: file.name, file_path: filePath, file_size: file.size,
    });
    if (dbError) { toast.error("Failed to save file record"); console.error(dbError); }
    else { toast.success(`${file.name} uploaded`); fetchFiles(); }
    setUploading(null);
    if (fileInputRefs.current[category]) fileInputRefs.current[category]!.value = "";
  };

  const handleDelete = async (file: HealthFile) => {
    await supabase.storage.from("patient-health-files").remove([file.file_path]);
    const { error } = await supabase.from("patient_health_files").delete().eq("id", file.id);
    if (error) toast.error("Failed to delete file"); else { toast.success("File deleted"); fetchFiles(); }
  };

  const handleDownload = async (file: HealthFile) => {
    const { data, error } = await supabase.storage.from("patient-health-files").createSignedUrl(file.file_path, 60);
    if (error || !data?.signedUrl) { toast.error("Failed to generate download link"); return; }
    window.open(data.signedUrl, "_blank");
  };

  const categoryFiles = (cat: string) => files.filter(f => f.file_category === cat);
  const activeCat = FILE_CATEGORIES.find(c => c.key === activeTab);

  return (
    <div className="flex flex-col gap-4">
      {/* Tab bar */}
      <div className="flex gap-1 p-1 rounded-lg bg-muted overflow-x-auto">
        {ALL_TABS.map(tab => {
          const Icon = tab.icon;
          const count = tab.key === "lab_results" ? (labResultsCount ?? 0) : categoryFiles(tab.key).length;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => onTabChange(tab.key)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium whitespace-nowrap transition-all ${
                isActive
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {tab.label}
              {count > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 min-w-[20px] px-1 text-[10px]">{count}</Badge>
              )}
            </button>
          );
        })}
      </div>

      {/* Content */}
      {activeTab === "lab_results" ? (
        children
      ) : activeCat ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">{activeCat.description}</p>
            <div>
              <input
                ref={el => { fileInputRefs.current[activeCat.key] = el; }}
                type="file"
                accept={activeCat.accept}
                onChange={(e) => handleUpload(e, activeCat.key)}
                className="hidden"
              />
              <Button
                variant="outline" size="sm" className="gap-1.5"
                disabled={uploading === activeCat.key}
                onClick={() => fileInputRefs.current[activeCat.key]?.click()}
              >
                {uploading === activeCat.key ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                Upload
              </Button>
            </div>
          </div>

          {categoryFiles(activeCat.key).length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-sm border border-dashed rounded-lg">
              <activeCat.icon className="h-10 w-10 mx-auto mb-3 opacity-30" />
              No {activeCat.label.toLowerCase()} uploaded yet
            </div>
          ) : (
            <div className="space-y-2">
              {categoryFiles(activeCat.key).map(file => (
                <div key={file.id} className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30">
                  <activeCat.icon className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{file.file_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatFileSize(file.file_size)} · {new Date(file.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDownload(file)}>
                    <Download className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => handleDelete(file)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
