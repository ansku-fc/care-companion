import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Upload, Trash2, Download, Camera, Radio, HeartPulse, Watch, Apple, FlaskConical, Loader2, FileText, Pencil, Save, X, Maximize2 } from "lucide-react";

export type HealthDataTab = "lab_results" | "mole_image" | "radiology" | "ekg" | "oura" | "apple_health";

const HEALTH_DIMENSIONS = [
  "Senses", "Nervous System", "Physical Performance", "Respiratory System",
  "Hormone Function", "Skin & Mucous Membranes", "Immunity & Allergies",
  "Body Composition & Nutrition", "Liver Function", "Mental Health",
  "Kidney Function", "Alcohol & Other Substances", "Cardiovascular System",
  "Cancer Risk", "Musculoskeletal System", "Sleep",
] as const;

interface HealthFile {
  id: string;
  file_category: string;
  file_name: string;
  file_path: string;
  file_size: number | null;
  notes: string | null;
  health_dimension: string | null;
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
  children?: React.ReactNode;
}

export function HealthFileUploads({ patientId, activeTab, onTabChange, labResultsCount, children }: Props) {
  const [files, setFiles] = useState<HealthFile[]>([]);
  const [uploading, setUploading] = useState<string | null>(null);
  const [editingNotes, setEditingNotes] = useState<string | null>(null);
  const [notesDraft, setNotesDraft] = useState("");
  const [dimensionDraft, setDimensionDraft] = useState<string | null>(null);
  const [savingNotes, setSavingNotes] = useState(false);
  const [fullscreenUrl, setFullscreenUrl] = useState<string | null>(null);
  const [expandedFile, setExpandedFile] = useState<string | null>(null);
  const [expandedPreviewUrl, setExpandedPreviewUrl] = useState<string | null>(null);
  const [thumbnailUrls, setThumbnailUrls] = useState<Record<string, string>>({});
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

  // Generate thumbnails for image files
  useEffect(() => {
    const imageFiles = files.filter(f => isImageFile(f.file_name) && !thumbnailUrls[f.id]);
    if (imageFiles.length === 0) return;
    const loadThumbnails = async () => {
      const urls: Record<string, string> = {};
      for (const file of imageFiles) {
        const { data } = await supabase.storage.from("patient-health-files").createSignedUrl(file.file_path, 600);
        if (data?.signedUrl) urls[file.id] = data.signedUrl;
      }
      setThumbnailUrls(prev => ({ ...prev, ...urls }));
    };
    loadThumbnails();
  }, [files]);

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
    if (error) toast.error("Failed to delete file"); else { toast.success("File deleted"); setExpandedFile(null); fetchFiles(); }
  };

  const handleDownload = async (file: HealthFile) => {
    const { data, error } = await supabase.storage.from("patient-health-files").createSignedUrl(file.file_path, 60);
    if (error || !data?.signedUrl) { toast.error("Failed to generate download link"); return; }
    window.open(data.signedUrl, "_blank");
  };

  const handleSaveNotes = async (fileId: string) => {
    setSavingNotes(true);
    const { error } = await supabase.from("patient_health_files").update({
      notes: notesDraft || null,
      health_dimension: dimensionDraft || null,
    }).eq("id", fileId);
    if (error) toast.error("Failed to save notes");
    else {
      // If dimension is tagged, also update the health category with these notes
      if (dimensionDraft) {
        const { data: userData } = await supabase.auth.getUser();
        if (userData.user) {
          const { data: existing } = await supabase
            .from("patient_health_categories")
            .select("*")
            .eq("patient_id", patientId)
            .eq("category", dimensionDraft)
            .maybeSingle();

          const file = files.find(f => f.id === fileId);
          const notePrefix = `[${file?.file_name || "File"}]: `;
          const noteEntry = notePrefix + (notesDraft || "No notes");

          if (existing) {
            const currentSummary = existing.summary || "";
            const updatedSummary = currentSummary ? `${currentSummary}\n\n${noteEntry}` : noteEntry;
            await supabase.from("patient_health_categories").update({
              summary: updatedSummary,
              updated_by: userData.user.id,
            }).eq("id", existing.id);
          } else {
            await supabase.from("patient_health_categories").insert({
              patient_id: patientId,
              category: dimensionDraft,
              summary: noteEntry,
              updated_by: userData.user.id,
            });
          }
        }
      }
      toast.success("Notes saved");
      fetchFiles();
      setEditingNotes(null);
    }
    setSavingNotes(false);
  };

  const handleFullscreen = async (file: HealthFile) => {
    const { data, error } = await supabase.storage.from("patient-health-files").createSignedUrl(file.file_path, 120);
    if (error || !data?.signedUrl) { toast.error("Failed to load image"); return; }
    setFullscreenUrl(data.signedUrl);
  };

  const isImageFile = (name: string) => /\.(jpg|jpeg|png|gif|webp)$/i.test(name);

  const handleExpandFile = async (file: HealthFile) => {
    if (expandedFile === file.id) { setExpandedFile(null); setExpandedPreviewUrl(null); return; }
    setExpandedFile(file.id);
    if (isImageFile(file.file_name)) {
      const { data } = await supabase.storage.from("patient-health-files").createSignedUrl(file.file_path, 300);
      if (data?.signedUrl) setExpandedPreviewUrl(data.signedUrl);
    } else { setExpandedPreviewUrl(null); }
  };

  const categoryFiles = (cat: string) => files.filter(f => f.file_category === cat);
  const activeCat = FILE_CATEGORIES.find(c => c.key === activeTab);
  const selectedFile = expandedFile ? files.find(f => f.id === expandedFile) : null;

  return (
    <div className="flex flex-col gap-4">
      {/* Fullscreen modal */}
      {fullscreenUrl && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4" onClick={() => setFullscreenUrl(null)}>
          <div className="relative w-full h-full flex items-center justify-center" onClick={e => e.stopPropagation()}>
            <Button variant="ghost" size="icon" className="absolute top-2 right-2 text-white hover:bg-white/20 z-10" onClick={() => setFullscreenUrl(null)}>
              <X className="h-5 w-5" />
            </Button>
            <img src={fullscreenUrl} alt="Full screen preview" className="max-w-full max-h-full object-contain" />
          </div>
        </div>
      )}

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
                isActive ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {tab.label}
              {count > 0 && <Badge variant="secondary" className="ml-1 h-5 min-w-[20px] px-1 text-[10px]">{count}</Badge>}
            </button>
          );
        })}
      </div>

      {/* Content */}
      {activeTab === "lab_results" ? children : activeCat ? (
        <div className="flex gap-4">
          {/* File list */}
          <div className={`space-y-3 ${selectedFile ? 'w-1/3 min-w-[260px]' : 'w-full'} shrink-0 transition-all`}>
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">{activeCat.description}</p>
              <div>
                <input
                  ref={el => { fileInputRefs.current[activeCat.key] = el; }}
                  type="file" accept={activeCat.accept}
                  onChange={(e) => handleUpload(e, activeCat.key)}
                  className="hidden"
                />
                <Button variant="outline" size="sm" className="gap-1.5"
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
              <div className="space-y-1.5">
                {categoryFiles(activeCat.key).map(file => (
                  <div
                    key={file.id}
                    className={`rounded-lg border overflow-hidden cursor-pointer transition-colors ${
                      expandedFile === file.id ? 'bg-accent border-accent-foreground/20' : 'bg-muted/30 hover:bg-muted/50'
                    }`}
                    onClick={() => handleExpandFile(file)}
                  >
                    <div className="flex items-start gap-3 p-3">
                      {/* Thumbnail */}
                      {isImageFile(file.file_name) && thumbnailUrls[file.id] ? (
                        <div className="w-12 h-12 rounded-md overflow-hidden bg-black shrink-0">
                          <img src={thumbnailUrls[file.id]} alt="" className="w-full h-full object-cover" />
                        </div>
                      ) : (
                        <div className="w-12 h-12 rounded-md bg-muted flex items-center justify-center shrink-0">
                          <activeCat.icon className="h-5 w-5 text-muted-foreground" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{file.file_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatFileSize(file.file_size)} · {new Date(file.created_at).toLocaleDateString()}
                        </p>
                        {file.notes && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{file.notes}</p>
                        )}
                        {file.health_dimension && (
                          <Badge variant="outline" className="text-[10px] mt-1">{file.health_dimension}</Badge>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Detail panel */}
          {selectedFile && (
            <div className="flex-1 min-w-0 rounded-lg border bg-background p-4 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold truncate">{selectedFile.file_name}</h3>
                <div className="flex items-center gap-1 shrink-0">
                  {isImageFile(selectedFile.file_name) && (
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleFullscreen(selectedFile)} title="Full screen">
                      <Maximize2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDownload(selectedFile)}>
                    <Download className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => handleDelete(selectedFile)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setExpandedFile(null); setExpandedPreviewUrl(null); }}>
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>

              {/* Image preview with fullscreen button */}
              {isImageFile(selectedFile.file_name) && expandedPreviewUrl && (
                <div
                  className="rounded-lg overflow-hidden bg-black flex items-center justify-center relative group cursor-pointer"
                  onClick={() => handleFullscreen(selectedFile)}
                >
                  <img src={expandedPreviewUrl} alt={selectedFile.file_name} className="max-h-[400px] w-auto object-contain" />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                    <Maximize2 className="h-8 w-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </div>
              )}

              {/* Doctor notes */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold flex items-center gap-1.5">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    Doctor Notes
                  </h4>
                  {editingNotes !== selectedFile.id && (
                    <Button variant="ghost" size="sm" className="h-7 text-xs gap-1"
                      onClick={() => { setEditingNotes(selectedFile.id); setNotesDraft(selectedFile.notes || ""); setDimensionDraft(selectedFile.health_dimension || null); }}
                    >
                      <Pencil className="h-3 w-3" /> Edit
                    </Button>
                  )}
                </div>

                {editingNotes === selectedFile.id ? (
                  <div className="space-y-3">
                    <Textarea
                      placeholder="Add clinical notes for this file..."
                      className="min-h-[100px] text-sm resize-none"
                      value={notesDraft}
                      onChange={e => setNotesDraft(e.target.value)}
                    />
                    <div className="flex gap-2 justify-end">
                      <Button variant="ghost" size="sm" onClick={() => setEditingNotes(null)}>
                        <X className="h-3.5 w-3.5 mr-1" /> Cancel
                      </Button>
                      <Button size="sm" disabled={savingNotes} onClick={() => handleSaveNotes(selectedFile.id)}>
                        {savingNotes ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Save className="h-3.5 w-3.5 mr-1" />}
                        Save Notes
                      </Button>
                    </div>
                  </div>
                ) : selectedFile.notes ? (
                  <div className="bg-muted/50 rounded-md p-3 text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                    {selectedFile.notes}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground italic">No notes yet. Click Edit to add clinical notes.</p>
                )}
              </div>

              {/* Health Dimension tagging - always visible */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Health Dimension</label>
                <Select
                  value={selectedFile.health_dimension || "none"}
                  onValueChange={async (v) => {
                    const newDim = v === "none" ? null : v;
                    const { error } = await supabase.from("patient_health_files").update({ health_dimension: newDim }).eq("id", selectedFile.id);
                    if (error) { toast.error("Failed to update dimension"); return; }
                    // Transfer notes to health category if tagging
                    if (newDim && selectedFile.notes) {
                      const { data: userData } = await supabase.auth.getUser();
                      if (userData.user) {
                        const { data: existing } = await supabase
                          .from("patient_health_categories")
                          .select("*")
                          .eq("patient_id", patientId)
                          .eq("category", newDim)
                          .maybeSingle();
                        const noteEntry = `[${selectedFile.file_name}]: ${selectedFile.notes}`;
                        if (existing) {
                          const updated = existing.summary ? `${existing.summary}\n\n${noteEntry}` : noteEntry;
                          await supabase.from("patient_health_categories").update({ summary: updated, updated_by: userData.user.id }).eq("id", existing.id);
                        } else {
                          await supabase.from("patient_health_categories").insert({ patient_id: patientId, category: newDim, summary: noteEntry, updated_by: userData.user.id });
                        }
                      }
                    }
                    toast.success(newDim ? `Tagged to ${newDim}` : "Dimension removed");
                    fetchFiles();
                  }}
                >
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder="Select dimension..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No dimension</SelectItem>
                    {HEALTH_DIMENSIONS.map(d => (
                      <SelectItem key={d} value={d}>{d}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
