import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Upload, Trash2, Download, Camera, Radio, HeartPulse, Watch, Apple, FileText, Loader2 } from "lucide-react";

type FileCategory = "mole_image" | "radiology" | "ekg" | "oura" | "apple_health";

interface HealthFile {
  id: string;
  file_category: string;
  file_name: string;
  file_path: string;
  file_size: number | null;
  notes: string | null;
  created_at: string;
}

const CATEGORIES: { key: FileCategory; label: string; icon: typeof Camera; accept: string; description: string }[] = [
  { key: "mole_image", label: "Mole Images", icon: Camera, accept: ".jpg,.jpeg,.png", description: "Upload dermoscopy or mole photos (.jpg, .png)" },
  { key: "radiology", label: "Radiology / MRI", icon: Radio, accept: ".dcm,.dicom,.zip", description: "Upload DICOM radiology or MRI files (.dcm, .zip)" },
  { key: "ekg", label: "EKG", icon: HeartPulse, accept: ".pdf", description: "Upload EKG reports (.pdf)" },
  { key: "oura", label: "Oura Data", icon: Watch, accept: ".csv", description: "Upload Oura ring exported data (.csv)" },
  { key: "apple_health", label: "Apple Health", icon: Apple, accept: ".xml,.zip", description: "Upload Apple Health export (.xml, .zip)" },
];

function formatFileSize(bytes: number | null): string {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface Props {
  patientId: string;
}

export function HealthFileUploads({ patientId }: Props) {
  const [files, setFiles] = useState<HealthFile[]>([]);
  const [uploading, setUploading] = useState<FileCategory | null>(null);
  const [activeTab, setActiveTab] = useState<FileCategory>("mole_image");
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const fetchFiles = async () => {
    const { data } = await supabase
      .from("patient_health_files")
      .select("*")
      .eq("patient_id", patientId)
      .order("created_at", { ascending: false });
    if (data) setFiles(data as HealthFile[]);
  };

  useEffect(() => {
    fetchFiles();
  }, [patientId]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>, category: FileCategory) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(category);
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      toast.error("Not authenticated");
      setUploading(null);
      return;
    }

    const filePath = `${patientId}/${category}/${Date.now()}_${file.name}`;
    const { error: uploadError } = await supabase.storage
      .from("patient-health-files")
      .upload(filePath, file);

    if (uploadError) {
      toast.error("Upload failed: " + uploadError.message);
      setUploading(null);
      return;
    }

    const { error: dbError } = await supabase.from("patient_health_files").insert({
      patient_id: patientId,
      created_by: userData.user.id,
      file_category: category,
      file_name: file.name,
      file_path: filePath,
      file_size: file.size,
    });

    if (dbError) {
      toast.error("Failed to save file record");
      console.error(dbError);
    } else {
      toast.success(`${file.name} uploaded`);
      fetchFiles();
    }
    setUploading(null);
    // Reset input
    if (fileInputRefs.current[category]) fileInputRefs.current[category]!.value = "";
  };

  const handleDelete = async (file: HealthFile) => {
    const { error: storageError } = await supabase.storage
      .from("patient-health-files")
      .remove([file.file_path]);

    if (storageError) {
      toast.error("Failed to delete file from storage");
      return;
    }

    const { error: dbError } = await supabase
      .from("patient_health_files")
      .delete()
      .eq("id", file.id);

    if (dbError) {
      toast.error("Failed to delete file record");
    } else {
      toast.success("File deleted");
      fetchFiles();
    }
  };

  const handleDownload = async (file: HealthFile) => {
    const { data, error } = await supabase.storage
      .from("patient-health-files")
      .createSignedUrl(file.file_path, 60);

    if (error || !data?.signedUrl) {
      toast.error("Failed to generate download link");
      return;
    }
    window.open(data.signedUrl, "_blank");
  };

  const categoryFiles = (cat: FileCategory) => files.filter(f => f.file_category === cat);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <FileText className="h-4 w-4 text-primary" />
          Health Data Uploads
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as FileCategory)}>
          <TabsList className="grid w-full grid-cols-5">
            {CATEGORIES.map(cat => {
              const Icon = cat.icon;
              const count = categoryFiles(cat.key).length;
              return (
                <TabsTrigger key={cat.key} value={cat.key} className="gap-1.5 text-xs">
                  <Icon className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">{cat.label}</span>
                  {count > 0 && <Badge variant="secondary" className="ml-1 h-5 min-w-[20px] px-1 text-[10px]">{count}</Badge>}
                </TabsTrigger>
              );
            })}
          </TabsList>

          {CATEGORIES.map(cat => {
            const Icon = cat.icon;
            const catFiles = categoryFiles(cat.key);
            return (
              <TabsContent key={cat.key} value={cat.key} className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">{cat.description}</p>
                  <div>
                    <input
                      ref={el => { fileInputRefs.current[cat.key] = el; }}
                      type="file"
                      accept={cat.accept}
                      onChange={(e) => handleUpload(e, cat.key)}
                      className="hidden"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5"
                      disabled={uploading === cat.key}
                      onClick={() => fileInputRefs.current[cat.key]?.click()}
                    >
                      {uploading === cat.key ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                      Upload
                    </Button>
                  </div>
                </div>

                {catFiles.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground text-sm border border-dashed rounded-lg">
                    <Icon className="h-8 w-8 mx-auto mb-2 opacity-40" />
                    No {cat.label.toLowerCase()} uploaded yet
                  </div>
                ) : (
                  <div className="space-y-2">
                    {catFiles.map(file => (
                      <div key={file.id} className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30">
                        <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
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
              </TabsContent>
            );
          })}
        </Tabs>
      </CardContent>
    </Card>
  );
}
