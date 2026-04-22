import React, { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  Users, ArrowLeft, User, Eye, Brain, Dumbbell, Wind, Beaker,
  Droplets, Shield, Apple, Stethoscope, HeartPulse, Bone, FlaskConical,
  Moon, Pill, Activity, Ribbon, Sparkles, Radar, Save, X, Calendar, FileText, Trash2, Pencil,
  AlertTriangle, ClipboardList, Plus, ChevronDown, ChevronRight,
} from "lucide-react";
import { HEALTH_TAXONOMY, findDimension, findMainDimension, type MainDimension } from "@/lib/healthDimensions";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar as RechartsRadar, Legend, ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceArea } from "recharts";
import { DraggableReferenceChart } from "@/components/patients/DraggableReferenceChart";
import type { Tables } from "@/integrations/supabase/types";
import { AddLabResultsDialog } from "@/components/patients/AddLabResultsDialog";
import { PatientVisitsView } from "@/components/patients/PatientVisitsView";
import { HealthReportDialog } from "@/components/patients/HealthReportDialog";
import { HealthFileUploads, type HealthDataTab } from "@/components/patients/HealthFileUploads";
import { MetabolicDimensionView } from "@/components/patients/MetabolicDimensionView";
import { PatientMedicationsView } from "@/components/patients/PatientMedicationsView";
import { DimensionMedicationsSection } from "@/components/patients/DimensionMedicationsSection";
import {
  CardioLabBiomarkerPanel,
  getAnnotations,
  markIncluded,
  useAnnotationsVersion,
  type LabAnnotation,
} from "@/components/patients/CardioLabBiomarkerPanel";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth } from "@/hooks/useAuth";

// Legacy flat list for backward compat in dimension views
const HEALTH_DIMENSIONS = HEALTH_TAXONOMY.flatMap((main) => {
  const items = [{ key: main.key, label: main.label, icon: main.icon }];
  main.subDimensions.forEach((sub) => items.push({ key: sub.key, label: sub.label, icon: sub.icon }));
  return items;
});

type SidebarSection = "details" | string;

const TIER_LABELS: Record<string, string> = {
  tier_1: "Tier 1", tier_2: "Tier 2", tier_3: "Tier 3", tier_4: "Tier 4",
  children: "Children", onboarding: "Onboarding", acute: "Acute", case_management: "Case Management",
};

const PatientProfilePage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [patient, setPatient] = useState<Tables<"patients"> | null>(null);
  const [onboarding, setOnboarding] = useState<Tables<"patient_onboarding"> | null>(null);
  const [labResults, setLabResults] = useState<Tables<"patient_lab_results">[]>([]);
  const [healthCategories, setHealthCategories] = useState<Tables<"patient_health_categories">[]>([]);
  const [visitNotes, setVisitNotes] = useState<Tables<"visit_notes">[]>([]);
  const [appointments, setAppointments] = useState<Tables<"appointments">[]>([]);
  const [patientTasks, setPatientTasks] = useState<any[]>([]);
  const [activeSection, setActiveSection] = useState<SidebarSection>("overview");
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [markerNotes, setMarkerNotes] = useState<Record<string, string>>({});

  const fetchData = async () => {
    if (!id) return;
    setLoading(true);
    const [patientRes, onboardingRes, labRes, healthCatRes, visitNotesRes, appointmentsRes, tasksRes] = await Promise.all([
      supabase.from("patients").select("*").eq("id", id).single(),
      supabase.from("patient_onboarding").select("*").eq("patient_id", id).maybeSingle(),
      supabase.from("patient_lab_results").select("*").eq("patient_id", id).order("result_date", { ascending: false }),
      supabase.from("patient_health_categories").select("*").eq("patient_id", id),
      supabase.from("visit_notes").select("*").eq("patient_id", id).order("visit_date", { ascending: false }),
      supabase.from("appointments").select("*").eq("patient_id", id).order("start_time", { ascending: false }),
      supabase.from("tasks").select("*").eq("patient_id", id).in("status", ["todo", "in_progress"]).order("due_date", { ascending: true }),
    ]);
    setPatient(patientRes.data);
    setOnboarding(onboardingRes.data);
    setLabResults(labRes.data || []);
    setHealthCategories(healthCatRes.data || []);
    setVisitNotes(visitNotesRes.data || []);
    setAppointments(appointmentsRes.data || []);
    setPatientTasks(tasksRes.data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [id]);

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-muted-foreground">Loading patient profile...</div>;
  }

  if (!patient) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={() => navigate("/patients")} className="gap-1.5">
          <ArrowLeft className="h-4 w-4" /> Back to Patients
        </Button>
        <p className="text-muted-foreground">Patient not found.</p>
      </div>
    );
  }

  const age = patient.date_of_birth
    ? Math.floor((Date.now() - new Date(patient.date_of_birth).getTime()) / 31557600000)
    : onboarding?.age;

  return (
    <div className="flex gap-6 h-[calc(100vh-8rem)]">
      {/* Sidebar */}
      <div className="w-64 shrink-0 border rounded-lg bg-card flex flex-col">
        <div className="p-4 border-b">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="h-5 w-5 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="font-semibold truncate text-sm">{patient.full_name}</p>
              <p className="text-xs text-muted-foreground">
                {age ? `Age ${age}` : ""}{age && patient.gender ? " • " : ""}{patient.gender || ""}
              </p>
            </div>
          </div>
          {patient.tier && (
            <Badge variant="outline" className="mt-2 text-xs">{TIER_LABELS[patient.tier] || patient.tier}</Badge>
          )}
        </div>

        <ScrollArea className="flex-1">
          <div className="p-2">
            <button
              onClick={() => setActiveSection("overview")}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors ${
                activeSection === "overview" ? "bg-primary text-primary-foreground" : "hover:bg-muted text-foreground"
              }`}
            >
              <Stethoscope className="h-4 w-4" />
              Overview
            </button>

            {(() => {
              const thirtyDaysAgo = new Date();
              thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
              const hasNewLabs = labResults.some(l => new Date(l.result_date) >= thirtyDaysAgo);
              const hasLabReviewTasks = patientTasks.some(t => t.category === "clinical_review" && ["todo", "in_progress"].includes(t.status));
              const labNotification = hasNewLabs || hasLabReviewTasks;
              return (
                <button
                  onClick={() => setActiveSection("lab_results")}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors ${
                    activeSection === "lab_results" ? "bg-primary text-primary-foreground" : "hover:bg-muted text-foreground"
                  }`}
                >
                  <FlaskConical className="h-4 w-4" />
                  Health Data
                  {labNotification && (
                    <span className="ml-auto flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
                      !
                    </span>
                  )}
                </button>
              );
            })()}

            <button
              onClick={() => setActiveSection("medications")}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors ${
                activeSection === "medications" ? "bg-primary text-primary-foreground" : "hover:bg-muted text-foreground"
              }`}
            >
              <Pill className="h-4 w-4" />
              Medications
            </button>

            <button
              onClick={() => setActiveSection("visits")}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors ${
                activeSection === "visits" ? "bg-primary text-primary-foreground" : "hover:bg-muted text-foreground"
              }`}
            >
              <Calendar className="h-4 w-4" />
              Visits
            </button>

            <button
              onClick={() => setActiveSection("health_overview")}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors ${
                activeSection === "health_overview" ? "bg-primary text-primary-foreground" : "hover:bg-muted text-foreground"
              }`}
            >
              <Radar className="h-4 w-4" />
              Health Report
            </button>

            <button
              onClick={() => setActiveSection("details")}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors ${
                activeSection === "details" ? "bg-primary text-primary-foreground" : "hover:bg-muted text-foreground"
              }`}
            >
              <Users className="h-4 w-4" />
              Patient Details
            </button>

            <Separator className="my-2" />
            <p className="px-3 py-1 text-xs font-medium text-muted-foreground uppercase tracking-wider">Health Dimensions</p>

            {HEALTH_TAXONOMY.map((main) => {
              const MainIcon = main.icon;
              const isMainActive = activeSection === main.key;
              const isSubActive = main.subDimensions.some((s) => s.key === activeSection);
              const isExpanded = expandedGroups[main.key] ?? isSubActive;
              const hasSubs = main.subDimensions.length > 0;

              return (
                <div key={main.key}>
                  <button
                    onClick={() => {
                      if (hasSubs) {
                        setExpandedGroups((prev) => ({ ...prev, [main.key]: !isExpanded }));
                      }
                      setActiveSection(main.key);
                    }}
                    className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors ${
                      isMainActive ? "bg-primary text-primary-foreground" : "hover:bg-muted text-foreground"
                    }`}
                  >
                    <MainIcon className="h-4 w-4" />
                    <span className="flex-1 text-left">{main.number}. {main.label}</span>
                    {hasSubs && (
                      isExpanded
                        ? <ChevronDown className="h-3.5 w-3.5 opacity-50" />
                        : <ChevronRight className="h-3.5 w-3.5 opacity-50" />
                    )}
                  </button>
                  {hasSubs && isExpanded && (
                    <div className="ml-4 border-l border-border/50 pl-2 mt-0.5 mb-1">
                      {main.subDimensions.map((sub) => {
                        const SubIcon = sub.icon;
                        return (
                          <button
                            key={sub.key}
                            onClick={() => setActiveSection(sub.key)}
                            className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs transition-colors ${
                              activeSection === sub.key
                                ? "bg-primary text-primary-foreground"
                                : "hover:bg-muted text-foreground"
                            }`}
                          >
                            <SubIcon className="h-3.5 w-3.5" />
                            {sub.label}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </div>

      {/* Main content */}
      <div className={`flex-1 flex flex-col overflow-auto`}>
        <Button variant="ghost" size="sm" onClick={() => navigate("/patients")} className="gap-1.5 mb-4">
          <ArrowLeft className="h-4 w-4" /> Back to Patients
        </Button>

        {activeSection === "overview" ? (
          <CareOverviewView patient={patient} appointments={appointments} visitNotes={visitNotes} healthCategories={healthCategories} labResults={labResults} onSelectSection={setActiveSection} tasks={patientTasks} onTasksChanged={fetchData} />
        ) : activeSection === "details" ? (
          <PatientDetailsView patient={patient} onboarding={onboarding} age={age} labResults={labResults} onLabResultsAdded={fetchData} visitNotes={visitNotes} appointments={appointments} />
        ) : activeSection === "medications" ? (
          <PatientMedicationsView patientName={patient.full_name} />
        ) : activeSection === "visits" ? (
          <PatientVisitsView patient={patient} appointments={appointments} visitNotes={visitNotes} onDataChanged={fetchData} />
        ) : activeSection === "health_overview" ? (
          <HealthOverviewView
            patient={patient}
            onboarding={onboarding}
            labResults={labResults}
            healthCategories={healthCategories}
            appointments={appointments}
            onSelectDimension={(key) => setActiveSection(key)}
            onPatientUpdate={(updated) => setPatient(updated)}
          />
        ) : activeSection === "lab_results" ? (
          <LabResultsView patientId={patient.id} labResults={labResults} onLabResultsAdded={fetchData} onNavigateDimension={setActiveSection} markerNotes={markerNotes} setMarkerNotes={setMarkerNotes} />
        ) : (
          <HealthDimensionView
            dimensionKey={activeSection}
            patient={patient}
            onboarding={onboarding}
            labResults={labResults}
            healthCategories={healthCategories}
            markerNotes={markerNotes}
            setMarkerNotes={setMarkerNotes}
            onNavigateDimension={setActiveSection}
            onDataChanged={fetchData}
          />
        )}
      </div>
    </div>
  );
};

// Compute a simple score (1-10) for each of the 9 main health dimensions
function computeRadarData(
  onboarding: Tables<"patient_onboarding"> | null,
  labResults: Tables<"patient_lab_results">[],
  healthCategories: Tables<"patient_health_categories">[],
) {
  const lab = labResults[0] || null;
  const catMap = new Map(healthCategories.map((c) => [c.category.toLowerCase(), c]));

  const getStoredScore = (keys: string[]): number | null => {
    const statusScores: Record<string, number> = { normal: 2, monitor: 4, attention: 6, warning: 8, critical: 10 };
    for (const k of keys) {
      const stored = catMap.get(k.toLowerCase());
      if (stored) return statusScores[stored.status] ?? 3;
    }
    return null;
  };

  return HEALTH_TAXONOMY.map((main) => {
    // Check stored categories first
    const allKeys = [main.label, ...main.subDimensions.map((s) => s.label)];
    const storedScore = getStoredScore(allKeys);
    if (storedScore !== null) return { category: main.label, key: main.key, score: storedScore };

    let score = 1;
    if (!onboarding && !lab) return { category: main.label, key: main.key, score };

    switch (main.key) {
      case "brain_mental":
        if (onboarding?.illness_neurological) score += 2;
        if (onboarding?.illness_mental_health) score += 2;
        if (onboarding?.gad7_score && onboarding.gad7_score > 10) score += 2;
        if (onboarding?.insomnia) score += 1;
        if (onboarding?.illness_senses) score += 1;
        if (onboarding?.alcohol_units_per_week && Number(onboarding.alcohol_units_per_week) > 14) score += 1;
        if (onboarding?.other_substances) score += 1;
        break;
      case "metabolic":
        if (onboarding?.illness_hormone) score += 2;
        if (onboarding?.illness_kidney) score += 2;
        if (onboarding?.bmi && (Number(onboarding.bmi) > 30 || Number(onboarding.bmi) < 18.5)) score += 2;
        if (lab?.tsh_mu_l && (Number(lab.tsh_mu_l) < 0.4 || Number(lab.tsh_mu_l) > 4.0)) score += 1;
        if (lab?.egfr && Number(lab.egfr) < 60) score += 2;
        if (lab?.hba1c_mmol_mol && Number(lab.hba1c_mmol_mol) > 42) score += 1;
        break;
      case "cardiovascular":
        if (onboarding?.illness_cardiovascular) score += 3;
        if (lab?.ldl_mmol_l && Number(lab.ldl_mmol_l) > 3.0) score += 2;
        if (lab?.blood_pressure_systolic && Number(lab.blood_pressure_systolic) > 140) score += 2;
        if (onboarding?.genetic_cardiovascular) score += 1;
        break;
      case "exercise_functional":
        if (onboarding?.exercise_met_hours != null && onboarding.exercise_met_hours < 5) score += 3;
        if (onboarding?.illness_musculoskeletal) score += 2;
        if (onboarding?.symptom_joint_pain) score += 1;
        if (onboarding?.symptom_mobility_restriction) score += 2;
        break;
      case "digestion":
        if (onboarding?.illness_liver) score += 2;
        if (onboarding?.illness_gastrointestinal) score += 2;
        if (onboarding?.symptom_gastrointestinal) score += 2;
        if (lab?.alat_u_l && Number(lab.alat_u_l) > 50) score += 1;
        if (lab?.gt_u_l && Number(lab.gt_u_l) > 60) score += 1;
        break;
      case "respiratory_immune":
        if (onboarding?.symptom_respiratory) score += 2;
        if (onboarding?.illness_immune) score += 2;
        if (onboarding?.symptom_immune_allergies) score += 2;
        if (onboarding?.smoking === "yes") score += 2;
        if (onboarding?.infections_per_year && Number(onboarding.infections_per_year) > 4) score += 1;
        break;
      case "cancer_risk":
        if (onboarding?.illness_cancer || onboarding?.prev_cancer) score += 4;
        if (onboarding?.genetic_cancer || onboarding?.genetic_melanoma) score += 2;
        if (onboarding?.prev_precancerous) score += 2;
        break;
      case "skin_oral_mucosal":
        if (onboarding?.symptom_skin_rash || onboarding?.symptom_mucous_membranes) score += 3;
        if (onboarding?.skin_condition && onboarding.skin_condition > 3) score += 2;
        if (onboarding?.sun_exposure) score += 1;
        break;
      case "reproductive_sexual":
        if (onboarding?.symptom_menstruation_menopause) score += 3;
        if (lab?.testosterone_estrogen_abnormal) score += 2;
        break;
    }
    return { category: main.label, key: main.key, score: Math.min(score, 10) };
  });
}

function HealthOverviewView({
  patient, onboarding, labResults, healthCategories, appointments, onSelectDimension, onPatientUpdate,
}: {
  patient: Tables<"patients">;
  onboarding: Tables<"patient_onboarding"> | null;
  labResults: Tables<"patient_lab_results">[];
  healthCategories: Tables<"patient_health_categories">[];
  appointments: Tables<"appointments">[];
  onSelectDimension: (key: string) => void;
  onPatientUpdate: (updated: Tables<"patients">) => void;
}) {
  const radarData = useMemo(
    () => computeRadarData(onboarding, labResults, healthCategories),
    [onboarding, labResults, healthCategories],
  );

  const [summary, setSummary] = useState((patient as any).health_summary || "");
  const [recommendations, setRecommendations] = useState((patient as any).health_recommendations || "");
  const [saving, setSaving] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [editingDraftId, setEditingDraftId] = useState<string | null>(null);
  const [savedReports, setSavedReports] = useState<any[]>([]);

  const fetchReports = async () => {
    const { data } = await supabase
      .from("health_reports")
      .select("*")
      .eq("patient_id", patient.id)
      .order("updated_at", { ascending: false });
    setSavedReports(data || []);
  };

  useEffect(() => { fetchReports(); }, [patient.id]);

  // Auto-linked dimension notes
  const dimensionNotes = healthCategories
    .filter((c) => c.summary?.trim())
    .map((c) => `[${c.category.charAt(0).toUpperCase() + c.category.slice(1)}] ${c.summary!.trim()}`);
  const dimensionRecommendations = healthCategories
    .filter((c) => (c as any).recommendations?.trim())
    .map((c) => `[${c.category.charAt(0).toUpperCase() + c.category.slice(1)}] ${(c as any).recommendations.trim()}`);

  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("patients")
      .update({ health_summary: summary, health_recommendations: recommendations } as any)
      .eq("id", patient.id);
    setSaving(false);
    if (error) {
      toast.error("Failed to save");
    } else {
      toast.success("Saved successfully");
      onPatientUpdate({ ...patient, health_summary: summary, health_recommendations: recommendations } as any);
    }
  };

  const openNewReport = () => {
    setEditingDraftId(null);
    setReportOpen(true);
  };

  const openDraft = (id: string) => {
    setEditingDraftId(id);
    setReportOpen(true);
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
      <Card className="xl:row-span-2">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Radar className="h-5 w-5 text-primary" />
            Health Report
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            1 = no action needed → 10 = immediate action. Click a label for details.
          </p>
        </CardHeader>
        <CardContent>
          <div className="h-[480px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="75%">
                <PolarGrid stroke="hsl(var(--border))" />
                <PolarAngleAxis
                  dataKey="category"
                  tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11, cursor: "pointer" }}
                  onClick={(e: any) => {
                    if (e?.value) {
                      const main = HEALTH_TAXONOMY.find((d) => d.label === e.value);
                      if (main) onSelectDimension(main.key);
                    }
                  }}
                />
                <PolarRadiusAxis
                  angle={90}
                  domain={[0, 10]}
                  tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
                />
                <RechartsRadar
                  name="Risk Score"
                  dataKey="score"
                  stroke="hsl(var(--primary))"
                  fill="hsl(var(--primary))"
                  fillOpacity={0.3}
                />
                <Legend />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-col gap-4">
        <Card className="flex-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              placeholder="Write a clinical summary of the patient's overall health status..."
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              className="min-h-[140px] resize-none"
            />
            {dimensionNotes.length > 0 && (
              <div className="mt-3">
                <p className="text-xs font-medium text-muted-foreground mb-1">Auto-linked from Health Dimensions</p>
                <div className="rounded-md border bg-muted/40 p-3 text-xs whitespace-pre-wrap text-foreground">
                  {dimensionNotes.join("\n")}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="flex-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Recommendations</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              placeholder="Write recommendations for the patient's care plan..."
              value={recommendations}
              onChange={(e) => setRecommendations(e.target.value)}
              className="min-h-[140px] resize-none"
            />
            {dimensionRecommendations.length > 0 && (
              <div className="mt-3">
                <p className="text-xs font-medium text-muted-foreground mb-1">Auto-linked from Health Dimensions</p>
                <div className="rounded-md border bg-muted/40 p-3 text-xs whitespace-pre-wrap text-foreground">
                  {dimensionRecommendations.join("\n")}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={openNewReport} className="gap-2">
            <FlaskConical className="h-4 w-4" />
            Generate Report
          </Button>
          <Button onClick={handleSave} disabled={saving} className="gap-2">
            <Save className="h-4 w-4" />
            {saving ? "Saving..." : "Save"}
          </Button>
        </div>
      </div>

      {/* Saved Reports */}
      {savedReports.length > 0 && (
        <Card className="xl:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="h-4 w-4 text-primary" />
              Saved Report Drafts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {savedReports.slice(0, 3).map((r: any) => (
                <div
                  key={r.id}
                  className="flex items-center justify-between p-3 rounded-md border hover:bg-muted/50 cursor-pointer transition-colors"
                  onClick={() => openDraft(r.id)}
                >
                  <div>
                    <p className="text-sm font-medium">{r.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {r.status === "draft" ? "Draft" : "Final"} · Updated {new Date(r.updated_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                    </p>
                  </div>
                  <Badge variant={r.status === "draft" ? "secondary" : "default"}>{r.status}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <HealthReportDialog
        open={reportOpen}
        onOpenChange={setReportOpen}
        patient={patient}
        onboarding={onboarding}
        labResults={labResults}
        healthCategories={healthCategories}
        radarData={radarData}
        appointments={appointments}
        draftId={editingDraftId}
        onDraftSaved={fetchReports}
      />
    </div>
  );
}

// Reports listing subpage
function ReportsListView({ patient, onboarding, labResults, healthCategories, appointments }: {
  patient: Tables<"patients">;
  onboarding: Tables<"patient_onboarding"> | null;
  labResults: Tables<"patient_lab_results">[];
  healthCategories: Tables<"patient_health_categories">[];
  appointments: Tables<"appointments">[];
}) {
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [reportOpen, setReportOpen] = useState(false);
  const [editingDraftId, setEditingDraftId] = useState<string | null>(null);

  const radarData = useMemo(
    () => computeRadarData(onboarding, labResults, healthCategories),
    [onboarding, labResults, healthCategories],
  );

  const fetchReports = async () => {
    const { data } = await supabase
      .from("health_reports")
      .select("*")
      .eq("patient_id", patient.id)
      .order("updated_at", { ascending: false });
    setReports(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchReports(); }, [patient.id]);

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const { error } = await supabase.from("health_reports").delete().eq("id", id);
    if (error) {
      toast.error("Failed to delete report");
    } else {
      toast.success("Report deleted");
      fetchReports();
    }
  };

  const openDraft = (id: string) => {
    setEditingDraftId(id);
    setReportOpen(true);
  };

  const openNewReport = () => {
    setEditingDraftId(null);
    setReportOpen(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Health Reports
          </h2>
          <p className="text-sm text-muted-foreground">All saved report drafts for {patient.full_name}</p>
        </div>
        <Button onClick={openNewReport} className="gap-2">
          <FlaskConical className="h-4 w-4" />
          New Report
        </Button>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground py-8 text-center">Loading reports...</p>
      ) : reports.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No reports yet. Generate your first report from the Health Overview.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {reports.map((r: any) => (
            <Card
              key={r.id}
              className="cursor-pointer hover:border-primary/40 transition-colors"
              onClick={() => openDraft(r.id)}
            >
              <CardContent className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <FileText className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">{r.title}</p>
                    <p className="text-xs text-muted-foreground">
                      Created {new Date(r.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                      {" · "}Updated {new Date(r.updated_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={r.status === "draft" ? "secondary" : "default"}>{r.status}</Badge>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={(e) => handleDelete(r.id, e)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <HealthReportDialog
        open={reportOpen}
        onOpenChange={setReportOpen}
        patient={patient}
        onboarding={onboarding}
        labResults={labResults}
        healthCategories={healthCategories}
        radarData={radarData}
        appointments={appointments}
        draftId={editingDraftId}
        onDraftSaved={fetchReports}
      />
    </div>
  );
}

// Care Coordination Overview - doctor's landing view
function CareOverviewView({ patient, appointments, visitNotes, healthCategories, labResults, onSelectSection, tasks, onTasksChanged }: {
  patient: Tables<"patients">;
  appointments: Tables<"appointments">[];
  visitNotes: Tables<"visit_notes">[];
  healthCategories: Tables<"patient_health_categories">[];
  labResults: Tables<"patient_lab_results">[];
  onSelectSection: (key: string) => void;
  tasks: any[];
  onTasksChanged: () => void;
}) {
  const navigate = useNavigate();
  const [diagnoses, setDiagnoses] = useState<any[]>([]);
  const [medications, setMedications] = useState<any[]>([]);
  const [allMedications, setAllMedications] = useState<any[]>([]);
  const [careTeam, setCareTeam] = useState<any[]>([]);
  const [allergies, setAllergies] = useState<any[]>([]);
  const [considerations, setConsiderations] = useState<any[]>([]);
  const [medLogs, setMedLogs] = useState<any[]>([]);
  const [editingTask, setEditingTask] = useState<any | null>(null);
  const [editForm, setEditForm] = useState({ title: "", description: "", category: "", priority: "", status: "", due_date: "" });
  const [newAllergy, setNewAllergy] = useState({ allergen: "", reaction: "", severity: "moderate" });
  const [showAllergyForm, setShowAllergyForm] = useState(false);
  const [newConsideration, setNewConsideration] = useState({ title: "", description: "", category: "other" });
  const [showConsiderationForm, setShowConsiderationForm] = useState(false);
  const [showAllMedications, setShowAllMedications] = useState(false);
  const [showMedForm, setShowMedForm] = useState(false);
  const [newMed, setNewMed] = useState({ medication_name: "", dose: "", frequency: "", indication: "", start_date: "" });
  const [editingMedId, setEditingMedId] = useState<string | null>(null);
  const [editMedForm, setEditMedForm] = useState({ medication_name: "", dose: "", frequency: "", indication: "", start_date: "", end_date: "", status: "active" });
  const { user } = useAuth();

  const handleAddMedication = async () => {
    if (!user || !newMed.medication_name.trim()) return;
    const { error } = await supabase.from("patient_medications").insert({
      patient_id: patient.id, created_by: user.id,
      medication_name: newMed.medication_name.trim(),
      dose: newMed.dose.trim() || null,
      frequency: newMed.frequency.trim() || null,
      indication: newMed.indication.trim() || null,
      start_date: newMed.start_date || null,
    });
    if (error) { toast.error("Failed to add medication"); return; }
    toast.success("Medication added");
    setNewMed({ medication_name: "", dose: "", frequency: "", indication: "", start_date: "" });
    setShowMedForm(false);
    fetchOverviewData();
  };

  const startEditMed = (m: any) => {
    setEditingMedId(m.id);
    setEditMedForm({
      medication_name: m.medication_name || "",
      dose: m.dose || "",
      frequency: m.frequency || "",
      indication: m.indication || "",
      start_date: m.start_date || "",
      end_date: m.end_date || "",
      status: m.status || "active",
    });
  };

  const handleSaveMed = async () => {
    if (!editingMedId || !user) return;
    // Find original medication for change log
    const original = allMedications.find(m => m.id === editingMedId);
    const doseChanged = original && (original.dose || "") !== editMedForm.dose.trim();
    const freqChanged = original && (original.frequency || "") !== editMedForm.frequency.trim();

    const { error } = await supabase.from("patient_medications").update({
      medication_name: editMedForm.medication_name.trim(),
      dose: editMedForm.dose.trim() || null,
      frequency: editMedForm.frequency.trim() || null,
      indication: editMedForm.indication.trim() || null,
      start_date: editMedForm.start_date || null,
      end_date: editMedForm.end_date || null,
      status: editMedForm.status,
    }).eq("id", editingMedId);
    if (error) { toast.error("Failed to update medication"); return; }

    // Auto-log dose/frequency changes
    if (doseChanged || freqChanged) {
      await supabase.from("patient_medication_logs" as any).insert({
        medication_id: editingMedId,
        patient_id: patient.id,
        changed_by: user.id,
        change_type: doseChanged ? "dose_adjustment" : "frequency_change",
        previous_dose: original?.dose || null,
        new_dose: editMedForm.dose.trim() || null,
        previous_frequency: original?.frequency || null,
        new_frequency: editMedForm.frequency.trim() || null,
      } as any);
    }

    toast.success("Medication updated");
    setEditingMedId(null);
    fetchOverviewData();
  };

  const fetchOverviewData = async () => {
    const [diagRes, medRes, allMedRes, teamRes, allergyRes, considRes, logsRes] = await Promise.all([
      supabase.from("patient_diagnoses").select("*").eq("patient_id", patient.id).eq("status", "active").order("diagnosed_date", { ascending: false }),
      supabase.from("patient_medications").select("*").eq("patient_id", patient.id).eq("status", "active").order("medication_name"),
      supabase.from("patient_medications").select("*").eq("patient_id", patient.id).order("status").order("medication_name"),
      supabase.from("patient_care_team").select("*").eq("patient_id", patient.id).eq("is_active", true).order("role"),
      supabase.from("patient_allergies" as any).select("*").eq("patient_id", patient.id).eq("status", "active").order("allergen"),
      supabase.from("patient_clinical_considerations" as any).select("*").eq("patient_id", patient.id).eq("is_active", true).order("created_at", { ascending: false }),
      supabase.from("patient_medication_logs" as any).select("*").eq("patient_id", patient.id).order("change_date", { ascending: false }),
    ]);
    setDiagnoses(diagRes.data || []);
    setMedications(medRes.data || []);
    setAllMedications(allMedRes.data || []);
    setCareTeam(teamRes.data || []);
    setAllergies(allergyRes.data || []);
    setConsiderations(considRes.data || []);
    setMedLogs(logsRes.data || []);
  };

  useEffect(() => {
    fetchOverviewData();
  }, [patient.id]);

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const sortedLabs = [...(labResults || [])].sort((a, b) => new Date(b.result_date).getTime() - new Date(a.result_date).getTime());
  const recentLabs = sortedLabs.filter(l => new Date(l.result_date) >= thirtyDaysAgo);
  const olderLabs = sortedLabs.filter(l => new Date(l.result_date) < thirtyDaysAgo);

  const taskCategoryLabels: Record<string, string> = {
    clinical_review: "Labs",
    client_communication: "Follow-up",
    care_coordination: "Referral",
    documentation_reporting: "Visit",
  };

  const roleLabels: Record<string, string> = {
    personal_doctor: "Personal Doctor",
    nurse: "Nurse",
    external_specialist: "External Specialist",
  };

  const roleOrder: Record<string, number> = { personal_doctor: 0, nurse: 1, external_specialist: 2 };
  const sortedTeam = [...careTeam].sort((a, b) => (roleOrder[a.role] ?? 9) - (roleOrder[b.role] ?? 9));

  const openEditTask = (task: any) => {
    setEditingTask(task);
    setEditForm({
      title: task.title || "",
      description: task.description || "",
      category: task.category || "",
      priority: task.priority || "medium",
      status: task.status || "todo",
      due_date: task.due_date || "",
    });
  };

  const handleSaveTask = async () => {
    if (!editingTask) return;
    const { error } = await supabase.from("tasks").update({
      title: editForm.title,
      description: editForm.description,
      category: editForm.category as any,
      priority: editForm.priority as any,
      status: editForm.status as any,
      due_date: editForm.due_date || null,
    }).eq("id", editingTask.id);
    if (error) {
      toast.error("Failed to update task");
    } else {
      toast.success("Task updated");
      setEditingTask(null);
      onTasksChanged();
    }
  };

  return (
    <div className="flex gap-6 h-full">
    <div className={`space-y-6 p-1 ${showAllMedications ? "w-1/2 shrink-0" : "flex-1"} overflow-auto`}>
      <div>
        <h2 className="text-xl font-semibold">{patient.full_name}</h2>
        <p className="text-sm text-muted-foreground">Care Coordination Overview</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* 1. Tasks To-Do List */}
        <Card className="xl:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" />
              Tasks
            </CardTitle>
          </CardHeader>
          <CardContent>
            {tasks.length === 0 ? (
              <p className="text-sm text-muted-foreground">No open tasks for this patient.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8"></TableHead>
                    <TableHead>Task</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Assigned To</TableHead>
                    <TableHead>Priority</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tasks.map((task) => (
                    <TableRow key={task.id} className="cursor-pointer hover:bg-muted/50" onClick={() => openEditTask(task)}>
                      <TableCell>
                        <div className={`h-3 w-3 rounded-full border ${task.status === "in_progress" ? "bg-primary border-primary" : "border-muted-foreground"}`} />
                      </TableCell>
                      <TableCell className="font-medium text-sm">{task.title}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs capitalize">
                          {taskCategoryLabels[task.category] || task.category.replace("_", " ")}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {task.due_date ? new Date(task.due_date).toLocaleDateString("en-GB", { day: "numeric", month: "short" }) : "—"}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {task.assigned_to ? "Assigned" : "Unassigned"}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`text-xs capitalize ${
                          task.priority === "urgent" ? "bg-destructive/10 text-destructive border-destructive/30" :
                          task.priority === "high" ? "bg-orange-500/10 text-orange-700 border-orange-200" :
                          ""
                        }`}>
                          {task.priority}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
            <Button variant="ghost" size="sm" className="w-full text-xs mt-2" onClick={() => navigate("/tasks")}>
              See all tasks →
            </Button>
          </CardContent>
        </Card>

        {/* 2. Active Diagnoses */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Stethoscope className="h-4 w-4 text-primary" />
              Active Diagnoses
            </CardTitle>
          </CardHeader>
          <CardContent>
            {diagnoses.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">No active diagnoses recorded.</p>
            ) : (
              <div className="space-y-2">
                {diagnoses.map((d) => (
                  <div key={d.id} className="flex items-start justify-between p-2 rounded-md bg-muted/40">
                    <div>
                      <p className="text-sm font-medium">{d.diagnosis}</p>
                      {d.icd_code && <span className="text-xs text-muted-foreground">ICD: {d.icd_code}</span>}
                    </div>
                    {d.diagnosed_date && (
                      <span className="text-xs text-muted-foreground whitespace-nowrap ml-2">
                        {new Date(d.diagnosed_date).toLocaleDateString("en-GB", { month: "short", year: "numeric" })}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* 3. Active Medications */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Pill className="h-4 w-4 text-primary" />
              Active Medications
              <div className="ml-auto flex items-center gap-1">
                <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => setShowMedForm(v => !v)}>
                  <Plus className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="sm" className="h-6 text-xs text-muted-foreground" onClick={() => setShowAllMedications(v => !v)}>
                  {showAllMedications ? "Close" : "See all →"}
                </Button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {showMedForm && (
              <div className="space-y-2 mb-3 p-2 border rounded-md bg-muted/30">
                <Input placeholder="Medication name *" value={newMed.medication_name} onChange={e => setNewMed(p => ({ ...p, medication_name: e.target.value }))} className="h-8 text-sm" />
                <div className="grid grid-cols-2 gap-2">
                  <Input placeholder="Dose (e.g. 10 mg)" value={newMed.dose} onChange={e => setNewMed(p => ({ ...p, dose: e.target.value }))} className="h-8 text-sm" />
                  <Input placeholder="Frequency (e.g. 1x daily)" value={newMed.frequency} onChange={e => setNewMed(p => ({ ...p, frequency: e.target.value }))} className="h-8 text-sm" />
                </div>
                <Input placeholder="Indication (e.g. Hypertension)" value={newMed.indication} onChange={e => setNewMed(p => ({ ...p, indication: e.target.value }))} className="h-8 text-sm" />
                <Input type="date" value={newMed.start_date} onChange={e => setNewMed(p => ({ ...p, start_date: e.target.value }))} className="h-8 text-sm" />
                <div className="flex gap-2">
                  <Button size="sm" className="h-7 text-xs" disabled={!newMed.medication_name.trim()} onClick={handleAddMedication}>Add</Button>
                  <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setShowMedForm(false)}>Cancel</Button>
                </div>
              </div>
            )}
            {medications.length === 0 && !showMedForm ? (
              <p className="text-sm text-muted-foreground italic">No active medications recorded.</p>
            ) : (
              <div className="space-y-2">
                {medications.map((m) => (
                  <div key={m.id} className="p-2 rounded-md bg-muted/40 cursor-pointer hover:bg-muted/60 transition-colors" onClick={() => startEditMed(m)}>
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium">{m.medication_name}</p>
                      <div className="flex items-center gap-2">
                        {m.dose && <span className="text-xs text-muted-foreground">{m.dose}</span>}
                        <Pencil className="h-3 w-3 text-muted-foreground" />
                      </div>
                    </div>
                    <div className="flex gap-2 mt-0.5">
                      {m.frequency && <span className="text-xs text-muted-foreground">{m.frequency}</span>}
                      {m.indication && <span className="text-xs text-muted-foreground">· {m.indication}</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* 4. Allergies */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              Allergies
              <Button variant="ghost" size="icon" className="h-5 w-5 ml-auto" onClick={() => setShowAllergyForm(v => !v)}>
                <Plus className="h-3.5 w-3.5" />
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {showAllergyForm && (
              <div className="space-y-2 mb-3 p-2 border rounded-md bg-muted/30">
                <Input placeholder="Allergen (e.g. Penicillin)" value={newAllergy.allergen} onChange={e => setNewAllergy(p => ({ ...p, allergen: e.target.value }))} className="h-8 text-sm" />
                <Input placeholder="Reaction (e.g. Anaphylaxis)" value={newAllergy.reaction} onChange={e => setNewAllergy(p => ({ ...p, reaction: e.target.value }))} className="h-8 text-sm" />
                <Select value={newAllergy.severity} onValueChange={v => setNewAllergy(p => ({ ...p, severity: v }))}>
                  <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mild">Mild</SelectItem>
                    <SelectItem value="moderate">Moderate</SelectItem>
                    <SelectItem value="severe">Severe</SelectItem>
                  </SelectContent>
                </Select>
                <div className="flex gap-2">
                  <Button size="sm" className="h-7 text-xs" disabled={!newAllergy.allergen.trim()} onClick={async () => {
                    if (!user) return;
                    const { error } = await supabase.from("patient_allergies" as any).insert({ patient_id: patient.id, created_by: user.id, allergen: newAllergy.allergen.trim(), reaction: newAllergy.reaction.trim() || null, severity: newAllergy.severity } as any);
                    if (error) { toast.error("Failed to add allergy"); return; }
                    toast.success("Allergy added");
                    setNewAllergy({ allergen: "", reaction: "", severity: "moderate" });
                    setShowAllergyForm(false);
                    fetchOverviewData();
                  }}>Add</Button>
                  <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setShowAllergyForm(false)}>Cancel</Button>
                </div>
              </div>
            )}
            {allergies.length === 0 && !showAllergyForm ? (
              <p className="text-sm text-muted-foreground italic">No allergies recorded.</p>
            ) : (
              <div className="space-y-2">
                {allergies.map((a: any) => (
                  <div key={a.id} className="flex items-start justify-between p-2 rounded-md bg-muted/40">
                    <div>
                      <p className="text-sm font-medium">{a.allergen}</p>
                      <div className="flex gap-2 mt-0.5">
                        {a.reaction && <span className="text-xs text-muted-foreground">{a.reaction}</span>}
                        <Badge variant="outline" className={`text-xs capitalize ${a.severity === "severe" ? "bg-destructive/10 text-destructive border-destructive/30" : a.severity === "moderate" ? "bg-orange-500/10 text-orange-700 border-orange-200" : ""}`}>{a.severity}</Badge>
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={async () => {
                      await supabase.from("patient_allergies" as any).update({ status: "inactive" } as any).eq("id", a.id);
                      fetchOverviewData();
                    }}>
                      <Trash2 className="h-3 w-3 text-muted-foreground" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* 5. Clinical Considerations */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <ClipboardList className="h-4 w-4 text-primary" />
              Clinical Considerations
              <Button variant="ghost" size="icon" className="h-5 w-5 ml-auto" onClick={() => setShowConsiderationForm(v => !v)}>
                <Plus className="h-3.5 w-3.5" />
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {showConsiderationForm && (
              <div className="space-y-2 mb-3 p-2 border rounded-md bg-muted/30">
                <Input placeholder="Title (e.g. Pacemaker)" value={newConsideration.title} onChange={e => setNewConsideration(p => ({ ...p, title: e.target.value }))} className="h-8 text-sm" />
                <Input placeholder="Description (optional)" value={newConsideration.description} onChange={e => setNewConsideration(p => ({ ...p, description: e.target.value }))} className="h-8 text-sm" />
                <Select value={newConsideration.category} onValueChange={v => setNewConsideration(p => ({ ...p, category: v }))}>
                  <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="implant">Implant/Device</SelectItem>
                    <SelectItem value="pregnancy">Pregnancy</SelectItem>
                    <SelectItem value="contraindication">Contraindication</SelectItem>
                    <SelectItem value="precaution">Precaution</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
                <div className="flex gap-2">
                  <Button size="sm" className="h-7 text-xs" disabled={!newConsideration.title.trim()} onClick={async () => {
                    if (!user) return;
                    const { error } = await supabase.from("patient_clinical_considerations" as any).insert({ patient_id: patient.id, created_by: user.id, title: newConsideration.title.trim(), description: newConsideration.description.trim() || null, category: newConsideration.category } as any);
                    if (error) { toast.error("Failed to add consideration"); return; }
                    toast.success("Consideration added");
                    setNewConsideration({ title: "", description: "", category: "other" });
                    setShowConsiderationForm(false);
                    fetchOverviewData();
                  }}>Add</Button>
                  <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setShowConsiderationForm(false)}>Cancel</Button>
                </div>
              </div>
            )}
            {considerations.length === 0 && !showConsiderationForm ? (
              <p className="text-sm text-muted-foreground italic">No clinical considerations recorded.</p>
            ) : (
              <div className="space-y-2">
                {considerations.map((c: any) => (
                  <div key={c.id} className="flex items-start justify-between p-2 rounded-md bg-muted/40">
                    <div>
                      <p className="text-sm font-medium">{c.title}</p>
                      <div className="flex gap-2 mt-0.5">
                        {c.description && <span className="text-xs text-muted-foreground">{c.description}</span>}
                        <Badge variant="outline" className="text-xs capitalize">{c.category}</Badge>
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={async () => {
                      await supabase.from("patient_clinical_considerations" as any).update({ is_active: false } as any).eq("id", c.id);
                      fetchOverviewData();
                    }}>
                      <Trash2 className="h-3 w-3 text-muted-foreground" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* 6. New Lab Results */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <FlaskConical className="h-4 w-4 text-primary" />
              Lab Results
            </CardTitle>
          </CardHeader>
          <CardContent>
            {sortedLabs.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">No lab results available.</p>
            ) : (
              <div className="space-y-3">
                {/* Recent labs - highlighted */}
                {recentLabs.length > 0 && (
                  <div className="space-y-2">
                    {recentLabs.length > 0 && olderLabs.length > 0 && (
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">New</p>
                    )}
                    {recentLabs.map((lab) => {
                      const flags: { label: string; level: "high" | "low" }[] = [];
                      if (lab.ldl_mmol_l && Number(lab.ldl_mmol_l) > 3.0) flags.push({ label: `LDL ${lab.ldl_mmol_l} ▲`, level: "high" });
                      if (lab.ldl_mmol_l && Number(lab.ldl_mmol_l) < 1.0) flags.push({ label: `LDL ${lab.ldl_mmol_l} ▼`, level: "low" });
                      if (lab.blood_pressure_systolic && Number(lab.blood_pressure_systolic) > 130) flags.push({ label: `BP ${lab.blood_pressure_systolic}/${lab.blood_pressure_diastolic} ▲`, level: "high" });
                      if (lab.hba1c_mmol_mol && Number(lab.hba1c_mmol_mol) > 42) flags.push({ label: `HbA1c ${lab.hba1c_mmol_mol} ▲`, level: "high" });
                      if (lab.egfr && Number(lab.egfr) < 60) flags.push({ label: `eGFR ${lab.egfr} ▼`, level: "low" });
                      if (lab.alat_u_l && Number(lab.alat_u_l) > 50) flags.push({ label: `ALAT ${lab.alat_u_l} ▲`, level: "high" });
                      if (lab.tsh_mu_l && (Number(lab.tsh_mu_l) < 0.4 || Number(lab.tsh_mu_l) > 4.0)) flags.push({ label: `TSH ${lab.tsh_mu_l} ${Number(lab.tsh_mu_l) > 4.0 ? "▲" : "▼"}`, level: Number(lab.tsh_mu_l) > 4.0 ? "high" : "low" });
                      const needsAttention = flags.length > 0;

                      return (
                        <button
                          key={lab.id}
                          onClick={() => onSelectSection("lab_results")}
                          className={`w-full text-left p-3 rounded-md border transition-colors ${needsAttention ? "border-destructive/30 bg-destructive/5 hover:bg-destructive/10" : "border-primary/20 bg-primary/5 hover:bg-primary/10"}`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-semibold">
                                {new Date(lab.result_date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                              </span>
                              {needsAttention && (
                                <Badge variant="outline" className="text-[10px] bg-destructive/10 text-destructive border-destructive/30">
                                  Needs attention
                                </Badge>
                              )}
                            </div>
                            <span className="text-xs text-muted-foreground capitalize">{lab.source}</span>
                          </div>
                          {flags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1.5">
                              {flags.map((f, i) => (
                                <Badge key={i} variant="outline" className={`text-xs ${f.level === "high" ? "bg-destructive/10 text-destructive border-destructive/30" : "bg-amber-500/10 text-amber-700 border-amber-200"}`}>
                                  {f.label}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Older labs - muted */}
                {olderLabs.length > 0 && (
                  <div className="space-y-1.5">
                    {recentLabs.length > 0 && (
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide pt-1">Previous</p>
                    )}
                    {olderLabs.slice(0, 5).map((lab) => (
                      <button
                        key={lab.id}
                        onClick={() => onSelectSection("lab_results")}
                        className="w-full text-left p-2 rounded-md bg-muted/30 hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">
                            {new Date(lab.result_date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                          </span>
                          <span className="text-xs text-muted-foreground/60 capitalize">{lab.source}</span>
                        </div>
                      </button>
                    ))}
                    {olderLabs.length > 5 && (
                      <p className="text-xs text-muted-foreground text-center">+{olderLabs.length - 5} more</p>
                    )}
                  </div>
                )}

                <Button variant="ghost" size="sm" className="w-full text-xs" onClick={() => onSelectSection("lab_results")}>
                  View all lab results →
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 5. Care Team */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              Care Team
            </CardTitle>
          </CardHeader>
          <CardContent>
            {sortedTeam.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">No care team members assigned.</p>
            ) : (
              <div className="space-y-2">
                {sortedTeam.map((member) => (
                  <div key={member.id} className="flex items-center gap-3 p-2 rounded-md bg-muted/40">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{member.member_name}</p>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-muted-foreground">{roleLabels[member.role] || member.role}</span>
                        {member.specialty && (
                          <span className="text-xs text-muted-foreground">· {member.specialty}</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Task Edit Dialog */}
      <Dialog open={!!editingTask} onOpenChange={(open) => !open && setEditingTask(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Task</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input value={editForm.title} onChange={(e) => setEditForm(f => ({ ...f, title: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea value={editForm.description} onChange={(e) => setEditForm(f => ({ ...f, description: e.target.value }))} rows={3} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={editForm.category} onValueChange={(v) => setEditForm(f => ({ ...f, category: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="clinical_review">Labs</SelectItem>
                    <SelectItem value="client_communication">Follow-up</SelectItem>
                    <SelectItem value="care_coordination">Referral</SelectItem>
                    <SelectItem value="documentation_reporting">Visit</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Priority</Label>
                <Select value={editForm.priority} onValueChange={(v) => setEditForm(f => ({ ...f, priority: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="urgent">Urgent</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={editForm.status} onValueChange={(v) => setEditForm(f => ({ ...f, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todo">To Do</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="done">Done</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Due Date</Label>
                <Input type="date" value={editForm.due_date} onChange={(e) => setEditForm(f => ({ ...f, due_date: e.target.value }))} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingTask(null)}>Cancel</Button>
            <Button onClick={handleSaveTask}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>

    {/* Expanded Medications Panel */}
    {showAllMedications && (
      <div className="w-1/2 shrink-0 overflow-auto border rounded-lg bg-card p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Pill className="h-5 w-5 text-primary" />
            All Medications
          </h3>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setShowMedForm(true); setShowAllMedications(true); }}>
              <Plus className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setShowAllMedications(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Edit medication dialog */}
        {editingMedId && (
          <div className="p-3 border rounded-md bg-muted/30 space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Edit Medication</p>
            <Input placeholder="Medication name *" value={editMedForm.medication_name} onChange={e => setEditMedForm(p => ({ ...p, medication_name: e.target.value }))} className="h-8 text-sm" />
            <div className="grid grid-cols-2 gap-2">
              <Input placeholder="Dose" value={editMedForm.dose} onChange={e => setEditMedForm(p => ({ ...p, dose: e.target.value }))} className="h-8 text-sm" />
              <Input placeholder="Frequency" value={editMedForm.frequency} onChange={e => setEditMedForm(p => ({ ...p, frequency: e.target.value }))} className="h-8 text-sm" />
            </div>
            <Input placeholder="Indication" value={editMedForm.indication} onChange={e => setEditMedForm(p => ({ ...p, indication: e.target.value }))} className="h-8 text-sm" />
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs text-muted-foreground">Start date</Label>
                <Input type="date" value={editMedForm.start_date} onChange={e => setEditMedForm(p => ({ ...p, start_date: e.target.value }))} className="h-8 text-sm" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">End date</Label>
                <Input type="date" value={editMedForm.end_date} onChange={e => setEditMedForm(p => ({ ...p, end_date: e.target.value }))} className="h-8 text-sm" />
              </div>
            </div>
            <Select value={editMedForm.status} onValueChange={v => setEditMedForm(p => ({ ...p, status: v }))}>
              <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="discontinued">Discontinued</SelectItem>
                <SelectItem value="on_hold">On Hold</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex gap-2">
              <Button size="sm" className="h-7 text-xs" disabled={!editMedForm.medication_name.trim()} onClick={handleSaveMed}>Save</Button>
              <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setEditingMedId(null)}>Cancel</Button>
            </div>

            {/* Change log for this medication */}
            {(() => {
              const logs = medLogs.filter((l: any) => l.medication_id === editingMedId);
              if (logs.length === 0) return null;
              return (
                <div className="mt-2 space-y-1.5">
                  <Separator />
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Change Log</p>
                  {logs.map((l: any) => (
                    <div key={l.id} className="p-2 rounded-md border bg-background text-xs space-y-0.5">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{new Date(l.change_date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</span>
                        <Badge variant="outline" className="text-[10px] capitalize">{l.change_type.replace("_", " ")}</Badge>
                      </div>
                      {(l.previous_dose || l.new_dose) && (
                        <p className="text-muted-foreground">
                          Dose: <span className="line-through">{l.previous_dose || "—"}</span> → <span className="font-medium text-foreground">{l.new_dose || "—"}</span>
                        </p>
                      )}
                      {(l.previous_frequency || l.new_frequency) && (
                        <p className="text-muted-foreground">
                          Freq: <span className="line-through">{l.previous_frequency || "—"}</span> → <span className="font-medium text-foreground">{l.new_frequency || "—"}</span>
                        </p>
                      )}
                      {l.notes && <p className="text-muted-foreground italic">{l.notes}</p>}
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
        )}

        {allMedications.filter(m => m.status === "active").length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Active</p>
            {allMedications.filter(m => m.status === "active").map((m) => (
              <div key={m.id} className={`p-3 rounded-md bg-muted/40 space-y-1 cursor-pointer hover:bg-muted/60 transition-colors ${editingMedId === m.id ? "ring-2 ring-primary" : ""}`} onClick={() => startEditMed(m)}>
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">{m.medication_name}</p>
                  <div className="flex items-center gap-2">
                    {m.dose && <span className="text-xs text-muted-foreground">{m.dose}</span>}
                    <Pencil className="h-3 w-3 text-muted-foreground" />
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {m.frequency && <span className="text-xs text-muted-foreground">{m.frequency}</span>}
                  {m.indication && <span className="text-xs text-muted-foreground">· {m.indication}</span>}
                </div>
                {m.start_date && (
                  <p className="text-xs text-muted-foreground">Started: {new Date(m.start_date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</p>
                )}
              </div>
            ))}
          </div>
        )}

        {allMedications.filter(m => m.status !== "active").length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Inactive / Discontinued</p>
            {allMedications.filter(m => m.status !== "active").map((m) => (
              <div key={m.id} className="p-3 rounded-md bg-muted/20 opacity-60 space-y-1 cursor-pointer hover:opacity-80 transition-opacity" onClick={() => startEditMed(m)}>
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">{m.medication_name}</p>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs capitalize">{m.status}</Badge>
                    <Pencil className="h-3 w-3 text-muted-foreground" />
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {m.dose && <span className="text-xs text-muted-foreground">{m.dose}</span>}
                  {m.frequency && <span className="text-xs text-muted-foreground">· {m.frequency}</span>}
                  {m.indication && <span className="text-xs text-muted-foreground">· {m.indication}</span>}
                </div>
                {(m.start_date || m.end_date) && (
                  <p className="text-xs text-muted-foreground">
                    {m.start_date && `Started: ${new Date(m.start_date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}`}
                    {m.start_date && m.end_date && " — "}
                    {m.end_date && `Ended: ${new Date(m.end_date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}`}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}

        {allMedications.length === 0 && (
          <p className="text-sm text-muted-foreground italic">No medications recorded.</p>
        )}
      </div>
    )}
    </div>
  );
}

const DUMMY_FAMILY_HISTORY = [
  {
    id: "fh1",
    relation: "Father",
    age: 72,
    alive: true,
    conditions: [
      { name: "Type 2 Diabetes", ageAtOnset: 55, notes: "Managed with metformin" },
      { name: "Hypertension", ageAtOnset: 48, notes: "On ACE inhibitor since diagnosis" },
      { name: "Coronary Artery Disease", ageAtOnset: 65, notes: "Stent placement at 66" },
    ],
  },
  {
    id: "fh2",
    relation: "Mother",
    age: 69,
    alive: true,
    conditions: [
      { name: "Breast Cancer", ageAtOnset: 58, notes: "Stage I, treated with lumpectomy + radiation. In remission." },
      { name: "Osteoporosis", ageAtOnset: 62, notes: "Vertebral compression fracture at 64" },
      { name: "Hypothyroidism", ageAtOnset: 45, notes: "Levothyroxine 75 mcg daily" },
    ],
  },
  {
    id: "fh3",
    relation: "Paternal Grandfather",
    age: null,
    alive: false,
    causeOfDeath: "Myocardial infarction at age 61",
    conditions: [
      { name: "Myocardial Infarction", ageAtOnset: 61, notes: "Fatal first event" },
      { name: "Hyperlipidemia", ageAtOnset: null, notes: "Diagnosed postmortem" },
    ],
  },
  {
    id: "fh4",
    relation: "Maternal Grandmother",
    age: null,
    alive: false,
    causeOfDeath: "Colorectal cancer at age 74",
    conditions: [
      { name: "Colorectal Cancer", ageAtOnset: 71, notes: "Stage III at diagnosis" },
      { name: "Type 2 Diabetes", ageAtOnset: 60, notes: "Insulin-dependent" },
    ],
  },
  {
    id: "fh5",
    relation: "Brother",
    age: 42,
    alive: true,
    conditions: [
      { name: "Asthma", ageAtOnset: 12, notes: "Moderate persistent, uses inhaled corticosteroids" },
      { name: "Anxiety Disorder", ageAtOnset: 30, notes: "GAD, managed with SSRI" },
    ],
  },
  {
    id: "fh6",
    relation: "Sister",
    age: 38,
    alive: true,
    conditions: [
      { name: "BRCA2 Mutation Carrier", ageAtOnset: null, notes: "Identified through genetic screening. Undergoing enhanced surveillance." },
      { name: "Polycystic Ovary Syndrome", ageAtOnset: 22, notes: "Managed with lifestyle modifications" },
    ],
  },
  {
    id: "fh7",
    relation: "Paternal Uncle",
    age: 68,
    alive: true,
    conditions: [
      { name: "Prostate Cancer", ageAtOnset: 63, notes: "Gleason 6, active surveillance" },
      { name: "Type 2 Diabetes", ageAtOnset: 50, notes: "On oral hypoglycemics" },
    ],
  },
];

const GENETIC_PREDISPOSITIONS = [
  { risk: "Cardiovascular Disease", level: "high" as const, basis: "Father (CAD, hypertension), paternal grandfather (MI at 61). Strong paternal lineage." },
  { risk: "Type 2 Diabetes", level: "high" as const, basis: "Father, maternal grandmother, paternal uncle. Multi-generational prevalence." },
  { risk: "Breast / Ovarian Cancer", level: "moderate" as const, basis: "Mother (breast cancer at 58), sister (BRCA2 carrier). Recommend genetic counseling." },
  { risk: "Colorectal Cancer", level: "moderate" as const, basis: "Maternal grandmother (colorectal cancer at 71). Consider early screening." },
  { risk: "Osteoporosis", level: "low" as const, basis: "Mother diagnosed at 62. Monitor bone density." },
  { risk: "Mental Health (Anxiety)", level: "low" as const, basis: "Brother with GAD. Single occurrence in family." },
];

function FamilyHistoryView() {
  const riskColor = (level: "high" | "moderate" | "low") => {
    switch (level) {
      case "high": return "bg-destructive/10 text-destructive border-destructive/20";
      case "moderate": return "bg-amber-500/10 text-amber-700 border-amber-500/20";
      case "low": return "bg-emerald-500/10 text-emerald-700 border-emerald-500/20";
    }
  };

  return (
    <div className="space-y-4">
      {/* Genetic Predispositions Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-primary" />
            Genetic Predispositions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {GENETIC_PREDISPOSITIONS.map((gp) => (
              <div key={gp.risk} className={`rounded-lg border p-3 ${riskColor(gp.level)}`}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-semibold">{gp.risk}</span>
                  <Badge variant="outline" className={`text-xs capitalize ${riskColor(gp.level)}`}>
                    {gp.level} risk
                  </Badge>
                </div>
                <p className="text-xs opacity-80">{gp.basis}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Family Members */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" />
            Family Medical History
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {DUMMY_FAMILY_HISTORY.map((member) => (
            <div key={member.id} className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{member.relation}</p>
                    <p className="text-xs text-muted-foreground">
                      {member.alive ? `Age ${member.age}` : `Deceased`}
                      {!member.alive && member.causeOfDeath ? ` — ${member.causeOfDeath}` : ""}
                    </p>
                  </div>
                </div>
                <Badge variant={member.alive ? "secondary" : "outline"} className="text-xs">
                  {member.alive ? "Living" : "Deceased"}
                </Badge>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="h-8 text-xs">Condition</TableHead>
                    <TableHead className="h-8 text-xs">Age at Onset</TableHead>
                    <TableHead className="h-8 text-xs">Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {member.conditions.map((c, i) => (
                    <TableRow key={i}>
                      <TableCell className="text-sm font-medium py-2">{c.name}</TableCell>
                      <TableCell className="text-sm py-2">{c.ageAtOnset ?? "Unknown"}</TableCell>
                      <TableCell className="text-sm text-muted-foreground py-2">{c.notes}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}


function PatientDetailsView({
  patient, onboarding, age, labResults, onLabResultsAdded, visitNotes, appointments,
}: {
  patient: Tables<"patients">;
  onboarding: Tables<"patient_onboarding"> | null;
  age: number | null | undefined;
  labResults: Tables<"patient_lab_results">[];
  onLabResultsAdded: () => void;
  visitNotes: Tables<"visit_notes">[];
  appointments: Tables<"appointments">[];
}) {
  return (
    <Tabs defaultValue="personal" className="space-y-4">
      <TabsList className="w-full">
       <TabsTrigger value="personal" className="flex-1">Personal Information</TabsTrigger>
        <TabsTrigger value="contact" className="flex-1">Contact Details</TabsTrigger>
        <TabsTrigger value="family" className="flex-1">Family History</TabsTrigger>
        <TabsTrigger value="visits" className="flex-1">Visit History</TabsTrigger>
      </TabsList>

      <TabsContent value="personal">
        <Card>
          <CardHeader><CardTitle className="text-lg">Personal Information</CardTitle></CardHeader>
          <CardContent>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
              <div><dt className="text-muted-foreground">Full Name</dt><dd className="font-medium">{patient.full_name}</dd></div>
              <div><dt className="text-muted-foreground">Gender</dt><dd>{patient.gender || "—"}</dd></div>
              <div><dt className="text-muted-foreground">Date of Birth</dt><dd>{patient.date_of_birth || "—"}</dd></div>
              <div><dt className="text-muted-foreground">Age</dt><dd>{age ?? "—"}</dd></div>
              <div><dt className="text-muted-foreground">Tier</dt><dd>{patient.tier ? (TIER_LABELS[patient.tier] || patient.tier) : "—"}</dd></div>
              <div><dt className="text-muted-foreground">Date Joined</dt><dd>{new Date(patient.created_at).toLocaleDateString()}</dd></div>
              <div><dt className="text-muted-foreground">Insurance</dt><dd>{patient.insurance_provider || "—"}</dd></div>
              <div><dt className="text-muted-foreground">Insurance #</dt><dd>{patient.insurance_number || "—"}</dd></div>
            </dl>
          </CardContent>
        </Card>

        {onboarding && (
          <Card className="mt-4">
            <CardHeader><CardTitle className="text-lg">Biometrics</CardTitle></CardHeader>
            <CardContent>
              <dl className="grid grid-cols-3 gap-x-6 gap-y-3 text-sm">
                <div><dt className="text-muted-foreground">Height</dt><dd>{onboarding.height_cm ? `${onboarding.height_cm} cm` : "—"}</dd></div>
                <div><dt className="text-muted-foreground">Weight</dt><dd>{onboarding.weight_kg ? `${onboarding.weight_kg} kg` : "—"}</dd></div>
                <div><dt className="text-muted-foreground">BMI</dt><dd>{onboarding.bmi ?? "—"}</dd></div>
                <div><dt className="text-muted-foreground">Waist</dt><dd>{onboarding.waist_circumference_cm ? `${onboarding.waist_circumference_cm} cm` : "—"}</dd></div>
                <div><dt className="text-muted-foreground">W/H Ratio</dt><dd>{onboarding.waist_to_hip_ratio ?? "—"}</dd></div>
              </dl>
            </CardContent>
          </Card>
        )}
      </TabsContent>

      <TabsContent value="contact">
        <Card>
          <CardHeader><CardTitle className="text-lg">Contact Details</CardTitle></CardHeader>
          <CardContent>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
              <div><dt className="text-muted-foreground">Email</dt><dd>{patient.email || "—"}</dd></div>
              <div><dt className="text-muted-foreground">Phone</dt><dd>{patient.phone || "—"}</dd></div>
              <div className="col-span-2"><dt className="text-muted-foreground">Address</dt><dd>{[patient.address, patient.post_code, patient.city, patient.country].filter(Boolean).join(", ") || "—"}</dd></div>
              <div><dt className="text-muted-foreground">Emergency Contact</dt><dd>{patient.emergency_contact_name ? `${patient.emergency_contact_name} (${patient.emergency_contact_phone || ""})` : "—"}</dd></div>
            </dl>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="family">
        <FamilyHistoryView />
      </TabsContent>

      <TabsContent value="visits">
        <Card>
          <CardHeader><CardTitle className="text-lg">Visit History</CardTitle></CardHeader>
          <CardContent>
            {visitNotes.length === 0 && appointments.length === 0 ? (
              <p className="text-sm text-muted-foreground">No visit history yet.</p>
            ) : (
              <div className="space-y-3">
                {appointments.map((appt) => (
                  <div key={appt.id} className="flex items-start justify-between border-b pb-3 last:border-0">
                    <div>
                      <p className="text-sm font-medium">{appt.title}</p>
                      <p className="text-xs text-muted-foreground capitalize">{appt.appointment_type.replace("_", " ")}</p>
                      {appt.notes && <p className="text-xs text-muted-foreground mt-1">{appt.notes}</p>}
                    </div>
                    <span className="text-xs text-muted-foreground whitespace-nowrap ml-4">
                      {new Date(appt.start_time).toLocaleDateString()}
                    </span>
                  </div>
                ))}
                {visitNotes.map((vn) => (
                  <div key={vn.id} className="flex items-start justify-between border-b pb-3 last:border-0">
                    <div>
                      <p className="text-sm font-medium">{vn.chief_complaint || "Visit Note"}</p>
                      {vn.notes && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{vn.notes}</p>}
                    </div>
                    <span className="text-xs text-muted-foreground whitespace-nowrap ml-4">
                      {new Date(vn.visit_date).toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="mt-4">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Lab Results</CardTitle>
              <AddLabResultsDialog patientId={patient.id} onSaved={onLabResultsAdded} />
            </div>
          </CardHeader>
          <CardContent>
            {labResults.length > 0 ? (
              <dl className="grid grid-cols-3 gap-x-6 gap-y-3 text-sm">
                <div><dt className="text-muted-foreground">Date</dt><dd>{labResults[0].result_date}</dd></div>
                <div><dt className="text-muted-foreground">LDL</dt><dd>{labResults[0].ldl_mmol_l ? `${labResults[0].ldl_mmol_l} mmol/L` : "—"}</dd></div>
                <div><dt className="text-muted-foreground">HbA1c</dt><dd>{labResults[0].hba1c_mmol_mol ? `${labResults[0].hba1c_mmol_mol} mmol/mol` : "—"}</dd></div>
                <div><dt className="text-muted-foreground">BP</dt><dd>{labResults[0].blood_pressure_systolic ? `${labResults[0].blood_pressure_systolic}/${labResults[0].blood_pressure_diastolic}` : "—"}</dd></div>
                <div><dt className="text-muted-foreground">eGFR</dt><dd>{labResults[0].egfr ?? "—"}</dd></div>
                <div><dt className="text-muted-foreground">TSH</dt><dd>{labResults[0].tsh_mu_l ? `${labResults[0].tsh_mu_l} mU/L` : "—"}</dd></div>
              </dl>
            ) : (
              <p className="text-sm text-muted-foreground">No lab results yet.</p>
            )}
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
function HealthDimensionView({
  dimensionKey, patient, onboarding, labResults, healthCategories, markerNotes, setMarkerNotes, onNavigateDimension, onDataChanged,
}: {
  dimensionKey: string;
  patient: Tables<"patients">;
  onboarding: Tables<"patient_onboarding"> | null;
  labResults: Tables<"patient_lab_results">[];
  healthCategories: Tables<"patient_health_categories">[];
  markerNotes: Record<string, string>;
  setMarkerNotes: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  onNavigateDimension: (section: string) => void;
  onDataChanged?: () => void;
}) {
  const dim = findDimension(dimensionKey);
  if (!dim) return null;
  const Icon = dim.icon;
  const lab = labResults[0] || null;

  if (dimensionKey === "cardiovascular") {
    return (
      <CardiovascularDimensionView
        patient={patient}
        onboarding={onboarding}
        labResults={labResults}
        healthCategories={healthCategories}
        markerNotes={markerNotes}
        setMarkerNotes={setMarkerNotes}
        onNavigateDimension={onNavigateDimension}
        onDataChanged={onDataChanged}
      />
    );
  }

  if (dimensionKey === "metabolic" || dimensionKey === "endocrine" || dimensionKey === "kidneys" || dimensionKey === "body_composition" || dimensionKey === "nutrition" || dimensionKey === "metabolism") {
    return (
      <MetabolicDimensionView
        patient={patient}
        onboarding={onboarding}
        labResults={labResults}
        healthCategories={healthCategories}
        markerNotes={markerNotes}
        setMarkerNotes={setMarkerNotes}
        onNavigateDimension={onNavigateDimension}
        onDataChanged={onDataChanged}
      />
    );
  }

  if (dimensionKey === "skin_mucous" || dimensionKey === "skin" || dimensionKey === "skin_oral_mucosal") {
    return (
      <SkinMucousDimensionView
        patient={patient}
        onboarding={onboarding}
        labResults={labResults}
        healthCategories={healthCategories}
        onDataChanged={onDataChanged}
        onNavigateDimension={onNavigateDimension}
      />
    );
  }

  const renderContent = () => {
    switch (dimensionKey) {
      case "senses":
      case "sensory_organs":
        return (
          <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
            <div><dt className="text-muted-foreground">Vision Acuity</dt><dd>{onboarding?.vision_acuity ?? "—"}</dd></div>
            <div><dt className="text-muted-foreground">Smell Issues</dt><dd>{onboarding?.symptom_smell ? "Yes" : "No"}</dd></div>
            <div><dt className="text-muted-foreground">Vision Issues</dt><dd>{onboarding?.symptom_vision ? "Yes" : "No"}</dd></div>
            <div><dt className="text-muted-foreground">Hearing Issues</dt><dd>{onboarding?.symptom_hearing ? "Yes" : "No"}</dd></div>
            <div><dt className="text-muted-foreground">Illness (Senses)</dt><dd>{onboarding?.illness_senses ? "Yes" : "No"}</dd></div>
            {onboarding?.illness_senses_notes && <div className="col-span-2"><dt className="text-muted-foreground">Notes</dt><dd>{onboarding.illness_senses_notes}</dd></div>}
          </dl>
        );
      case "nervous_system":
      case "brain_mental":
        return (
          <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
            <div><dt className="text-muted-foreground">Neurological Illness</dt><dd>{onboarding?.illness_neurological ? "Yes" : "No"}</dd></div>
            <div><dt className="text-muted-foreground">Neurological Symptoms</dt><dd>{onboarding?.symptom_neurological ? "Yes" : "No"}</dd></div>
            <div><dt className="text-muted-foreground">Balance Issues</dt><dd>{onboarding?.symptom_balance ? "Yes" : "No"}</dd></div>
            <div><dt className="text-muted-foreground">Genetic (Nervous System)</dt><dd>{onboarding?.genetic_nervous_system ? "Yes" : "No"}</dd></div>
            <div><dt className="text-muted-foreground">Previous Brain Damage</dt><dd>{onboarding?.prev_brain_damage ? "Yes" : "No"}</dd></div>
            {onboarding?.prev_brain_damage_notes && <div className="col-span-2"><dt className="text-muted-foreground">Notes</dt><dd>{onboarding.prev_brain_damage_notes}</dd></div>}
            <div><dt className="text-muted-foreground">APOE ε4</dt><dd>{lab?.apoe_e4 === true ? "Positive" : lab?.apoe_e4 === false ? "Negative" : "—"}</dd></div>
          </dl>
        );
      case "physical_performance":
      case "exercise_functional":
        return (
          <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
            <div><dt className="text-muted-foreground">Exercise (MET hrs/week)</dt><dd>{onboarding?.exercise_met_hours ?? "—"}</dd></div>
            <div><dt className="text-muted-foreground">Mobility Restriction</dt><dd>{onboarding?.symptom_mobility_restriction ? "Yes" : "No"}</dd></div>
          </dl>
        );
      case "respiratory":
      case "respiratory_immune":
        return (
          <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
            <div><dt className="text-muted-foreground">Respiratory Symptoms</dt><dd>{onboarding?.symptom_respiratory ? "Yes" : "No"}</dd></div>
            <div><dt className="text-muted-foreground">Sleep Apnoea</dt><dd>{onboarding?.symptom_sleep_apnoea ? "Yes" : "No"}</dd></div>
            <div><dt className="text-muted-foreground">Smoking</dt><dd>{onboarding?.smoking ?? "—"}</dd></div>
          </dl>
        );
      case "hormones":
      case "endocrine":
        return (
          <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
            <div><dt className="text-muted-foreground">Hormone Illness</dt><dd>{onboarding?.illness_hormone ? "Yes" : "No"}</dd></div>
            <div><dt className="text-muted-foreground">Menstruation/Menopause Issues</dt><dd>{onboarding?.symptom_menstruation_menopause ? "Yes" : "No"}</dd></div>
            <div><dt className="text-muted-foreground">TSH</dt><dd>{lab?.tsh_mu_l ? `${lab.tsh_mu_l} mU/L` : "—"}</dd></div>
            <div><dt className="text-muted-foreground">Testosterone/Estrogen Abnormal</dt><dd>{lab?.testosterone_estrogen_abnormal === true ? "Yes" : lab?.testosterone_estrogen_abnormal === false ? "No" : "—"}</dd></div>
          </dl>
        );
      case "mucous_membranes":
        return (
          <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
            <div><dt className="text-muted-foreground">Skin Condition</dt><dd>{onboarding?.skin_condition ?? "—"}</dd></div>
            <div><dt className="text-muted-foreground">Skin Rash</dt><dd>{onboarding?.symptom_skin_rash ? "Yes" : "No"}</dd></div>
            <div><dt className="text-muted-foreground">Mucous Membrane Issues</dt><dd>{onboarding?.symptom_mucous_membranes ? "Yes" : "No"}</dd></div>
            <div><dt className="text-muted-foreground">Sun Exposure</dt><dd>{onboarding?.sun_exposure ? "Yes" : "No"}</dd></div>
          </dl>
        );
      case "immunity":
      case "immune_defence":
      case "allergies":
        return (
          <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
            <div><dt className="text-muted-foreground">Immune Illness</dt><dd>{onboarding?.illness_immune ? "Yes" : "No"}</dd></div>
            <div><dt className="text-muted-foreground">Immune/Allergy Symptoms</dt><dd>{onboarding?.symptom_immune_allergies ? "Yes" : "No"}</dd></div>
            <div><dt className="text-muted-foreground">Infections/Year</dt><dd>{onboarding?.infections_per_year ?? "—"}</dd></div>
          </dl>
        );
      case "nutrition":
        return (
          <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
            <div><dt className="text-muted-foreground">BMI</dt><dd>{onboarding?.bmi ?? "—"}</dd></div>
            <div><dt className="text-muted-foreground">Fruits & Veg (g/day)</dt><dd>{onboarding?.fruits_vegetables_g_per_day ?? "—"}</dd></div>
            <div><dt className="text-muted-foreground">Fish (g/day)</dt><dd>{onboarding?.fish_g_per_day ?? "—"}</dd></div>
            <div><dt className="text-muted-foreground">Fiber (g/day)</dt><dd>{onboarding?.fiber_g_per_day ?? "—"}</dd></div>
            <div><dt className="text-muted-foreground">Red Meat (g/day)</dt><dd>{onboarding?.red_meat_g_per_day ?? "—"}</dd></div>
            <div><dt className="text-muted-foreground">Sugar (g/day)</dt><dd>{onboarding?.sugar_g_per_day ?? "—"}</dd></div>
            <div><dt className="text-muted-foreground">Sodium (g/day)</dt><dd>{onboarding?.sodium_g_per_day ?? "—"}</dd></div>
            <div><dt className="text-muted-foreground">GI Symptoms</dt><dd>{onboarding?.symptom_gastrointestinal ? "Yes" : "No"}</dd></div>
          </dl>
        );
      case "liver":
      case "digestion":
      case "gastrointestinal":
      case "pancreas":
        return (
          <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
            <div><dt className="text-muted-foreground">Liver Illness</dt><dd>{onboarding?.illness_liver ? "Yes" : "No"}</dd></div>
            <div><dt className="text-muted-foreground">ALAT</dt><dd>{lab?.alat_u_l ? `${lab.alat_u_l} U/L` : "—"}</dd></div>
            <div><dt className="text-muted-foreground">AFOS/ALP</dt><dd>{lab?.afos_alp_u_l ? `${lab.afos_alp_u_l} U/L` : "—"}</dd></div>
            <div><dt className="text-muted-foreground">GT</dt><dd>{lab?.gt_u_l ? `${lab.gt_u_l} U/L` : "—"}</dd></div>
            <div><dt className="text-muted-foreground">ALAT/ASAT Ratio</dt><dd>{lab?.alat_asat_ratio ?? "—"}</dd></div>
          </dl>
        );
      case "mental_health":
      case "mental_wellbeing":
        return (
          <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
            <div><dt className="text-muted-foreground">Mental Health Illness</dt><dd>{onboarding?.illness_mental_health ? "Yes" : "No"}</dd></div>
            {onboarding?.illness_mental_health_notes && <div className="col-span-2"><dt className="text-muted-foreground">Notes</dt><dd>{onboarding.illness_mental_health_notes}</dd></div>}
            <div><dt className="text-muted-foreground">GAD-7</dt><dd>{onboarding?.gad7_score ?? "—"}</dd></div>
            <div><dt className="text-muted-foreground">Stress (perceived)</dt><dd>{onboarding?.stress_perceived ?? "—"}</dd></div>
            <div><dt className="text-muted-foreground">Job Strain</dt><dd>{onboarding?.job_strain_perceived ?? "—"}</dd></div>
            <div><dt className="text-muted-foreground">Social Support</dt><dd>{onboarding?.social_support_perceived ?? "—"}</dd></div>
          </dl>
        );
      case "kidney":
        return (
          <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
            <div><dt className="text-muted-foreground">Kidney Illness</dt><dd>{onboarding?.illness_kidney ? "Yes" : "No"}</dd></div>
            {onboarding?.illness_kidney_notes && <div className="col-span-2"><dt className="text-muted-foreground">Notes</dt><dd>{onboarding.illness_kidney_notes}</dd></div>}
            <div><dt className="text-muted-foreground">Kidney Symptoms</dt><dd>{onboarding?.symptom_kidney_function ? "Yes" : "No"}</dd></div>
            <div><dt className="text-muted-foreground">eGFR</dt><dd>{lab?.egfr ?? "—"}</dd></div>
            <div><dt className="text-muted-foreground">Cystatin C</dt><dd>{lab?.cystatin_c ?? "—"}</dd></div>
            <div><dt className="text-muted-foreground">U-Alb/Krea Abnormal</dt><dd>{lab?.u_alb_krea_abnormal === true ? "Yes" : lab?.u_alb_krea_abnormal === false ? "No" : "—"}</dd></div>
          </dl>
        );
      case "substances":
      case "substance_use":
        return (
          <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
            <div><dt className="text-muted-foreground">Alcohol (units/week)</dt><dd>{onboarding?.alcohol_units_per_week ?? "—"}</dd></div>
            <div><dt className="text-muted-foreground">Smoking</dt><dd>{onboarding?.smoking ?? "—"}</dd></div>
            <div><dt className="text-muted-foreground">Other Substances</dt><dd>{onboarding?.other_substances ? "Yes" : "No"}</dd></div>
            {onboarding?.other_substances_notes && <div className="col-span-2"><dt className="text-muted-foreground">Notes</dt><dd>{onboarding.other_substances_notes}</dd></div>}
            <div><dt className="text-muted-foreground">Substance Use (perceived)</dt><dd>{onboarding?.substance_use_perceived ?? "—"}</dd></div>
          </dl>
        );
      case "cancer_risk":
      case "gynaecological_cancer":
      case "prostate_other_cancer":
      case "precancerous":
        return (
          <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
            <div><dt className="text-muted-foreground">Cancer Illness</dt><dd>{onboarding?.illness_cancer ? "Yes" : "No"}</dd></div>
            {onboarding?.illness_cancer_notes && <div className="col-span-2"><dt className="text-muted-foreground">Notes</dt><dd>{onboarding.illness_cancer_notes}</dd></div>}
            <div><dt className="text-muted-foreground">Previous Cancer</dt><dd>{onboarding?.prev_cancer ? "Yes" : "No"}</dd></div>
            <div><dt className="text-muted-foreground">Precancerous</dt><dd>{onboarding?.prev_precancerous ? "Yes" : "No"}</dd></div>
            <div><dt className="text-muted-foreground">Genetic (Cancer)</dt><dd>{onboarding?.genetic_cancer ? "Yes" : "No"}</dd></div>
            <div><dt className="text-muted-foreground">Genetic (Melanoma)</dt><dd>{onboarding?.genetic_melanoma ? "Yes" : "No"}</dd></div>
            <div><dt className="text-muted-foreground">Breast Screening</dt><dd>{onboarding?.cancer_screening_breast === true ? "Yes" : onboarding?.cancer_screening_breast === false ? "No" : "—"}</dd></div>
            <div><dt className="text-muted-foreground">Cervical Screening</dt><dd>{onboarding?.cancer_screening_cervical === true ? "Yes" : onboarding?.cancer_screening_cervical === false ? "No" : "—"}</dd></div>
            <div><dt className="text-muted-foreground">Colorectal Screening</dt><dd>{onboarding?.cancer_screening_colorectal === true ? "Yes" : onboarding?.cancer_screening_colorectal === false ? "No" : "—"}</dd></div>
          </dl>
        );
      case "musculoskeletal":
        return (
          <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
            <div><dt className="text-muted-foreground">Musculoskeletal Illness</dt><dd>{onboarding?.illness_musculoskeletal ? "Yes" : "No"}</dd></div>
            {onboarding?.illness_musculoskeletal_notes && <div className="col-span-2"><dt className="text-muted-foreground">Notes</dt><dd>{onboarding.illness_musculoskeletal_notes}</dd></div>}
            <div><dt className="text-muted-foreground">Joint Pain</dt><dd>{onboarding?.symptom_joint_pain ? "Yes" : "No"}</dd></div>
            <div><dt className="text-muted-foreground">Mobility Restriction</dt><dd>{onboarding?.symptom_mobility_restriction ? "Yes" : "No"}</dd></div>
            <div><dt className="text-muted-foreground">Prev. Osteoporotic Fracture</dt><dd>{onboarding?.prev_osteoporotic_fracture ? "Yes" : "No"}</dd></div>
          </dl>
        );
      case "sleep":
      case "sleep_recovery":
        return (
          <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
            <div><dt className="text-muted-foreground">Sleep Quality (1-10)</dt><dd>{onboarding?.sleep_quality ?? "—"}</dd></div>
            <div><dt className="text-muted-foreground">Hours/Night</dt><dd>{onboarding?.sleep_hours_per_night ?? "—"}</dd></div>
            <div><dt className="text-muted-foreground">Deep Sleep %</dt><dd>{onboarding?.deep_sleep_percent ?? "—"}</dd></div>
            <div><dt className="text-muted-foreground">Insomnia</dt><dd>{onboarding?.insomnia ? "Yes" : "No"}</dd></div>
            <div><dt className="text-muted-foreground">Sleep Apnoea</dt><dd>{onboarding?.symptom_sleep_apnoea ? "Yes" : "No"}</dd></div>
          </dl>
        );
      default:
        return <p className="text-sm text-muted-foreground">No structured risk factors recorded for this dimension yet.</p>;
    }
  };

  return (
    <GenericDimensionView
      dim={dim}
      dimensionKey={dimensionKey}
      patient={patient}
      onboarding={onboarding}
      labResults={labResults}
      healthCategories={healthCategories}
      onNavigateDimension={onNavigateDimension}
      onDataChanged={onDataChanged}
      renderRiskPicture={renderContent}
    />
  );
}

function GenericDimensionView({
  dim, dimensionKey, patient, onboarding, labResults, healthCategories,
  onNavigateDimension, onDataChanged, renderRiskPicture,
}: {
  dim: { label: string; icon: React.ComponentType<{ className?: string }> };
  dimensionKey: string;
  patient: Tables<"patients">;
  onboarding: Tables<"patient_onboarding"> | null;
  labResults: Tables<"patient_lab_results">[];
  healthCategories: Tables<"patient_health_categories">[];
  onNavigateDimension: (section: string) => void;
  onDataChanged?: () => void;
  renderRiskPicture: () => React.ReactNode;
}) {
  const Icon = dim.icon;

  // ─── Score from main dimension (1–10) ───
  const radarData = useMemo(
    () => computeRadarData(onboarding, labResults, healthCategories),
    [onboarding, labResults, healthCategories],
  );
  const mainDim = findMainDimension(dimensionKey) ?? null;
  const score = mainDim ? (radarData.find((d) => d.key === mainDim.key)?.score ?? 1) : 1;
  const scoreColor = score <= 3 ? "text-green-600" : score <= 6 ? "text-amber-600" : "text-destructive";
  const scoreBg = score <= 3 ? "bg-green-100" : score <= 6 ? "bg-amber-100" : "bg-red-100";

  const [showRiskHistory, setShowRiskHistory] = useState(false);

  // ─── Doctor's Summary & Recommendations ───
  const categoryKey = (mainDim?.label || dim.label).toLowerCase();
  const storedCategory = healthCategories.find((c) => c.category.toLowerCase() === categoryKey);
  const [summary, setSummary] = useState(storedCategory?.summary || "");
  const [recommendations, setRecommendations] = useState((storedCategory as any)?.recommendations || "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setSummary(storedCategory?.summary || "");
    setRecommendations((storedCategory as any)?.recommendations || "");
  }, [storedCategory?.id]);

  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("patient_health_categories")
      .upsert({
        patient_id: patient.id,
        category: categoryKey,
        summary,
        recommendations,
        status: storedCategory?.status || "normal",
        updated_by: (await supabase.auth.getUser()).data.user?.id || "",
      } as any, { onConflict: "patient_id,category" });
    setSaving(false);
    if (error) toast.error("Failed to save");
    else { toast.success("Saved successfully"); onDataChanged?.(); }
  };

  return (
    <div className="space-y-4">
      {/* 1. HEADER */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-md bg-primary/10 flex items-center justify-center">
                <Icon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg">{dim.label}</CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Risk Index scale: 1 = no action needed → 10 = immediate action
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${scoreBg}`}>
                <span className="text-xs font-medium text-muted-foreground">Risk Index</span>
                <span className={`text-lg font-bold ${scoreColor}`}>{score}/10</span>
              </div>
              <Button
                variant={showRiskHistory ? "default" : "outline"}
                size="sm"
                className="gap-1.5 text-xs"
                onClick={() => setShowRiskHistory(!showRiskHistory)}
              >
                <Activity className="h-3.5 w-3.5" />
                {showRiskHistory ? "Hide History" : "Show History"}
              </Button>
            </div>
          </div>
        </CardHeader>
        {showRiskHistory && (
          <CardContent className="pt-0">
            <p className="text-sm text-muted-foreground text-center py-6">
              Historical trend for this dimension will appear here once enough data points are available.
            </p>
          </CardContent>
        )}
      </Card>

      {/* 2. RISK PICTURE */}
      <section className="space-y-2">
        <div className="flex items-baseline justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Risk Picture</h2>
          <p className="text-xs text-muted-foreground">What is driving the current risk index</p>
        </div>
        <Card>
          <CardContent className="pt-6">{renderRiskPicture()}</CardContent>
        </Card>
      </section>

      {/* 3. MEDICATIONS */}
      <section className="space-y-2">
        <div className="flex items-baseline justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Medications</h2>
          <p className="text-xs text-muted-foreground">What is being done about the risk</p>
        </div>
        <DimensionMedicationsSection
          dimensionKey={dimensionKey}
          dimensionLabel={dim.label}
          onNavigateToMedications={() => onNavigateDimension("medications")}
        />
      </section>

      {/* 4. CLINICAL SYNTHESIS */}
      <section className="space-y-2">
        <div className="flex items-baseline justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Clinical Synthesis</h2>
          <p className="text-xs text-muted-foreground">Doctor's interpretation and plan</p>
        </div>
        <Card>
          <CardContent className="pt-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor={`summary-${dimensionKey}`} className="text-sm font-medium">Doctor's Summary</Label>
                <Textarea
                  id={`summary-${dimensionKey}`}
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                  placeholder="Synthesize the risk picture above…"
                  className="min-h-[140px] text-sm"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`recs-${dimensionKey}`} className="text-sm font-medium">Recommendations</Label>
                <Textarea
                  id={`recs-${dimensionKey}`}
                  value={recommendations}
                  onChange={(e) => setRecommendations(e.target.value)}
                  placeholder="Next steps, lifestyle, follow-up…"
                  className="min-h-[140px] text-sm"
                />
              </div>
            </div>
            <div className="flex justify-end">
              <Button size="sm" onClick={handleSave} disabled={saving} className="gap-1.5">
                <Save className="h-3.5 w-3.5" />
                {saving ? "Saving…" : "Save"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

function SkinMucousDimensionView({
  patient, onboarding, labResults, healthCategories, onDataChanged, onNavigateDimension,
}: {
  patient: Tables<"patients">;
  onboarding: Tables<"patient_onboarding"> | null;
  labResults: Tables<"patient_lab_results">[];
  healthCategories: Tables<"patient_health_categories">[];
  onDataChanged?: () => void;
  onNavigateDimension?: (section: string) => void;
}) {
  const radarData = computeRadarData(onboarding, labResults, healthCategories);
  const skinScore = radarData.find((d) => d.category === "Skin & Mucous")?.score ?? 1;

  const [showRiskHistory, setShowRiskHistory] = useState(false);
  const [subTab, setSubTab] = useState<"risk_factors" | "skin_map" | "total_risk">("risk_factors");

  const skinCategory = healthCategories.find((c) => c.category.toLowerCase() === "skin & mucous" || c.category.toLowerCase() === "skin_mucous");
  const [summary, setSummary] = useState(skinCategory?.summary || "");
  const [recommendations, setRecommendations] = useState(skinCategory?.recommendations || "");
  const [saving, setSaving] = useState(false);

  // Skin markers stored in health category recommendations as JSON when prefixed with __SKIN_MARKERS__
  type SkinMarker = { x: number; y: number; label: string; notes: string; side: "front" | "back" };
  const [skinMarkers, setSkinMarkers] = useState<SkinMarker[]>(() => {
    try {
      const raw = skinCategory?.summary || "";
      const markerMatch = raw.match(/__SKIN_MARKERS__(.+)__END_MARKERS__/s);
      if (markerMatch) return JSON.parse(markerMatch[1]);
    } catch {}
    return [];
  });
  const [skinView, setSkinView] = useState<"front" | "back">("front");

  // Extract clean summary (without marker data)
  const cleanSummary = useMemo(() => {
    return summary.replace(/__SKIN_MARKERS__.*__END_MARKERS__/s, "").trim();
  }, [summary]);
  const [editSummary, setEditSummary] = useState(cleanSummary);

  const scoreColor = skinScore <= 3 ? "text-green-600" : skinScore <= 6 ? "text-amber-600" : "text-destructive";
  const scoreBg = skinScore <= 3 ? "bg-green-100" : skinScore <= 6 ? "bg-amber-100" : "bg-red-100";

  const riskHistory = useMemo(() => {
    // Simple history based on score
    const dummyHistory = [
      { date: "2023-06-15", score: 2 },
      { date: "2023-12-10", score: 3 },
      { date: "2024-06-20", score: 2 },
      { date: "2024-12-05", score: skinScore },
    ];
    return dummyHistory;
  }, [skinScore]);

  const riskFactors = [
    { label: "Skin Condition (1-10)", value: onboarding?.skin_condition != null ? String(onboarding.skin_condition) : "—" },
    { label: "Skin Rash", value: onboarding?.symptom_skin_rash ? "Yes" : "No" },
    { label: "Mucous Membrane Issues", value: onboarding?.symptom_mucous_membranes ? "Yes" : "No" },
    { label: "Sun Exposure", value: onboarding?.sun_exposure ? "Yes" : "No" },
    { label: "Genetic Melanoma Risk", value: onboarding?.genetic_melanoma ? "Yes" : "No" },
  ];

  const onboardingDate = onboarding?.created_at ? new Date(onboarding.created_at).toLocaleDateString() : "—";

  const handleSave = async () => {
    setSaving(true);
    const markersJson = skinMarkers.length > 0 ? `\n__SKIN_MARKERS__${JSON.stringify(skinMarkers)}__END_MARKERS__` : "";
    const { error } = await supabase
      .from("patient_health_categories")
      .upsert({
        patient_id: patient.id,
        category: "skin_mucous",
        summary: editSummary + markersJson,
        recommendations,
        status: skinCategory?.status || "normal",
        updated_by: (await supabase.auth.getUser()).data.user?.id || "",
      } as any, { onConflict: "patient_id,category" });
    setSaving(false);
    if (error) {
      toast.error("Failed to save");
    } else {
      toast.success("Saved successfully");
      onDataChanged?.();
    }
  };

  const visibleMarkers = skinMarkers.filter((m) => m.side === skinView);

  const handleBodyClick = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 200;
    const y = ((e.clientY - rect.top) / rect.height) * 500;
    setSkinMarkers((prev) => [
      ...prev,
      { x, y, label: `#${prev.length + 1}`, notes: "", side: skinView },
    ]);
  };

  const removeMarker = (idx: number) => {
    setSkinMarkers((prev) => prev.filter((_, i) => i !== idx));
  };

  // SVG body outline
  const BodySvg = ({ side }: { side: "front" | "back" }) => (
    <svg
      viewBox="0 0 200 500"
      className="w-full h-full cursor-crosshair"
      onClick={handleBodyClick}
      style={{ maxHeight: 440 }}
    >
      {/* Head */}
      <ellipse cx="100" cy="45" rx="28" ry="35" fill="none" stroke="hsl(var(--border))" strokeWidth="1.5" />
      {/* Neck */}
      <rect x="90" y="78" width="20" height="20" fill="none" stroke="hsl(var(--border))" strokeWidth="1.5" rx="4" />
      {/* Torso */}
      <path d={side === "front"
        ? "M60,98 Q55,130 55,180 Q55,230 65,260 L135,260 Q145,230 145,180 Q145,130 140,98 Z"
        : "M60,98 Q55,130 55,180 Q55,230 65,260 L135,260 Q145,230 145,180 Q145,130 140,98 Z"
      } fill="none" stroke="hsl(var(--border))" strokeWidth="1.5" />
      {/* Left arm */}
      <path d="M60,100 Q30,120 22,180 Q18,210 20,250 Q18,270 25,280" fill="none" stroke="hsl(var(--border))" strokeWidth="1.5" />
      {/* Right arm */}
      <path d="M140,100 Q170,120 178,180 Q182,210 180,250 Q182,270 175,280" fill="none" stroke="hsl(var(--border))" strokeWidth="1.5" />
      {/* Left leg */}
      <path d="M75,260 Q70,320 68,380 Q66,420 65,460 Q62,475 60,490" fill="none" stroke="hsl(var(--border))" strokeWidth="1.5" />
      {/* Right leg */}
      <path d="M125,260 Q130,320 132,380 Q134,420 135,460 Q138,475 140,490" fill="none" stroke="hsl(var(--border))" strokeWidth="1.5" />
      {/* Center line for back view */}
      {side === "back" && (
        <line x1="100" y1="98" x2="100" y2="260" stroke="hsl(var(--border))" strokeWidth="0.5" strokeDasharray="4 4" />
      )}
      {/* Markers */}
      {visibleMarkers.map((m, i) => {
        const globalIdx = skinMarkers.indexOf(m);
        return (
          <g key={globalIdx}>
            <circle
              cx={m.x} cy={m.y} r="10"
              fill="hsl(var(--destructive))" fillOpacity="0.2"
              stroke="hsl(var(--destructive))" strokeWidth="1.5"
              className="cursor-pointer"
              onClick={(e) => { e.stopPropagation(); removeMarker(globalIdx); }}
            />
            <text
              x={m.x} y={m.y + 4}
              textAnchor="middle" fontSize="9" fontWeight="bold"
              fill="hsl(var(--destructive))"
              className="pointer-events-none select-none"
            >
              {globalIdx + 1}
            </text>
          </g>
        );
      })}
      {/* Label */}
      <text x="100" y="16" textAnchor="middle" fontSize="11" fill="hsl(var(--muted-foreground))" fontWeight="500">
        {side === "front" ? "Front" : "Back"}
      </text>
    </svg>
  );

  return (
    <div className="space-y-4">
      {/* Header with index */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Droplets className="h-5 w-5 text-primary" />
              Skin & Mucous Membranes
            </CardTitle>
            <div className="flex items-center gap-2">
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${scoreBg}`}>
                <span className="text-xs font-medium text-muted-foreground">Risk Index</span>
                <span className={`text-lg font-bold ${scoreColor}`}>{skinScore}/10</span>
              </div>
              <Button
                variant={showRiskHistory ? "default" : "outline"}
                size="sm"
                className="gap-1.5 text-xs"
                onClick={() => setShowRiskHistory(!showRiskHistory)}
              >
                <Activity className="h-3.5 w-3.5" />
                {showRiskHistory ? "Hide History" : "Show History"}
              </Button>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">1 = no action needed → 10 = immediate action</p>
        </CardHeader>

        {showRiskHistory && (
          <CardContent className="pt-0">
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={riskHistory}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                  <YAxis domain={[0, 10]} ticks={[0, 2, 4, 6, 8, 10]} tick={{ fontSize: 10 }} />
                  <Tooltip formatter={(value: number) => [`${value}/10`, "Risk Index"]} />
                  <ReferenceArea y1={0} y2={3} fill="hsl(142 76% 36%)" fillOpacity={0.08} />
                  <ReferenceArea y1={3} y2={6} fill="hsl(48 96% 53%)" fillOpacity={0.08} />
                  <ReferenceArea y1={6} y2={10} fill="hsl(0 84% 60%)" fillOpacity={0.08} />
                  <Line type="monotone" dataKey="score" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 5, fill: "hsl(var(--primary))", stroke: "hsl(var(--background))", strokeWidth: 2 }} activeDot={{ r: 7 }} name="Risk Index" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Main layout */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Left column - summary & recommendations */}
        <div className="flex flex-col gap-4">
          <Card className="flex-1">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Doctor's Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="Write a clinical summary for skin & mucous membranes..."
                value={editSummary}
                onChange={(e) => setEditSummary(e.target.value)}
                className="min-h-[120px] resize-none"
              />
            </CardContent>
          </Card>

          <Card className="flex-1">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Recommendations</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="Write recommendations for skin care..."
                value={recommendations}
                onChange={(e) => setRecommendations(e.target.value)}
                className="min-h-[120px] resize-none"
              />
            </CardContent>
          </Card>

          <DimensionMedicationsSection
            dimensionKey="skin_mucous"
            dimensionLabel="Skin & Mucous Health"
            onNavigateToMedications={() => onNavigateDimension?.("medications")}
          />

          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={saving} className="gap-2">
              <Save className="h-4 w-4" />
              {saving ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>

        {/* Right column - sub-tabs */}
        <div className="xl:col-span-2 flex flex-col gap-4">
          <div className="inline-flex h-10 items-center justify-start rounded-md bg-muted p-1 text-muted-foreground gap-1">
            {(["risk_factors", "skin_map", "total_risk"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setSubTab(tab)}
                className={`inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium transition-all ${
                  subTab === tab ? "bg-background text-foreground shadow-sm" : "hover:bg-background/50"
                }`}
              >
                {tab === "risk_factors" ? "Risk Factors" : tab === "skin_map" ? `Skin Map (${skinMarkers.length})` : "Total Risk"}
              </button>
            ))}
          </div>

          {subTab === "risk_factors" && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Risk Factors from Onboarding</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Factor</TableHead>
                      <TableHead>Value</TableHead>
                      <TableHead>Recorded</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {riskFactors.map((f) => (
                      <TableRow key={f.label}>
                        <TableCell className="font-medium text-sm">{f.label}</TableCell>
                        <TableCell className="text-sm">{f.value}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{onboardingDate}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {subTab === "skin_map" && (
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Skin Findings Map</CardTitle>
                  <div className="flex gap-1">
                    <Button
                      variant={skinView === "front" ? "default" : "outline"}
                      size="sm"
                      className="text-xs h-7"
                      onClick={() => setSkinView("front")}
                    >
                      Front
                    </Button>
                    <Button
                      variant={skinView === "back" ? "default" : "outline"}
                      size="sm"
                      className="text-xs h-7"
                      onClick={() => setSkinView("back")}
                    >
                      Back
                    </Button>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">Click on the body to mark moles or skin changes. Click a marker to remove it.</p>
              </CardHeader>
              <CardContent>
                <div className="flex gap-6">
                  {/* Body diagram */}
                  <div className="w-[220px] shrink-0 border rounded-lg p-3 bg-muted/20">
                    <BodySvg side={skinView} />
                  </div>

                  {/* Markers list */}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
                      Marked Areas ({skinMarkers.length})
                    </p>
                    {skinMarkers.length === 0 ? (
                      <p className="text-sm text-muted-foreground italic py-6">
                        No markers placed yet. Click on the body diagram to add skin findings.
                      </p>
                    ) : (
                      <div className="space-y-3 max-h-[380px] overflow-y-auto pr-2">
                        {skinMarkers.map((m, i) => (
                          <div key={i} className="flex items-start gap-3 border rounded-md p-3 bg-card">
                            <div className="flex items-center justify-center h-7 w-7 rounded-full bg-destructive/10 text-destructive text-xs font-bold shrink-0">
                              {i + 1}
                            </div>
                            <div className="flex-1 min-w-0 space-y-1">
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="text-[10px]">{m.side}</Badge>
                                <button
                                  onClick={() => removeMarker(i)}
                                  className="ml-auto text-muted-foreground hover:text-destructive transition-colors"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                              <Textarea
                                placeholder="Description (e.g., irregular 4mm mole, monitor for changes)..."
                                value={m.notes}
                                onChange={(e) => setSkinMarkers((prev) => prev.map((mk, j) => j === i ? { ...mk, notes: e.target.value } : mk))}
                                className="min-h-[60px] text-xs resize-none"
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {subTab === "total_risk" && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Total Skin & Mucous Risk Assessment</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className={`flex items-center justify-center h-20 w-20 rounded-full ${scoreBg}`}>
                    <span className={`text-3xl font-bold ${scoreColor}`}>{skinScore}</span>
                  </div>
                  <div>
                    <p className="font-medium">Risk Score: {skinScore}/10</p>
                    <p className="text-sm text-muted-foreground">
                      {skinScore <= 3 ? "Low risk — continue monitoring" : skinScore <= 6 ? "Moderate risk — consider intervention" : "High risk — action recommended"}
                    </p>
                  </div>
                </div>

                <Separator />

                <div>
                  <p className="text-sm font-medium mb-2">Contributing Factors</p>
                  <div className="space-y-2 text-sm">
                    {onboarding?.symptom_skin_rash && (
                      <div className="flex items-center gap-2">
                        <Badge variant="destructive" className="text-xs">High</Badge>
                        <span>Active skin rash reported</span>
                      </div>
                    )}
                    {onboarding?.symptom_mucous_membranes && (
                      <div className="flex items-center gap-2">
                        <Badge variant="destructive" className="text-xs">High</Badge>
                        <span>Mucous membrane issues</span>
                      </div>
                    )}
                    {onboarding?.skin_condition != null && Number(onboarding.skin_condition) > 3 && (
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs">Moderate</Badge>
                        <span>Elevated skin condition score: {onboarding.skin_condition}/10</span>
                      </div>
                    )}
                    {onboarding?.sun_exposure && (
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs">Moderate</Badge>
                        <span>Regular sun exposure reported</span>
                      </div>
                    )}
                    {onboarding?.genetic_melanoma && (
                      <div className="flex items-center gap-2">
                        <Badge variant="destructive" className="text-xs">High</Badge>
                        <span>Genetic melanoma risk</span>
                      </div>
                    )}
                    {skinMarkers.length > 0 && (
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs">Info</Badge>
                        <span>{skinMarkers.length} skin finding{skinMarkers.length !== 1 ? "s" : ""} mapped for monitoring</span>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function CardiovascularDimensionView({
  patient, onboarding, labResults, healthCategories, markerNotes, setMarkerNotes, onNavigateDimension, onDataChanged,
}: {
  patient: Tables<"patients">;
  onboarding: Tables<"patient_onboarding"> | null;
  labResults: Tables<"patient_lab_results">[];
  healthCategories: Tables<"patient_health_categories">[];
  markerNotes: Record<string, string>;
  setMarkerNotes: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  onNavigateDimension: (section: string) => void;
  onDataChanged?: () => void;
}) {
  // Compute cardiovascular risk index
  const radarData = computeRadarData(onboarding, labResults, healthCategories);
  const cvScore = radarData.find((d) => d.category === "Cardiovascular")?.score ?? 1;

  const [showRiskHistory, setShowRiskHistory] = useState(false);

  // Compute CV risk score history over time using each lab result date
  const riskHistory = useMemo(() => {
    const sortedLabs = [...labResults].sort((a, b) => a.result_date.localeCompare(b.result_date));
    const computed = sortedLabs.map((lab) => {
      let score = 1;
      if (onboarding?.illness_cardiovascular) score += 3;
      if (lab.ldl_mmol_l && Number(lab.ldl_mmol_l) > 3.0) score += 2;
      if (lab.blood_pressure_systolic && Number(lab.blood_pressure_systolic) > 140) score += 2;
      if (onboarding?.genetic_cardiovascular) score += 1;
      if (onboarding?.smoking === "yes") score += 1;
      return { date: lab.result_date, score: Math.min(score, 10) };
    });

    // If fewer than 2 real data points, add dummy history data
    if (computed.length < 2) {
      const dummyHistory = [
        { date: "2023-03-15", score: 3 },
        { date: "2023-06-20", score: 4 },
        { date: "2023-09-10", score: 3 },
        { date: "2024-01-12", score: 5 },
        { date: "2024-04-22", score: 6 },
        { date: "2024-07-18", score: 5 },
        { date: "2024-10-05", score: 4 },
        { date: "2025-01-15", score: 5 },
      ];
      return [...dummyHistory, ...computed];
    }
    return computed;
  }, [labResults, onboarding]);

  const sorted = [...labResults].sort((a, b) => a.result_date.localeCompare(b.result_date));

  // Doctor summary & recommendations (local state, editable)
  const cvCategory = healthCategories.find((c) => c.category.toLowerCase() === "cardiovascular");
  const [cvSummary, setCvSummary] = useState(cvCategory?.summary || "");
  const [cvRecommendations, setCvRecommendations] = useState((cvCategory as any)?.recommendations || "");
  const [saving, setSaving] = useState(false);
  const [selectedMarker, setSelectedMarker] = useState<{ key: string; label: string; unit: string } | null>(null);
  const [customRefs, setCustomRefs] = useState<Record<string, { low?: number; high?: number }>>({});

  // Auto-populate linked marker notes into summary
  const linkedMarkerKeys = ["ldl_mmol_l", "hba1c_mmol_mol", "blood_pressure_systolic"];
  const autoNotes = linkedMarkerKeys
    .filter((k) => markerNotes[k]?.trim())
    .map((k) => {
      const label = REFERENCE_VALUES[k]?.label || k;
      return `[${label}] ${markerNotes[k].trim()}`;
    });

  const autoNotesBlock = autoNotes.length > 0
    ? autoNotes.join("\n")
    : "";

  // Onboarding risk factors table
  const riskFactors = [
    { label: "Waist-Hip Ratio", value: onboarding?.waist_to_hip_ratio != null ? String(onboarding.waist_to_hip_ratio) : "—" },
    { label: "Exercise, MET (hours/week)", value: onboarding?.exercise_met_hours != null ? String(onboarding.exercise_met_hours) : "—" },
    { label: "Smoking", value: onboarding?.smoking ?? "—" },
    { label: "Genetic Predisposition", value: onboarding?.genetic_cardiovascular ? "Yes" : "No" },
    { label: "Previous Illness", value: onboarding?.illness_cardiovascular ? "Yes" : "No" },
  ];

  const onboardingDate = onboarding?.created_at ? new Date(onboarding.created_at).toLocaleDateString() : "—";

  // Chart data for each marker
  const ldlData = sorted.filter((l) => l.ldl_mmol_l != null).map((l) => ({ date: l.result_date, value: Number(l.ldl_mmol_l) }));
  const bpData = sorted.filter((l) => l.blood_pressure_systolic != null).map((l) => ({ date: l.result_date, systolic: Number(l.blood_pressure_systolic), diastolic: Number(l.blood_pressure_diastolic) }));
  const hba1cData = sorted.filter((l) => l.hba1c_mmol_mol != null).map((l) => ({ date: l.result_date, value: Number(l.hba1c_mmol_mol) }));
  const alatData = sorted.filter((l) => l.alat_u_l != null).map((l) => ({ date: l.result_date, value: Number(l.alat_u_l) }));
  const afosData = sorted.filter((l) => l.afos_alp_u_l != null).map((l) => ({ date: l.result_date, value: Number(l.afos_alp_u_l) }));
  const gtData = sorted.filter((l) => l.gt_u_l != null).map((l) => ({ date: l.result_date, value: Number(l.gt_u_l) }));
  const alatAsatData = sorted.filter((l) => l.alat_asat_ratio != null).map((l) => ({ date: l.result_date, value: Number(l.alat_asat_ratio) }));

  const scoreColor = cvScore <= 3 ? "text-green-600" : cvScore <= 6 ? "text-amber-600" : "text-destructive";
  const scoreBg = cvScore <= 3 ? "bg-green-100" : cvScore <= 6 ? "bg-amber-100" : "bg-red-100";

  const handleSaveCv = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("patient_health_categories")
      .upsert({
        patient_id: patient.id,
        category: "cardiovascular",
        summary: cvSummary,
        recommendations: cvRecommendations,
        status: cvCategory?.status || "normal",
        updated_by: (await supabase.auth.getUser()).data.user?.id || "",
      } as any, { onConflict: "patient_id,category" });
    setSaving(false);
    if (error) {
      toast.error("Failed to save");
    } else {
      toast.success("Saved successfully");
      onDataChanged?.();
    }
  };

  const [cvSubTab, setCvSubTab] = useState<"risk_factors" | "lab_graphs" | "total_risk">("risk_factors");

  // ── Annotation → Summary/Recommendations nudge state ──
  useAnnotationsVersion();
  const cvBiomarkerKeys = ["ldl_mmol_l", "blood_pressure_systolic", "alat_u_l", "afos_alp_u_l", "gt_u_l", "alat_asat_ratio", "hba1c_mmol_mol"];
  const cvAnnotations = getAnnotations().filter((a) => cvBiomarkerKeys.includes(a.biomarkerKey));
  const newForSummary = cvAnnotations.filter((a) => !a.includedInSummary);
  const newForRecommendations = cvAnnotations.filter((a) => !a.includedInRecommendations);
  const [incorporateOpen, setIncorporateOpen] = useState<null | "summary" | "recommendations">(null);
  const [selectedAnnIds, setSelectedAnnIds] = useState<Set<string>>(new Set());

  const openIncorporate = (target: "summary" | "recommendations") => {
    const list = target === "summary" ? newForSummary : newForRecommendations;
    setSelectedAnnIds(new Set(list.map((a) => a.id)));
    setIncorporateOpen(target);
  };

  const applyIncorporate = () => {
    if (!incorporateOpen) return;
    const list = incorporateOpen === "summary" ? newForSummary : newForRecommendations;
    const chosen = list.filter((a) => selectedAnnIds.has(a.id));
    if (chosen.length === 0) {
      setIncorporateOpen(null);
      return;
    }
    const draftBlock =
      `\n\n— DRAFT (from lab annotations, edit before saving) —\n` +
      chosen
        .map((a) => `• [${a.biomarkerLabel} • ${a.date}] ${a.text} — ${a.doctor}`)
        .join("\n");

    if (incorporateOpen === "summary") {
      setCvSummary((prev) => (prev ? prev + draftBlock : draftBlock.trimStart()));
    } else {
      setCvRecommendations((prev) => (prev ? prev + draftBlock : draftBlock.trimStart()));
    }
    markIncluded(chosen.map((a) => a.id), incorporateOpen);
    setIncorporateOpen(null);
    toast.info("Draft inserted — review and save when ready");
  };


  return (
    <div className="space-y-4">
      {/* ─────────────── 1. HEADER ─────────────── */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-md bg-primary/10 flex items-center justify-center">
                <HeartPulse className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg">Cardiovascular Health</CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Risk Index scale: 1 = no action needed → 10 = immediate action
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${scoreBg}`}>
                <span className="text-xs font-medium text-muted-foreground">Risk Index</span>
                <span className={`text-lg font-bold ${scoreColor}`}>{cvScore}/10</span>
              </div>
              <Button
                variant={showRiskHistory ? "default" : "outline"}
                size="sm"
                className="gap-1.5 text-xs"
                onClick={() => setShowRiskHistory(!showRiskHistory)}
              >
                <Activity className="h-3.5 w-3.5" />
                {showRiskHistory ? "Hide History" : "Show History"}
              </Button>
            </div>
          </div>
        </CardHeader>

        {showRiskHistory && (
          <CardContent className="pt-0">
            {riskHistory.length > 1 ? (
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={riskHistory}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                    <YAxis domain={[0, 10]} ticks={[0, 2, 4, 6, 8, 10]} tick={{ fontSize: 10 }} />
                    <Tooltip formatter={(value: number) => [`${value}/10`, "Risk Index"]} />
                    <ReferenceArea y1={0} y2={3} fill="hsl(142 76% 36%)" fillOpacity={0.08} label={{ value: "Low", position: "insideLeft", fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                    <ReferenceArea y1={3} y2={6} fill="hsl(48 96% 53%)" fillOpacity={0.08} label={{ value: "Medium", position: "insideLeft", fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                    <ReferenceArea y1={6} y2={10} fill="hsl(0 84% 60%)" fillOpacity={0.08} label={{ value: "High", position: "insideLeft", fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                    <Line type="monotone" dataKey="score" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 5, fill: "hsl(var(--primary))", stroke: "hsl(var(--background))", strokeWidth: 2 }} activeDot={{ r: 7, fill: "hsl(var(--primary))", stroke: "hsl(var(--background))", strokeWidth: 2 }} name="Risk Index" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-6">Not enough data points to show history. At least 2 lab results are needed.</p>
            )}
          </CardContent>
        )}
      </Card>

      {/* ─────────────── 2. RISK PICTURE ─────────────── */}
      <section className="space-y-2">
        <div className="flex items-baseline justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Risk Picture</h2>
          <p className="text-xs text-muted-foreground">What is driving the current risk index</p>
        </div>

        <Card>
          <CardHeader className="pb-2">
            <div className="inline-flex h-9 items-center justify-start rounded-md bg-muted p-1 text-muted-foreground gap-1 self-start">
              <button
                onClick={() => { setCvSubTab("risk_factors"); setSelectedMarker(null); }}
                className={`inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1 text-sm font-medium transition-all ${
                  cvSubTab === "risk_factors" ? "bg-background text-foreground shadow-sm" : "hover:bg-background/50"
                }`}
              >
                Risk Factors
              </button>
              <button
                onClick={() => { setCvSubTab("lab_graphs"); setSelectedMarker(null); }}
                className={`inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1 text-sm font-medium transition-all ${
                  cvSubTab === "lab_graphs" ? "bg-background text-foreground shadow-sm" : "hover:bg-background/50"
                }`}
              >
                Lab Results
              </button>
              <button
                onClick={() => { setCvSubTab("total_risk"); setSelectedMarker(null); }}
                className={`inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1 text-sm font-medium transition-all ${
                  cvSubTab === "total_risk" ? "bg-background text-foreground shadow-sm" : "hover:bg-background/50"
                }`}
              >
                Total Risk
              </button>
            </div>
          </CardHeader>
          <CardContent>
            {cvSubTab === "risk_factors" && (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Factor</TableHead>
                    <TableHead>Value</TableHead>
                    <TableHead>Recorded</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {riskFactors.map((f) => (
                    <TableRow key={f.label}>
                      <TableCell className="font-medium text-sm">{f.label}</TableCell>
                      <TableCell className="text-sm">{f.value}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{onboardingDate}</TableCell>
                    </TableRow>
                  ))}
                  {onboarding?.illness_cardiovascular_notes && (
                    <TableRow>
                      <TableCell className="font-medium text-sm">Previous Illness Notes</TableCell>
                      <TableCell colSpan={2} className="text-sm">{onboarding.illness_cardiovascular_notes}</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}

            {cvSubTab === "lab_graphs" && (
              <div className="flex gap-4">
                <div className={`grid grid-cols-1 ${selectedMarker ? "lg:grid-cols-1" : "lg:grid-cols-2"} gap-4 flex-1 min-w-0`}>
                  <CardioLabBiomarkerPanel
                    biomarkerKey="ldl_mmol_l"
                    label="LDL"
                    unit="mmol/L"
                    refHigh={3.0}
                    selected={selectedMarker?.key === "ldl_mmol_l"}
                    onSelect={() => setSelectedMarker({ key: "ldl_mmol_l", label: "LDL", unit: "mmol/L" })}
                  />
                  <CardioLabBiomarkerPanel
                    biomarkerKey="blood_pressure_systolic"
                    label="Blood Pressure"
                    unit="mmHg"
                    refLow={60}
                    refHigh={140}
                    selected={selectedMarker?.key === "blood_pressure_systolic"}
                    onSelect={() => setSelectedMarker({ key: "blood_pressure_systolic", label: "Blood Pressure (Systolic)", unit: "mmHg" })}
                  />
                  <CardioLabBiomarkerPanel
                    biomarkerKey="alat_u_l"
                    label="ALAT"
                    unit="U/L"
                    refHigh={50}
                    selected={selectedMarker?.key === "alat_u_l"}
                    onSelect={() => setSelectedMarker({ key: "alat_u_l", label: "ALAT", unit: "U/L" })}
                  />
                  <CardioLabBiomarkerPanel
                    biomarkerKey="afos_alp_u_l"
                    label="AFOS/ALP"
                    unit="U/L"
                    refLow={35}
                    refHigh={105}
                    selected={selectedMarker?.key === "afos_alp_u_l"}
                    onSelect={() => setSelectedMarker({ key: "afos_alp_u_l", label: "AFOS/ALP", unit: "U/L" })}
                  />
                  <CardioLabBiomarkerPanel
                    biomarkerKey="gt_u_l"
                    label="GT"
                    unit="U/L"
                    refHigh={60}
                    selected={selectedMarker?.key === "gt_u_l"}
                    onSelect={() => setSelectedMarker({ key: "gt_u_l", label: "GT", unit: "U/L" })}
                  />
                  <CardioLabBiomarkerPanel
                    biomarkerKey="alat_asat_ratio"
                    label="ALAT/ASAT Ratio"
                    unit=""
                    refHigh={1.0}
                    selected={selectedMarker?.key === "alat_asat_ratio"}
                    onSelect={() => setSelectedMarker({ key: "alat_asat_ratio", label: "ALAT/ASAT Ratio", unit: "" })}
                  />
                  <CardioLabBiomarkerPanel
                    biomarkerKey="hba1c_mmol_mol"
                    label="HbA1c"
                    unit="mmol/mol"
                    refHigh={42}
                    selected={selectedMarker?.key === "hba1c_mmol_mol"}
                    onSelect={() => setSelectedMarker({ key: "hba1c_mmol_mol", label: "HbA1c", unit: "mmol/mol" })}
                  />
                </div>

                {selectedMarker && (() => {
                  const detailChartData = sorted
                    .map((lab) => {
                      const val = (lab as any)[selectedMarker.key];
                      if (val === null || val === undefined) return null;
                      return { date: lab.result_date, value: Number(val) };
                    })
                    .filter(Boolean) as { date: string; value: number }[];

                  const ref = {
                    ...REFERENCE_VALUES[selectedMarker.key],
                    ...customRefs[selectedMarker.key],
                  };

                  return (
                    <div className="w-[380px] shrink-0 border rounded-lg bg-card flex flex-col animate-in slide-in-from-right-5 duration-200">
                      <div className="flex items-center justify-between p-4 border-b">
                        <div>
                          <h3 className="font-semibold text-sm">{selectedMarker.label}</h3>
                          {selectedMarker.unit && (
                            <p className="text-xs text-muted-foreground">{selectedMarker.unit}</p>
                          )}
                        </div>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setSelectedMarker(null)}>
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="p-4 flex-1 overflow-auto">
                        {detailChartData.length < 1 ? (
                          <p className="text-sm text-muted-foreground text-center py-8">No data points available for this marker.</p>
                        ) : (
                          <DraggableReferenceChart
                            chartData={detailChartData}
                            refValues={ref}
                            onRefChange={(newRef) => {
                              setCustomRefs((prev) => ({
                                ...prev,
                                [selectedMarker.key]: { ...(REFERENCE_VALUES[selectedMarker.key] || {}), ...prev[selectedMarker.key], ...newRef },
                              }));
                            }}
                          />
                        )}
                        <div className="mt-4 space-y-3">
                          <p className="text-xs font-medium text-muted-foreground">Reference Values</p>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <Label className="text-xs">Low</Label>
                              <Input
                                type="number"
                                step="any"
                                placeholder="—"
                                className="h-8 text-xs"
                                value={ref?.low ?? ""}
                                onChange={(e) => {
                                  const val = e.target.value === "" ? undefined : Number(e.target.value);
                                  setCustomRefs((prev) => ({
                                    ...prev,
                                    [selectedMarker.key]: { ...prev[selectedMarker.key], low: val },
                                  }));
                                }}
                              />
                            </div>
                            <div>
                              <Label className="text-xs">High</Label>
                              <Input
                                type="number"
                                step="any"
                                placeholder="—"
                                className="h-8 text-xs"
                                value={ref?.high ?? ""}
                                onChange={(e) => {
                                  const val = e.target.value === "" ? undefined : Number(e.target.value);
                                  setCustomRefs((prev) => ({
                                    ...prev,
                                    [selectedMarker.key]: { ...prev[selectedMarker.key], high: val },
                                  }));
                                }}
                              />
                            </div>
                          </div>
                        </div>
                        <div className="mt-4">
                          <Label className="text-xs">Doctor Notes</Label>
                          <Textarea
                            placeholder="Add notes about this marker..."
                            className="mt-1 min-h-[80px] text-xs resize-none"
                            value={markerNotes[selectedMarker.key] || ""}
                            onChange={(e) => {
                              setMarkerNotes((prev) => ({ ...prev, [selectedMarker.key]: e.target.value }));
                            }}
                          />
                        </div>
                        {MARKER_DIMENSIONS[selectedMarker.key] && (
                          <div className="mt-4">
                            <p className="text-xs font-medium text-muted-foreground mb-2">Affects Health Dimensions</p>
                            <div className="flex flex-wrap gap-1.5">
                              {MARKER_DIMENSIONS[selectedMarker.key].map((dimKey) => {
                                const dim = HEALTH_DIMENSIONS.find((d) => d.key === dimKey);
                                if (!dim) return null;
                                const DimIcon = dim.icon;
                                return (
                                  <button
                                    key={dimKey}
                                    onClick={() => onNavigateDimension(dimKey)}
                                    className="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium text-primary hover:bg-primary/10 transition-colors cursor-pointer"
                                  >
                                    <DimIcon className="h-3 w-3" />
                                    {dim.label}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}

            {cvSubTab === "total_risk" && (
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className={`flex items-center justify-center h-20 w-20 rounded-full ${scoreBg}`}>
                    <span className={`text-3xl font-bold ${scoreColor}`}>{cvScore}</span>
                  </div>
                  <div>
                    <p className="font-medium">Risk Score: {cvScore}/10</p>
                    <p className="text-sm text-muted-foreground">
                      {cvScore <= 3 ? "Low risk — continue monitoring" : cvScore <= 6 ? "Moderate risk — consider intervention" : "High risk — action recommended"}
                    </p>
                  </div>
                </div>

                <Separator />

                <div>
                  <p className="text-sm font-medium mb-2">Contributing Factors</p>
                  <div className="space-y-2 text-sm">
                    {onboarding?.illness_cardiovascular && (
                      <div className="flex items-center gap-2">
                        <Badge variant="destructive" className="text-xs">High</Badge>
                        <span>Previous cardiovascular illness</span>
                      </div>
                    )}
                    {onboarding?.genetic_cardiovascular && (
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs">Moderate</Badge>
                        <span>Genetic predisposition</span>
                      </div>
                    )}
                    {labResults[0]?.ldl_mmol_l && Number(labResults[0].ldl_mmol_l) > 3.0 && (
                      <div className="flex items-center gap-2">
                        <Badge variant="destructive" className="text-xs">High</Badge>
                        <span>Elevated LDL: {labResults[0].ldl_mmol_l} mmol/L (target &lt; 3.0)</span>
                      </div>
                    )}
                    {labResults[0]?.blood_pressure_systolic && Number(labResults[0].blood_pressure_systolic) > 140 && (
                      <div className="flex items-center gap-2">
                        <Badge variant="destructive" className="text-xs">High</Badge>
                        <span>Elevated blood pressure: {labResults[0].blood_pressure_systolic}/{labResults[0].blood_pressure_diastolic} mmHg</span>
                      </div>
                    )}
                    {labResults[0]?.hba1c_mmol_mol && Number(labResults[0].hba1c_mmol_mol) > 42 && (
                      <div className="flex items-center gap-2">
                        <Badge variant="destructive" className="text-xs">High</Badge>
                        <span>Elevated HbA1c: {labResults[0].hba1c_mmol_mol} mmol/mol (target &lt; 42)</span>
                      </div>
                    )}
                    {onboarding?.smoking === "yes" && (
                      <div className="flex items-center gap-2">
                        <Badge variant="destructive" className="text-xs">High</Badge>
                        <span>Active smoker</span>
                      </div>
                    )}
                    {onboarding?.waist_to_hip_ratio && Number(onboarding.waist_to_hip_ratio) > 0.9 && (
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs">Moderate</Badge>
                        <span>Elevated waist-to-hip ratio: {onboarding.waist_to_hip_ratio}</span>
                      </div>
                    )}
                    {onboarding?.exercise_met_hours != null && Number(onboarding.exercise_met_hours) < 5 && (
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs">Moderate</Badge>
                        <span>Low physical activity: {onboarding.exercise_met_hours} MET hrs/week</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      {/* ─────────────── 3. MEDICATIONS ─────────────── */}
      <section className="space-y-2">
        <div className="flex items-baseline justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Medications</h2>
          <p className="text-xs text-muted-foreground">What we are doing about it</p>
        </div>
        <DimensionMedicationsSection
          dimensionKey="cardiovascular"
          dimensionLabel="Cardiovascular Health"
          onNavigateToMedications={() => onNavigateDimension("medications")}
        />
      </section>

      {/* ─────────────── 4. CLINICAL SYNTHESIS ─────────────── */}
      <section className="space-y-2">
        <div className="flex items-baseline justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Clinical Synthesis</h2>
          <p className="text-xs text-muted-foreground">Doctor's interpretation and care plan</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Doctor's Summary</CardTitle>
            </CardHeader>
            <CardContent>
              {newForSummary.length > 0 && (
                <div className="mb-3 flex items-center justify-between gap-2 rounded-md border border-primary/30 bg-primary/5 px-3 py-2">
                  <p className="text-xs text-foreground">
                    You have <span className="font-semibold">{newForSummary.length}</span> new annotation{newForSummary.length === 1 ? "" : "s"} since your last summary update.
                  </p>
                  <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => openIncorporate("summary")}>
                    <StickyNote className="h-3.5 w-3.5" /> View &amp; incorporate
                  </Button>
                </div>
              )}
              <Textarea
                placeholder="Write a clinical summary for the cardiovascular dimension..."
                value={cvSummary}
                onChange={(e) => setCvSummary(e.target.value)}
                className="min-h-[160px] resize-none"
              />
              {autoNotesBlock && (
                <div className="mt-3">
                  <p className="text-xs font-medium text-muted-foreground mb-1">Auto-linked Lab Notes</p>
                  <div className="rounded-md border bg-muted/40 p-3 text-xs whitespace-pre-wrap text-foreground">
                    {autoNotesBlock}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Recommendations</CardTitle>
            </CardHeader>
            <CardContent>
              {newForRecommendations.length > 0 && (
                <div className="mb-3 flex items-center justify-between gap-2 rounded-md border border-primary/30 bg-primary/5 px-3 py-2">
                  <p className="text-xs text-foreground">
                    You have <span className="font-semibold">{newForRecommendations.length}</span> new annotation{newForRecommendations.length === 1 ? "" : "s"} that may inform recommendations.
                  </p>
                  <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => openIncorporate("recommendations")}>
                    <StickyNote className="h-3.5 w-3.5" /> View &amp; incorporate
                  </Button>
                </div>
              )}
              <Textarea

                placeholder="Write a clinical summary for the cardiovascular dimension..."
                value={cvSummary}
                onChange={(e) => setCvSummary(e.target.value)}
                className="min-h-[160px] resize-none"
              />
              {autoNotesBlock && (
                <div className="mt-3">
                  <p className="text-xs font-medium text-muted-foreground mb-1">Auto-linked Lab Notes</p>
                  <div className="rounded-md border bg-muted/40 p-3 text-xs whitespace-pre-wrap text-foreground">
                    {autoNotesBlock}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Recommendations</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="Write recommendations for the cardiovascular care plan..."
                value={cvRecommendations}
                onChange={(e) => setCvRecommendations(e.target.value)}
                className="min-h-[160px] resize-none"
              />
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-end pt-1">
          <Button onClick={handleSaveCv} disabled={saving} className="gap-2">
            <Save className="h-4 w-4" />
            {saving ? "Saving..." : "Save Summary & Recommendations"}
          </Button>
        </div>
      </section>
    </div>
  );
}

// Mapping from lab marker key to health dimension keys
const MARKER_DIMENSIONS: Record<string, string[]> = {
  ldl_mmol_l: ["cardiovascular", "brain_mental"],
  hba1c_mmol_mol: ["cardiovascular", "metabolic"],
  blood_pressure_systolic: ["cardiovascular", "metabolic"],
  blood_pressure_diastolic: ["cardiovascular", "metabolic"],
  alat_u_l: ["digestion"],
  afos_alp_u_l: ["digestion", "exercise_functional"],
  gt_u_l: ["digestion"],
  alat_asat_ratio: ["digestion"],
  egfr: ["metabolic"],
  cystatin_c: ["metabolic"],
  tsh_mu_l: ["metabolic"],
  pef_percent: ["respiratory_immune"],
  fev1_percent: ["respiratory_immune"],
  fvc_percent: ["respiratory_immune"],
  // Metabolic nutrition markers
  holotranscobalamin_pmol_l: ["metabolic"],
  vitamin_b12_total_ng_l: ["metabolic"],
  vitamin_d_25oh_nmol_l: ["metabolic"],
  folate_ug_l: ["metabolic"],
  iron_serum_umol_l: ["metabolic"],
  ferritin_ug_l: ["metabolic"],
  free_t4_pmol_l: ["metabolic"],
  calcium_mmol_l: ["metabolic"],
  potassium_mmol_l: ["metabolic"],
  creatinine_umol_l: ["metabolic"],
  sodium_mmol_l: ["metabolic"],
};

const REFERENCE_VALUES: Record<string, { low?: number; high?: number; label: string }> = {
  ldl_mmol_l: { high: 3.0, label: "LDL" },
  hba1c_mmol_mol: { high: 42, label: "HbA1c" },
  blood_pressure_systolic: { high: 140, label: "Systolic BP" },
  blood_pressure_diastolic: { high: 90, label: "Diastolic BP" },
  alat_u_l: { high: 50, label: "ALAT" },
  afos_alp_u_l: { low: 35, high: 105, label: "AFOS/ALP" },
  gt_u_l: { high: 60, label: "GT" },
  alat_asat_ratio: { high: 1.0, label: "ALAT/ASAT ratio" },
  egfr: { low: 60, label: "eGFR" },
  cystatin_c: { high: 1.03, label: "Cystatin C" },
  tsh_mu_l: { low: 0.4, high: 4.0, label: "TSH" },
  pef_percent: { low: 80, label: "PEF" },
  fev1_percent: { low: 80, label: "FEV1" },
  fvc_percent: { low: 80, label: "FVC" },
};

function LabResultsView({ patientId, labResults, onLabResultsAdded, onNavigateDimension, markerNotes, setMarkerNotes }: {
  patientId: string;
  labResults: Tables<"patient_lab_results">[];
  onLabResultsAdded: () => void;
  onNavigateDimension: (section: string) => void;
  markerNotes: Record<string, string>;
  setMarkerNotes: React.Dispatch<React.SetStateAction<Record<string, string>>>;
}) {
  const [selectedMarker, setSelectedMarker] = useState<{ key: string; label: string; unit: string } | null>(null);
  const [healthDataTab, setHealthDataTab] = useState<HealthDataTab>("lab_results");
  const [customRefs, setCustomRefs] = useState<Record<string, { low?: number; high?: number }>>({});
  const leftScrollRef = React.useRef<HTMLDivElement>(null);
  const rightScrollRef = React.useRef<HTMLDivElement>(null);
  const isSyncing = React.useRef(false);

  const syncScroll = (source: "left" | "right") => {
    if (isSyncing.current) return;
    isSyncing.current = true;
    const from = source === "left" ? leftScrollRef.current : rightScrollRef.current;
    const to = source === "left" ? rightScrollRef.current : leftScrollRef.current;
    if (from && to) to.scrollTop = from.scrollTop;
    isSyncing.current = false;
  };
  // Dummy lab results for demo columns
  const dummyLabs: Partial<Tables<"patient_lab_results">>[] = [
    { id: "dummy-0", result_date: "2023-11-28", ldl_mmol_l: 4.1, hba1c_mmol_mol: 45, blood_pressure_systolic: 142, blood_pressure_diastolic: 92, alat_u_l: 35, afos_alp_u_l: 78, gt_u_l: 45, alat_asat_ratio: 1.1, egfr: 82, cystatin_c: 1.02, u_alb_krea_abnormal: false, tsh_mu_l: 2.5, testosterone_estrogen_abnormal: false, apoe_e4: false, pef_percent: 88, fev1_percent: 85, fvc_percent: 87 },
    { id: "dummy-1", result_date: "2024-03-15", ldl_mmol_l: 3.8, hba1c_mmol_mol: 42, blood_pressure_systolic: 135, blood_pressure_diastolic: 88, alat_u_l: 28, afos_alp_u_l: 72, gt_u_l: 38, alat_asat_ratio: 0.9, egfr: 88, cystatin_c: 0.95, u_alb_krea_abnormal: false, tsh_mu_l: 2.1, testosterone_estrogen_abnormal: false, apoe_e4: false, pef_percent: 92, fev1_percent: 89, fvc_percent: 91 },
    { id: "dummy-2", result_date: "2024-06-20", ldl_mmol_l: 3.5, hba1c_mmol_mol: 40, blood_pressure_systolic: 128, blood_pressure_diastolic: 82, alat_u_l: 32, afos_alp_u_l: 68, gt_u_l: 42, alat_asat_ratio: 1.0, egfr: 91, cystatin_c: 0.88, u_alb_krea_abnormal: false, tsh_mu_l: 1.8, testosterone_estrogen_abnormal: false, apoe_e4: false, pef_percent: 94, fev1_percent: 91, fvc_percent: 93 },
    { id: "dummy-3", result_date: "2024-09-10", ldl_mmol_l: 3.2, hba1c_mmol_mol: 38, blood_pressure_systolic: 122, blood_pressure_diastolic: 78, alat_u_l: 25, afos_alp_u_l: 65, gt_u_l: 35, alat_asat_ratio: 0.85, egfr: 94, cystatin_c: 0.82, u_alb_krea_abnormal: false, tsh_mu_l: 2.3, testosterone_estrogen_abnormal: false, apoe_e4: false, pef_percent: 96, fev1_percent: 93, fvc_percent: 95 },
    { id: "dummy-4", result_date: "2024-12-05", ldl_mmol_l: 2.9, hba1c_mmol_mol: 36, blood_pressure_systolic: 118, blood_pressure_diastolic: 75, alat_u_l: 22, afos_alp_u_l: 60, gt_u_l: 30, alat_asat_ratio: 0.8, egfr: 97, cystatin_c: 0.78, u_alb_krea_abnormal: false, tsh_mu_l: 2.0, testosterone_estrogen_abnormal: false, apoe_e4: false, pef_percent: 98, fev1_percent: 95, fvc_percent: 96 },
  ];

  const allLabs = [...labResults, ...dummyLabs.filter(d => !labResults.some(r => r.id === d.id))] as Tables<"patient_lab_results">[];
  // Chronological: oldest first (left), newest last (right)
  const sorted = [...allLabs].sort((a, b) => a.result_date.localeCompare(b.result_date));

  const categories = [
    {
      title: "Cardiovascular & Metabolic Health",
      rows: [
        { label: "LDL", unit: "mmol/l", key: "ldl_mmol_l" as const },
        { label: "HbA1c", unit: "mmol/mol", key: "hba1c_mmol_mol" as const },
        { label: "RR / Blood Pressure", unit: "mmHg", key: "_bp" as const },
      ],
    },
    {
      title: "Liver Function",
      rows: [
        { label: "ALAT", unit: "U/l", key: "alat_u_l" as const },
        { label: "AFOS / ALP", unit: "U/l", key: "afos_alp_u_l" as const },
        { label: "GT", unit: "U/l", key: "gt_u_l" as const },
        { label: "ALAT / ASAT ratio", unit: "", key: "alat_asat_ratio" as const },
      ],
    },
    {
      title: "Kidney Function",
      rows: [
        { label: "eGFR", unit: "ml/min/1.73 m²", key: "egfr" as const },
        { label: "Cystatin C", unit: "mg/l", key: "cystatin_c" as const },
        { label: "U-Alb/Krea, abnormal", unit: "0/1", key: "u_alb_krea_abnormal" as const },
      ],
    },
    {
      title: "Endocrine & Hormonal Health",
      rows: [
        { label: "TSH", unit: "mU/l", key: "tsh_mu_l" as const },
        { label: "Testosterone / Estrogen, abnormal", unit: "0/1", key: "testosterone_estrogen_abnormal" as const },
      ],
    },
    {
      title: "Genetics & Risk Markers",
      rows: [
        { label: "APOE ε4", unit: "0/1", key: "apoe_e4" as const },
      ],
    },
    {
      title: "Spirometry",
      rows: [
        { label: "PEF", unit: "%", key: "pef_percent" as const },
        { label: "FEV1", unit: "%", key: "fev1_percent" as const },
        { label: "FVC", unit: "%", key: "fvc_percent" as const },
      ],
    },
  ];

  const getCellValue = (lab: Tables<"patient_lab_results">, key: string): string => {
    if (key === "_bp") {
      return lab.blood_pressure_systolic != null ? `${lab.blood_pressure_systolic}/${lab.blood_pressure_diastolic}` : "—";
    }
    const val = (lab as any)[key];
    if (val === null || val === undefined) return "—";
    if (typeof val === "boolean") return val ? "1" : "0";
    return String(val);
  };

  const isOutOfRange = (key: string, lab: Tables<"patient_lab_results">): "high" | "low" | null => {
    const refKey = key === "_bp" ? "blood_pressure_systolic" : key;
    const ref = { ...REFERENCE_VALUES[refKey], ...customRefs[refKey] };
    if (!ref) return null;
    let val: number | null = null;
    if (key === "_bp") {
      val = lab.blood_pressure_systolic;
    } else {
      const raw = (lab as any)[key];
      if (raw === null || raw === undefined || typeof raw === "boolean") return null;
      val = Number(raw);
    }
    if (val === null || isNaN(val)) return null;
    if (ref.high != null && val > ref.high) return "high";
    if (ref.low != null && val < ref.low) return "low";
    return null;
  };

  const handleRowClick = (key: string, label: string, unit: string) => {
    if (key === "_bp") {
      setSelectedMarker({ key: "blood_pressure_systolic", label: "Blood Pressure (Systolic)", unit: "mmHg" });
    } else if (key === "u_alb_krea_abnormal" || key === "testosterone_estrogen_abnormal" || key === "apoe_e4") {
      return;
    } else {
      setSelectedMarker({ key, label, unit });
    }
  };

  const chartData = useMemo(() => {
    if (!selectedMarker) return [];
    const chronological = [...sorted];
    return chronological
      .map((lab) => {
        const val = (lab as any)[selectedMarker.key];
        if (val === null || val === undefined) return null;
        return { date: lab.result_date, value: Number(val) };
      })
      .filter(Boolean) as { date: string; value: number }[];
  }, [selectedMarker, sorted]);

  const ref = selectedMarker ? {
    ...REFERENCE_VALUES[selectedMarker.key],
    ...customRefs[selectedMarker.key],
  } : null;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between shrink-0">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <FlaskConical className="h-5 w-5 text-primary" />
          Health Data
        </h2>
        {healthDataTab === "lab_results" && (
          <AddLabResultsDialog patientId={patientId} onSaved={onLabResultsAdded} />
        )}
      </div>

      <HealthFileUploads
        patientId={patientId}
        activeTab={healthDataTab}
        onTabChange={setHealthDataTab}
        labResultsCount={sorted.length}
      >
      {/* Lab results content - rendered as children when lab_results tab is active */}
      <div className="flex gap-4" style={{ minHeight: 400, maxHeight: "60vh" }}>
        <div className={`min-w-0 min-h-0 flex flex-col ${selectedMarker ? "flex-1" : "w-full"}`}>
        {sorted.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              No lab results yet. Click "Add Lab Results" to add the first entry.
            </CardContent>
          </Card>
        ) : (
          <Card className="flex-1 min-h-0 flex flex-col">
            <CardContent className="p-0 flex-1 min-h-0 flex flex-col">
              <div className="flex min-h-0 flex-1">
                {/* Fixed left columns: Marker + Unit */}
                <div ref={leftScrollRef} onScroll={() => syncScroll("left")} className="shrink-0 border-r overflow-y-auto">
                  <table className="text-sm border-collapse">
                    <thead className="sticky top-0 z-10 bg-card">
                      <tr className="border-b">
                        <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground min-w-[180px]">Marker</th>
                        <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground min-w-[70px]">Unit</th>
                      </tr>
                    </thead>
                    <tbody>
                      {categories.map((cat) => (
                        <React.Fragment key={cat.title}>
                          <tr className="border-b">
                            <td colSpan={2} className="bg-muted/50 font-medium text-xs uppercase tracking-wide text-muted-foreground py-2 px-4">
                              {cat.title}
                            </td>
                          </tr>
                          {cat.rows.map((row) => (
                            <tr
                              key={row.key}
                              className={`border-b cursor-pointer hover:bg-muted/30 transition-colors ${selectedMarker?.key === row.key || (row.key === "_bp" && selectedMarker?.key === "blood_pressure_systolic") ? "bg-primary/5" : ""}`}
                              onClick={() => handleRowClick(row.key, row.label, row.unit)}
                            >
                              <td className="p-4 align-middle font-medium text-sm">{row.label}</td>
                              <td className="p-4 align-middle text-xs text-muted-foreground">{row.unit}</td>
                            </tr>
                          ))}
                        </React.Fragment>
                      ))}
                    </tbody>
                  </table>
                </div>
                {/* Scrollable right columns: date values */}
                <div ref={rightScrollRef} onScroll={() => syncScroll("right")} className="overflow-auto flex-1 min-w-0">
                  <table className="text-sm border-collapse w-max">
                    <thead className="sticky top-0 z-10 bg-card">
                      <tr className="border-b">
                         {sorted.map((lab) => {
                          const d = new Date(lab.result_date);
                          const label = `${d.getFullYear()} / ${String(d.getMonth() + 1).padStart(2, "0")}`;
                          return (
                            <th key={lab.id} className="h-12 px-4 text-center align-middle font-medium text-muted-foreground min-w-[100px] whitespace-nowrap">{label}</th>
                          );
                        })}
                      </tr>
                    </thead>
                    <tbody>
                      {categories.map((cat) => (
                        <React.Fragment key={cat.title}>
                          <tr className="border-b">
                            <td colSpan={sorted.length} className="bg-muted/50 font-medium text-xs uppercase tracking-wide text-muted-foreground py-2 px-4">
                              &nbsp;
                            </td>
                          </tr>
                          {cat.rows.map((row) => (
                            <tr
                              key={row.key}
                              className={`border-b cursor-pointer hover:bg-muted/30 transition-colors ${selectedMarker?.key === row.key || (row.key === "_bp" && selectedMarker?.key === "blood_pressure_systolic") ? "bg-primary/5" : ""}`}
                              onClick={() => handleRowClick(row.key, row.label, row.unit)}
                            >
                              {sorted.map((lab) => {
                                const oor = isOutOfRange(row.key, lab);
                                return (
                                  <td key={lab.id} className={`p-4 align-middle text-center text-sm whitespace-nowrap ${oor === "high" ? "text-destructive font-semibold" : oor === "low" ? "text-amber-600 font-semibold" : ""}`}>
                                    {getCellValue(lab, row.key)}
                                    {oor === "high" && " ▲"}
                                    {oor === "low" && " ▼"}
                                  </td>
                                );
                              })}
                            </tr>
                          ))}
                        </React.Fragment>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
        </div>

        {/* Chart Panel */}
        {selectedMarker && (
          <div className="w-[350px] shrink-0 border rounded-lg bg-card flex flex-col min-h-0 overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b shrink-0">
              <div>
                <h3 className="font-semibold text-sm">{selectedMarker.label}</h3>
                {selectedMarker.unit && (
                  <p className="text-xs text-muted-foreground">{selectedMarker.unit}</p>
                )}
              </div>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setSelectedMarker(null)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="p-4 flex-1">
            {chartData.length < 1 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No data points available for this marker.</p>
            ) : (
              <DraggableReferenceChart
                chartData={chartData}
                refValues={ref}
                onRefChange={(newRef) => {
                  const key = selectedMarker?.key;
                  if (!key) return;
                  setCustomRefs((prev) => ({
                    ...prev,
                    [key]: { ...(REFERENCE_VALUES[key] || {}), ...prev[key], ...newRef },
                  }));
                }}
              />
            )}
            {selectedMarker && (
              <div className="mt-4 space-y-3">
                <p className="text-xs font-medium text-muted-foreground">Reference Values</p>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">Low</Label>
                    <Input
                      type="number"
                      step="any"
                      placeholder="—"
                      className="h-8 text-xs"
                      value={ref?.low ?? ""}
                      onChange={(e) => {
                        const val = e.target.value === "" ? undefined : Number(e.target.value);
                        setCustomRefs((prev) => ({
                          ...prev,
                          [selectedMarker.key]: { ...prev[selectedMarker.key], low: val },
                        }));
                      }}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">High</Label>
                    <Input
                      type="number"
                      step="any"
                      placeholder="—"
                      className="h-8 text-xs"
                      value={ref?.high ?? ""}
                      onChange={(e) => {
                        const val = e.target.value === "" ? undefined : Number(e.target.value);
                        setCustomRefs((prev) => ({
                          ...prev,
                          [selectedMarker.key]: { ...prev[selectedMarker.key], high: val },
                        }));
                      }}
                    />
                  </div>
                </div>
              </div>
            )}
            <div className="mt-4">
              <Label className="text-xs">Doctor Notes</Label>
              <Textarea
                placeholder="Add notes about this marker..."
                className="mt-1 min-h-[80px] text-xs resize-none"
                value={markerNotes[selectedMarker?.key || ""] || ""}
                onChange={(e) => {
                  if (!selectedMarker) return;
                  setMarkerNotes((prev) => ({ ...prev, [selectedMarker.key]: e.target.value }));
                }}
              />
            </div>
            {selectedMarker && MARKER_DIMENSIONS[selectedMarker.key] && (
              <div className="mt-4">
                <p className="text-xs font-medium text-muted-foreground mb-2">Affects Health Dimensions</p>
                <div className="flex flex-wrap gap-1.5">
                  {MARKER_DIMENSIONS[selectedMarker.key].map((dimKey) => {
                    const dim = HEALTH_DIMENSIONS.find((d) => d.key === dimKey);
                    if (!dim) return null;
                    const Icon = dim.icon;
                    return (
                      <button
                        key={dimKey}
                        onClick={() => onNavigateDimension(dimKey)}
                        className="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium text-primary hover:bg-primary/10 transition-colors cursor-pointer"
                      >
                        <Icon className="h-3 w-3" />
                        {dim.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
            {/* Lab Values List */}
            {selectedMarker && chartData.length > 0 && (
              <div className="mt-4">
                <p className="text-xs font-medium text-muted-foreground mb-2">Lab Values</p>
                <div className="space-y-1.5">
                  {sorted.map((lab) => {
                    const val = selectedMarker.key === "blood_pressure_systolic"
                      ? (lab.blood_pressure_systolic != null ? `${lab.blood_pressure_systolic}/${lab.blood_pressure_diastolic}` : null)
                      : (() => { const v = (lab as any)[selectedMarker.key]; return v === null || v === undefined ? null : typeof v === "boolean" ? (v ? "1" : "0") : String(v); })();
                    if (val === null) return null;
                    const d = new Date(lab.result_date);
                    const exactDate = d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
                    return (
                      <div key={lab.id} className="flex items-center justify-between text-xs py-1.5 px-2 rounded bg-muted/30">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{val}</span>
                          <span className="text-muted-foreground">{selectedMarker.unit}</span>
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <span>{exactDate}</span>
                          <Badge variant="outline" className="text-[10px] h-4 px-1.5 capitalize">{lab.source || "manual"}</Badge>
                        </div>
                      </div>
                    );
                  }).filter(Boolean)}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      </div>
      </HealthFileUploads>
    </div>
  );
}

export default PatientProfilePage;
