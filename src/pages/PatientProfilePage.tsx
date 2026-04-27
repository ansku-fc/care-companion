import React, { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
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
  AlertTriangle, ClipboardList, Plus, ChevronDown, ChevronRight, StickyNote,
} from "lucide-react";
import { HEALTH_TAXONOMY, findDimension, findMainDimension, type MainDimension } from "@/lib/healthDimensions";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar as RechartsRadar, Legend, ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceArea } from "recharts";
import { MarkerDetailChart } from "@/components/patients/MarkerDetailChart";
import type { Tables } from "@/integrations/supabase/types";
import { AddLabResultsDialog } from "@/components/patients/AddLabResultsDialog";
import { PatientVisitsView } from "@/components/patients/PatientVisitsView";
import { HealthReportDialog } from "@/components/patients/HealthReportDialog";
import { HealthFileUploads, type HealthDataTab } from "@/components/patients/HealthFileUploads";
import { MetabolicDimensionView } from "@/components/patients/MetabolicDimensionView";
import { PatientMedicationsView } from "@/components/patients/PatientMedicationsView";
import { DimensionMedicationsSection } from "@/components/patients/DimensionMedicationsSection";
import { MainDimensionOverview, SubDimensionView } from "@/components/patients/DimensionOverviewView";
import { computeSubScores, aggregateMainScore } from "@/lib/subDimensionScoring";
import { PatientOverviewView } from "@/components/patients/PatientOverviewView";
import { OnboardingEmptyState } from "@/components/patients/OnboardingEmptyState";
import { PatientCareTeamView } from "@/components/patients/PatientCareTeamView";
import { HealthDataView } from "@/components/patients/HealthDataView";
import { HealthDataHub } from "@/components/patients/HealthDataHub";
import {
  CARTER_DIAGNOSES,
  getDiagnosesForDimension,
  fmtClinicalDate,
  type ClinicalDimensionKey,
} from "@/lib/patientClinicalData";
import {
  CardioLabBiomarkerPanel,
  CARDIO_DUMMY_SERIES,
  getAnnotations,
  getAnnotationsForBiomarker,
  markIncluded,
  useAnnotationsVersion,
  updateAnnotation,
  deleteAnnotation,
  addAnnotation,
  getSeriesRowsForBiomarker,
  type LabAnnotation,
} from "@/components/patients/CardioLabBiomarkerPanel";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useTaskActions } from "@/components/tasks/TaskProvider";
import { useNavHistory } from "@/hooks/useNavHistory";
import {
  seedMarkers as seedLabReviewMarkers,
  getNewMarkers,
  verifyMarker,
  subscribeLabReview,
  completeLabReviewTask,
  type NewMarker,
} from "@/lib/labReview";

// Legacy flat list for backward compat in dimension views
const HEALTH_DIMENSIONS = HEALTH_TAXONOMY.flatMap((main) => {
  const items = [{ key: main.key, label: main.label, icon: main.icon }];
  main.subDimensions.forEach((sub) => items.push({ key: sub.key, label: sub.label, icon: sub.icon }));
  return items;
});

type SidebarSection = "details" | string;

const TIER_LABELS: Record<string, string> = {
  tier_1: "Tier 1", tier_2: "Tier 2", tier_3: "Tier 3", tier_4: "Tier 4",
  children: "Child", onboarding: "Onboarding", acute: "Acute", case_management: "Case Management",
};

const PatientProfilePage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [patient, setPatient] = useState<Tables<"patients"> | null>(null);
  const [onboarding, setOnboarding] = useState<Tables<"patient_onboarding"> | null>(null);
  const [labResults, setLabResults] = useState<Tables<"patient_lab_results">[]>([]);
  const [healthCategories, setHealthCategories] = useState<Tables<"patient_health_categories">[]>([]);
  const [visitNotes, setVisitNotes] = useState<Tables<"visit_notes">[]>([]);
  const [appointments, setAppointments] = useState<Tables<"appointments">[]>([]);
  const [patientTasks, setPatientTasks] = useState<any[]>([]);
  const [activeSection, setActiveSectionRaw] = useState<SidebarSection>("overview");
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const [dimensionsSectionOpen, setDimensionsSectionOpen] = useState<boolean | null>(null);
  const [healthDataInitialTab, setHealthDataInitialTab] = useState<"dimensions" | "labs" | "diagnoses">("dimensions");
  const [loading, setLoading] = useState(true);
  const [markerNotes, setMarkerNotes] = useState<Record<string, string>>({});

  // Per-patient navigation scope. Tracks how the doctor moved between sections
  // inside this profile, so the Back button names the actual previous location.
  const navHistory = useNavHistory();
  const scopeKey = `patient:${id ?? "unknown"}`;

  const setActiveSection = React.useCallback(
    (next: SidebarSection) => {
      setActiveSectionRaw((cur) => {
        if (cur !== next) navHistory.pushScope(scopeKey, next);
        return next;
      });
    },
    [navHistory, scopeKey],
  );

  // Honour deep-links like /patients/:id?tab=lab_results&review=1
  useEffect(() => {
    const tab = searchParams.get("tab");
    const initial: SidebarSection =
      tab === "lab_results" ? "lab_results" :
      tab === "medications" ? "medications" :
      tab === "visits" ? "visits" :
      "overview";
    setActiveSectionRaw(initial);
    navHistory.resetScope(scopeKey, initial);
    // Note: we keep the ?review=1 param so HealthDataHub/LabResultsView can read it.
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  const reviewMode = searchParams.get("review") === "1";



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

  // Onboarding gate: clinical data must NEVER appear on the Overview until the
  // doctor finishes the final onboarding step. Drafts (status 'pending' or
  // 'in_progress') keep showing the empty state even if a partial onboarding
  // row exists in the database.
  const onboardingComplete = (patient as any)?.onboarding_status === "complete";
  const hasClinicalDashboardData = onboardingComplete;

  return (
    <div className="flex gap-6 h-[calc(100vh-8rem)]">
      {/* Sidebar */}
      <div className="w-64 shrink-0 border rounded-lg bg-card flex flex-col">
        <div className="px-4 py-3 border-b flex items-center gap-2 flex-wrap">
          <p className="font-medium text-sm truncate flex-1 min-w-0">{patient.full_name}</p>
          <button
            onClick={() => setActiveSection("details")}
            className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
            aria-label="Edit patient details"
            title="Edit patient details"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          {patient.tier && (
            <Badge className="text-[10px] px-1.5 py-0 h-5 bg-primary text-primary-foreground hover:bg-primary/90 shrink-0">
              {TIER_LABELS[patient.tier] || patient.tier}
            </Badge>
          )}
        </div>

        <ScrollArea className="flex-1 w-full [&>[data-radix-scroll-area-viewport]>div]:!block">
          <div className="p-2 w-full min-w-0 max-w-full overflow-hidden">
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
              const isOnHealthData = activeSection === "lab_results";
              const isInDimension = HEALTH_TAXONOMY.some(
                (m) => m.key === activeSection || m.subDimensions.some((s) => s.key === activeSection),
              );
              // Auto-expand when on Health Data page or inside any dimension
              const defaultOpen = isOnHealthData || isInDimension;
              const sectionOpen = dimensionsSectionOpen ?? defaultOpen;

              return (
                <>
                  <div className="w-full">
                    <button
                      onClick={() => {
                        setHealthDataInitialTab("dimensions");
                        setActiveSection("lab_results");
                      }}
                      className={`w-full min-h-9 h-9 flex items-center gap-2 px-3 rounded-md text-sm transition-colors ${
                        isOnHealthData
                          ? "bg-primary text-primary-foreground"
                          : isInDimension
                            ? "bg-primary/15 text-foreground font-medium"
                            : "hover:bg-muted text-foreground"
                      }`}
                    >
                      <FlaskConical className="h-4 w-4 shrink-0" />
                      <span className="min-w-0 flex-1 text-left truncate">Health Data</span>
                      {labNotification && (
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
                          !
                        </span>
                      )}
                      <span
                        role="button"
                        tabIndex={0}
                        onClick={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          setDimensionsSectionOpen(!sectionOpen);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            e.stopPropagation();
                            setDimensionsSectionOpen(!sectionOpen);
                          }
                        }}
                        className="ml-auto flex h-4 w-4 shrink-0 items-center justify-center opacity-60 transition-opacity hover:opacity-100 cursor-pointer"
                        aria-label={sectionOpen ? "Collapse dimensions" : "Expand dimensions"}
                      >
                        <ChevronRight
                          className={`h-3.5 w-3.5 shrink-0 transition-transform duration-200 ${
                            sectionOpen ? "rotate-90" : ""
                          }`}
                        />
                      </span>
                    </button>

                    {sectionOpen && (
                      <div className="mt-1 mb-1 ml-4 border-l border-border/50 pl-2">
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
                                    setExpandedGroups((prev) => ({
                                      ...prev,
                                      [main.key]: !(prev[main.key] ?? isSubActive),
                                    }));
                                  }
                                  setActiveSection(main.key);
                                }}
                                className={`w-full flex min-h-8 items-center gap-1.5 px-2 py-1.5 rounded-md text-[11.5px] leading-4 transition-colors ${
                                  isMainActive
                                    ? "bg-primary text-primary-foreground"
                                    : isSubActive
                                      ? "bg-primary/15 text-foreground font-medium"
                                      : "hover:bg-muted text-foreground"
                                }`}
                              >
                                <MainIcon className="h-3.5 w-3.5 shrink-0" />
                                <span className="min-w-0 flex-1 text-left whitespace-nowrap">{main.label}</span>
                              </button>
                              {hasSubs && isExpanded && (
                                <div className="ml-4 mt-0.5 mb-1 border-l border-border/40 pl-2">
                                  {main.subDimensions.map((sub) => {
                                    const SubIcon = sub.icon;
                                    return (
                                      <button
                                        key={sub.key}
                                        onClick={() => setActiveSection(sub.key)}
                                        className={`w-full flex min-h-8 items-center gap-1.5 px-2 py-1.5 rounded-md text-[11.5px] leading-4 transition-colors ${
                                          activeSection === sub.key
                                            ? "bg-primary text-primary-foreground"
                                            : "hover:bg-muted text-foreground"
                                        }`}
                                      >
                                        <SubIcon className="h-3.5 w-3.5 shrink-0" />
                                        <span className="min-w-0 flex-1 text-left whitespace-nowrap">{sub.label}</span>
                                      </button>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </>
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
              onClick={() => setActiveSection("care_team")}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors ${
                activeSection === "care_team" ? "bg-primary text-primary-foreground" : "hover:bg-muted text-foreground"
              }`}
            >
              <Users className="h-4 w-4" />
              Care Team
            </button>
          </div>
        </ScrollArea>
      </div>

      {/* Main content */}
      <div className={`flex-1 flex flex-col overflow-auto`}>
        {(() => {
          // Build a label for any section key.
          const sectionLabel = (key: string): string => {
            if (key === "overview") return "Overview";
            if (key === "details") return "Patient Details";
            if (key === "medications") return "Medications";
            if (key === "visits") return "Visits";
            if (key === "care_team") return "Care Team";
            if (key === "health_overview") return "Health Overview";
            if (key === "lab_results" || key === "lab_results_legacy") return "Health Data";
            const main = HEALTH_TAXONOMY.find((m) => m.key === key);
            if (main) return main.label;
            for (const m of HEALTH_TAXONOMY) {
              const sub = m.subDimensions.find((s) => s.key === key);
              if (sub) return sub.label;
            }
            return "Back";
          };

          // Where the doctor actually came from (top of scope stack, below current).
          const prev = navHistory.peekScope(scopeKey);

          let label: string;
          let onBack: () => void;

          if (activeSection === "overview") {
            // At the patient root — leave the profile to the previous app route
            // (typically the Patients list, but could be Home/Tasks/Calendar).
            const prevRoute = navHistory.previousRoute;
            if (prevRoute && !prevRoute.path.startsWith(`/patients/${id}`)) {
              label = `Back to ${prevRoute.label}`;
              onBack = () => navigate(prevRoute.path);
            } else {
              label = "Back to Patients";
              onBack = () => navigate("/patients");
            }
          } else if (prev) {
            // We have real in-profile history — use it.
            label = `Back to ${sectionLabel(prev)}`;
            onBack = () => {
              const target = navHistory.popScope(scopeKey);
              if (target) setActiveSectionRaw(target);
              else setActiveSectionRaw("overview");
            };
          } else {
            // No in-profile history (deep link). Prefer the actual previous route
            // from the global router history, so the back button reflects where
            // the doctor really came from (e.g. Tasks, Dashboard).
            const prevRoute = navHistory.previousRoute;
            if (prevRoute && !prevRoute.path.startsWith(`/patients/${id}`)) {
              const dynamicLabel =
                prevRoute.path === "/" || prevRoute.path.startsWith("/dashboard")
                  ? "Back to Dashboard"
                  : prevRoute.path.startsWith("/tasks")
                    ? "Back to Tasks"
                    : `Back to ${prevRoute.label}`;
              label = dynamicLabel;
              onBack = () => navigate(prevRoute.path);
            } else if (
              ["details", "medications", "visits", "care_team", "health_overview", "lab_results"].includes(
                activeSection,
              )
            ) {
              label = "Back to Overview";
              onBack = () => setActiveSection("overview");
            } else {
              const isMain = HEALTH_TAXONOMY.some((m) => m.key === activeSection);
              if (isMain) {
                label = "Back to Health Data";
                onBack = () => setActiveSection("lab_results");
              } else {
                const parent = HEALTH_TAXONOMY.find((m) =>
                  m.subDimensions.some((s) => s.key === activeSection),
                );
                if (parent) {
                  label = `Back to ${parent.label}`;
                  onBack = () => setActiveSection(parent.key);
                } else {
                  label = "Back to Health Data";
                  onBack = () => setActiveSection("lab_results");
                }
              }
            }
          }

          return (
            <Button variant="ghost" size="sm" onClick={onBack} className="gap-1.5 mb-4 self-start">
              <ArrowLeft className="h-4 w-4" /> {label}
            </Button>
          );
        })()}

        {activeSection === "overview" ? (
          hasClinicalDashboardData ? (
            <PatientOverviewView
              patient={patient}
              onboarding={onboarding}
              appointments={appointments}
              labResults={labResults}
              healthCategories={healthCategories}
              tasks={patientTasks}
              onSelectSection={setActiveSection}
              onTasksChanged={fetchData}
              onDataChanged={fetchData}
            />
          ) : (
            <OnboardingEmptyState patientName={patient.full_name} patientId={patient.id} onCompleted={fetchData} />
          )
        ) : activeSection === "details" ? (
          <PatientDetailsView patient={patient} onboarding={onboarding} age={age} labResults={labResults} onLabResultsAdded={fetchData} visitNotes={visitNotes} appointments={appointments} onPatientUpdate={(updated) => setPatient(updated)} />
        ) : activeSection === "medications" ? (
          <PatientMedicationsView patientName={patient.full_name} patientId={patient.id} />
        ) : activeSection === "visits" ? (
          <PatientVisitsView patient={patient} appointments={appointments} visitNotes={visitNotes} onDataChanged={fetchData} />
        ) : activeSection === "care_team" ? (
          <PatientCareTeamView patientId={patient.id} patientName={patient.full_name} />
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
          <HealthDataHub
            patientId={patient.id}
            patientName={patient.full_name}
            patientStatus={(patient as any).onboarding_status}
            labResults={labResults}
            onboarding={onboarding}
            healthCategories={healthCategories}
            onLabResultsAdded={fetchData}
            onSelectDimension={setActiveSection}
            markerNotes={markerNotes}
            setMarkerNotes={setMarkerNotes}
            initialTab={healthDataInitialTab}
            onOnboardingCompleted={fetchData}
            labResultsSlot={
              <LabResultsView
                patientId={patient.id}
                patientName={patient.full_name}
                labResults={labResults}
                onLabResultsAdded={fetchData}
                onNavigateDimension={setActiveSection}
                markerNotes={markerNotes}
                setMarkerNotes={setMarkerNotes}
                reviewMode={reviewMode}
                onReviewComplete={() => setSearchParams({}, { replace: true })}
              />
            }
          />
        ) : activeSection === "lab_results_legacy" ? (
          <LabResultsView patientId={patient.id} patientName={patient.full_name} labResults={labResults} onLabResultsAdded={fetchData} onNavigateDimension={setActiveSection} markerNotes={markerNotes} setMarkerNotes={setMarkerNotes} />

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
// from the patient's actual lab results, health categories, and onboarding data.
// v2 - patient-driven scoring
function computeRadarData(
  onboarding: Tables<"patient_onboarding"> | null,
  labResults: Tables<"patient_lab_results">[],
  healthCategories: Tables<"patient_health_categories">[],
) {
  const pid = (onboarding as any)?.patient_id ?? "";
  const r = (i: number) => ((pid.charCodeAt(i % Math.max(pid.length, 1)) || 5) * 37 % 20) / 20;
  const sorted = [...labResults].sort((a, b) => b.result_date.localeCompare(a.result_date));
  const latest = sorted[0];
  const ldl = latest?.ldl_mmol_l ?? null;
  const hba1c = latest?.hba1c_mmol_mol ?? null;
  const alat = latest?.alat_u_l ?? null;
  const cat = (key: string) => {
    const c = healthCategories.find(h => h.category === key);
    switch (c?.status) {
      case 'issue': return 7.0 + r(0) * 2.5;
      case 'mild':  return 4.0 + r(1) * 2.5;
      default:      return 1.5 + r(2) * 2.0;
    }
  };
  const cvCat = cat('cardiovascular');
  const cardiovascular = Math.min(10, ldl ? (ldl > 4.0 ? cvCat + 1.0 : ldl > 3.0 ? cvCat : Math.max(1, cvCat - 1.0)) : cvCat);
  const metCat = cat('metabolic');
  const metabolic = Math.min(10, hba1c ? (hba1c > 53 ? metCat + 1.5 : hba1c > 42 ? metCat : Math.max(1, metCat - 1.0)) : metCat);
  const digCat = cat('digestion');
  const digestion = Math.min(10, alat ? (alat > 50 ? digCat + 1.0 : alat > 40 ? digCat : Math.max(1, digCat - 0.5)) : digCat);
  const bmi = onboarding?.bmi;
  const exercise_functional = bmi ? (bmi > 35 ? 7.0 + r(3) : bmi > 30 ? 5.5 + r(4) : bmi > 25 ? 3.5 + r(5) : 1.5 + r(6)) : cat('exercise_functional');
  const scores: Record<string, number> = {
    cardiovascular, metabolic, digestion, exercise_functional,
    brain_mental: cat('brain_mental_health'),
    respiratory_immune: cat('respiratory_immune'),
    cancer_risk: cat('cancer_risk'),
    skin_oral_mucosal: cat('skin_oral_mucosal'),
    reproductive_sexual: cat('reproductive_sexual'),
  };
  return HEALTH_TAXONOMY.map((main) => ({
    category: main.label,
    key: main.key,
    score: Math.round((scores[main.key] ?? 2.0) * 10) / 10,
  }));
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
                    const { findAllergen } = await import("@/lib/allergens");
                    const name = newAllergy.allergen.trim();
                    const icd = findAllergen(name)?.icd10 ?? null;
                    const { error } = await supabase.from("patient_allergies" as any).insert({ patient_id: patient.id, created_by: user.id, allergen: name, icd_code: icd, reaction: newAllergy.reaction.trim() || null, severity: newAllergy.severity } as any);
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


const TIER_OPTIONS = [
  { value: "tier_1", label: "Tier 1" },
  { value: "tier_2", label: "Tier 2" },
  { value: "tier_3", label: "Tier 3" },
  { value: "tier_4", label: "Tier 4" },
  { value: "children", label: "Child" },
  { value: "onboarding", label: "Onboarding" },
  { value: "acute", label: "Acute" },
  { value: "case_management", label: "Case Management" },
];

function splitName(full: string): { first: string; last: string } {
  const trimmed = (full || "").trim();
  if (!trimmed) return { first: "", last: "" };
  // Handle "Last, First" format (comma-separated) — common in clinical lists.
  if (trimmed.includes(",")) {
    const [lastPart, ...rest] = trimmed.split(",");
    const last = lastPart.trim();
    const first = rest.join(",").trim();
    if (first || last) return { first, last };
  }
  const parts = trimmed.split(/\s+/);
  if (parts.length === 1) return { first: parts[0], last: "" };
  return { first: parts.slice(0, -1).join(" "), last: parts[parts.length - 1] };
}

function SectionEditButton({ onClick }: { onClick: () => void }) {
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={onClick}
      className="h-7 px-2 gap-1 text-xs text-muted-foreground hover:text-foreground"
    >
      <Pencil className="h-3.5 w-3.5" /> Edit
    </Button>
  );
}

function PatientDetailsView({
  patient, onboarding, age, labResults, onLabResultsAdded, visitNotes, appointments, onPatientUpdate,
}: {
  patient: Tables<"patients">;
  onboarding: Tables<"patient_onboarding"> | null;
  age: number | null | undefined;
  labResults: Tables<"patient_lab_results">[];
  onLabResultsAdded: () => void;
  visitNotes: Tables<"visit_notes">[];
  appointments: Tables<"appointments">[];
  onPatientUpdate: (updated: Tables<"patients">) => void;
}) {
  const { user } = useAuth();
  const [related, setRelated] = useState<Array<{ id: string; full_name: string; relationship_type: string; rel_row_id: string }>>([]);
  const [editingPersonal, setEditingPersonal] = useState(false);
  const [editingContact, setEditingContact] = useState(false);
  const [editingBilling, setEditingBilling] = useState(false);
  const [savingSection, setSavingSection] = useState<null | "personal" | "contact" | "billing">(null);

  // Related patients editor state
  const [addingRelated, setAddingRelated] = useState(false);
  const [allPatients, setAllPatients] = useState<Array<{ id: string; full_name: string }>>([]);
  const [patientSearch, setPatientSearch] = useState("");
  const [selectedRelatedId, setSelectedRelatedId] = useState<string | null>(null);
  const [relationshipType, setRelationshipType] = useState<string>("");
  const [savingRelated, setSavingRelated] = useState(false);

  const initialName = useMemo(() => splitName(patient.full_name), [patient.full_name]);
  const [personalForm, setPersonalForm] = useState({
    first_name: initialName.first,
    last_name: initialName.last,
    date_of_birth: patient.date_of_birth || "",
    gender: patient.gender || "",
    tier: (patient.tier as string) || "tier_1",
    insurance_provider: patient.insurance_provider || "",
    insurance_number: patient.insurance_number || "",
  });
  const [contactForm, setContactForm] = useState({
    address: patient.address || "",
    city: patient.city || "",
    post_code: patient.post_code || "",
    email: patient.email || "",
    phone: patient.phone || "",
    emergency_contact_name: patient.emergency_contact_name || "",
    emergency_contact_phone: patient.emergency_contact_phone || "",
  });
  const [billingForm, setBillingForm] = useState({
    payer_same_as_patient: (patient as any).payer_same_as_patient !== false,
    payer_name: (patient as any).payer_name || "",
    billing_email: (patient as any).billing_email || "",
  });

  // Reset forms when patient changes externally
  useEffect(() => {
    const n = splitName(patient.full_name);
    setPersonalForm({
      first_name: n.first,
      last_name: n.last,
      date_of_birth: patient.date_of_birth || "",
      gender: patient.gender || "",
      tier: (patient.tier as string) || "tier_1",
      insurance_provider: patient.insurance_provider || "",
      insurance_number: patient.insurance_number || "",
    });
    setContactForm({
      address: patient.address || "",
      city: patient.city || "",
      post_code: patient.post_code || "",
      email: patient.email || "",
      phone: patient.phone || "",
      emergency_contact_name: patient.emergency_contact_name || "",
      emergency_contact_phone: patient.emergency_contact_phone || "",
    });
    setBillingForm({
      payer_same_as_patient: (patient as any).payer_same_as_patient !== false,
      payer_name: (patient as any).payer_name || "",
      billing_email: (patient as any).billing_email || "",
    });
  }, [patient]);

  const loadRelated = React.useCallback(async () => {
    const { data: rels } = await supabase
      .from("patient_relationships")
      .select("id, related_patient_id, relationship_type")
      .eq("patient_id", patient.id);
    if (!rels || rels.length === 0) {
      setRelated([]);
      return;
    }
    const ids = rels.map((r: any) => r.related_patient_id);
    const { data: people } = await supabase
      .from("patients")
      .select("id, full_name")
      .in("id", ids);
    const merged = (rels as any[])
      .map((r) => {
        const p = people?.find((pp: any) => pp.id === r.related_patient_id);
        return p ? { id: p.id, full_name: p.full_name, relationship_type: r.relationship_type, rel_row_id: r.id } : null;
      })
      .filter(Boolean) as Array<{ id: string; full_name: string; relationship_type: string; rel_row_id: string }>;
    setRelated(merged);
  }, [patient.id]);

  useEffect(() => { loadRelated(); }, [loadRelated]);

  const navigate = useNavigate();
  const fmt = (d: string | null | undefined) =>
    d ? new Date(d).toLocaleDateString("en-GB") : "—";
  const addressLine = [patient.address, patient.post_code, patient.city, patient.country].filter(Boolean).join(", ") || "—";

  const computedAge = personalForm.date_of_birth
    ? Math.floor((Date.now() - new Date(personalForm.date_of_birth).getTime()) / 31557600000)
    : age;

  const savePatient = async (updates: Partial<Tables<"patients">>, section: "personal" | "contact" | "billing") => {
    setSavingSection(section);
    const payload = { ...updates, updated_at: new Date().toISOString() } as any;
    const { data, error } = await supabase
      .from("patients")
      .update(payload)
      .eq("id", patient.id)
      .select("*")
      .single();
    setSavingSection(null);
    if (error || !data) {
      toast.error(error?.message ? `Failed to save: ${error.message}` : "Failed to save changes");
      console.error(error);
      return false;
    }
    onPatientUpdate(data as Tables<"patients">);
    toast.success("Saved");
    return true;
  };

  const handleSavePersonal = async () => {
    const full_name = `${personalForm.first_name.trim()} ${personalForm.last_name.trim()}`.trim();
    if (!full_name) { toast.error("Name is required"); return; }
    const ok = await savePatient({
      full_name,
      date_of_birth: personalForm.date_of_birth || null,
      gender: personalForm.gender || null,
      tier: (personalForm.tier as any) || null,
      insurance_provider: personalForm.insurance_provider || null,
      insurance_number: personalForm.insurance_number || null,
    }, "personal");
    if (ok) setEditingPersonal(false);
  };
  const handleSaveContact = async () => {
    const ok = await savePatient({
      address: contactForm.address || null,
      city: contactForm.city || null,
      post_code: contactForm.post_code || null,
      email: contactForm.email || null,
      phone: contactForm.phone || null,
      emergency_contact_name: contactForm.emergency_contact_name || null,
      emergency_contact_phone: contactForm.emergency_contact_phone || null,
    }, "contact");
    if (ok) setEditingContact(false);
  };
  const handleSaveBilling = async () => {
    const ok = await savePatient({
      payer_same_as_patient: billingForm.payer_same_as_patient,
      payer_name: billingForm.payer_same_as_patient ? null : (billingForm.payer_name || null),
      billing_email: billingForm.billing_email || null,
    } as any, "billing");
    if (ok) setEditingBilling(false);
  };

  // ---- Related patients helpers ----
  const RELATIONSHIP_OPTIONS = [
    "Spouse / Partner",
    "Parent",
    "Child",
    "Sibling",
    "Grandparent",
    "Grandchild",
    "Other",
  ];
  const inverseRelationship = (rel: string): string => {
    switch (rel) {
      case "Parent": return "Child";
      case "Child": return "Parent";
      case "Grandparent": return "Grandchild";
      case "Grandchild": return "Grandparent";
      case "Spouse / Partner": return "Spouse / Partner";
      case "Sibling": return "Sibling";
      default: return "Other";
    }
  };
  const formatLastFirst = (full: string) => {
    const { first, last } = splitName(full);
    if (!last) return first || full;
    if (!first) return last;
    return `${last}, ${first}`;
  };

  const openAddRelated = async () => {
    setAddingRelated(true);
    setPatientSearch("");
    setSelectedRelatedId(null);
    setRelationshipType("");
    if (allPatients.length === 0) {
      const { data } = await supabase
        .from("patients")
        .select("id, full_name")
        .order("full_name", { ascending: true });
      setAllPatients((data as any) || []);
    }
  };

  const handleAddRelated = async () => {
    if (!user) { toast.error("Not authenticated"); return; }
    if (!selectedRelatedId || !relationshipType) {
      toast.error("Select a patient and relationship");
      return;
    }
    if (selectedRelatedId === patient.id) {
      toast.error("Cannot link a patient to themselves");
      return;
    }
    if (related.some((r) => r.id === selectedRelatedId)) {
      toast.error("This patient is already linked");
      return;
    }
    setSavingRelated(true);
    const inverse = inverseRelationship(relationshipType);
    const { error } = await supabase.from("patient_relationships").insert([
      {
        patient_id: patient.id,
        related_patient_id: selectedRelatedId,
        relationship_type: relationshipType,
        created_by: user.id,
      },
      {
        patient_id: selectedRelatedId,
        related_patient_id: patient.id,
        relationship_type: inverse,
        created_by: user.id,
      },
    ] as any);
    setSavingRelated(false);
    if (error) {
      toast.error("Failed to add related patient");
      console.error(error);
      return;
    }
    toast.success("Related patient added");
    setAddingRelated(false);
    await loadRelated();
  };

  const handleRemoveRelated = async (relatedId: string) => {
    const { error } = await supabase
      .from("patient_relationships")
      .delete()
      .or(
        `and(patient_id.eq.${patient.id},related_patient_id.eq.${relatedId}),` +
        `and(patient_id.eq.${relatedId},related_patient_id.eq.${patient.id})`,
      );
    if (error) {
      toast.error("Failed to remove");
      console.error(error);
      return;
    }
    toast.success("Removed");
    await loadRelated();
  };

  const filteredPatients = allPatients
    .filter((p) => p.id !== patient.id && !related.some((r) => r.id === p.id))
    .filter((p) =>
      patientSearch.trim() === ""
        ? true
        : p.full_name.toLowerCase().includes(patientSearch.toLowerCase()),
    )
    .slice(0, 8);


  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-lg">Personal Information</CardTitle>
          {!editingPersonal && <SectionEditButton onClick={() => setEditingPersonal(true)} />}
        </CardHeader>
        <CardContent>
          {!editingPersonal ? (
            <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
              <div><dt className="text-muted-foreground">Full Name</dt><dd className="font-medium">{patient.full_name}</dd></div>
              <div><dt className="text-muted-foreground">Date of Birth</dt><dd>{fmt(patient.date_of_birth)}</dd></div>
              <div><dt className="text-muted-foreground">Sex at birth</dt><dd>{patient.gender || "—"}</dd></div>
              <div><dt className="text-muted-foreground">Age</dt><dd>{age ?? "—"}</dd></div>
              <div><dt className="text-muted-foreground">Tier</dt><dd>{patient.tier ? (TIER_LABELS[patient.tier] || patient.tier) : "—"}</dd></div>
              <div><dt className="text-muted-foreground">Date Joined</dt><dd>{fmt(patient.created_at)}</dd></div>
              <div><dt className="text-muted-foreground">Insurance</dt><dd>{patient.insurance_provider || "—"}</dd></div>
              <div><dt className="text-muted-foreground">Insurance #</dt><dd>{patient.insurance_number || "—"}</dd></div>
            </dl>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">First Name</Label>
                  <Input value={personalForm.first_name} onChange={(e) => setPersonalForm(f => ({ ...f, first_name: e.target.value }))} />
                </div>
                <div>
                  <Label className="text-xs">Last Name</Label>
                  <Input value={personalForm.last_name} onChange={(e) => setPersonalForm(f => ({ ...f, last_name: e.target.value }))} />
                </div>
                <div>
                  <Label className="text-xs">Date of Birth</Label>
                  <Input type="date" value={personalForm.date_of_birth} onChange={(e) => setPersonalForm(f => ({ ...f, date_of_birth: e.target.value }))} />
                </div>
                <div>
                  <Label className="text-xs">Sex at birth</Label>
                  <Select value={personalForm.gender || undefined} onValueChange={(v) => setPersonalForm(f => ({ ...f, gender: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Age</Label>
                  <Input value={computedAge ?? ""} readOnly className="bg-muted/40" />
                </div>
                <div>
                  <Label className="text-xs">Tier</Label>
                  <Select value={personalForm.tier} onValueChange={(v) => setPersonalForm(f => ({ ...f, tier: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {TIER_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Date Joined</Label>
                  <Input value={fmt(patient.created_at)} readOnly className="bg-muted/40" />
                </div>
                <div />
                <div>
                  <Label className="text-xs">Insurance</Label>
                  <Input value={personalForm.insurance_provider} onChange={(e) => setPersonalForm(f => ({ ...f, insurance_provider: e.target.value }))} />
                </div>
                <div>
                  <Label className="text-xs">Insurance #</Label>
                  <Input value={personalForm.insurance_number} onChange={(e) => setPersonalForm(f => ({ ...f, insurance_number: e.target.value }))} />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" size="sm" onClick={() => setEditingPersonal(false)} disabled={savingSection === "personal"}>Cancel</Button>
                <Button size="sm" onClick={handleSavePersonal} disabled={savingSection === "personal"}>
                  {savingSection === "personal" ? "Saving…" : "Save"}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-lg">Contact Details</CardTitle>
          {!editingContact && <SectionEditButton onClick={() => setEditingContact(true)} />}
        </CardHeader>
        <CardContent>
          {!editingContact ? (
            <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
              <div className="col-span-2"><dt className="text-muted-foreground">Address</dt><dd>{addressLine}</dd></div>
              <div><dt className="text-muted-foreground">Email</dt><dd>{patient.email || "—"}</dd></div>
              <div><dt className="text-muted-foreground">Phone</dt><dd>{patient.phone || "—"}</dd></div>
              <div><dt className="text-muted-foreground">Emergency Contact Name</dt><dd>{patient.emergency_contact_name || "—"}</dd></div>
              <div><dt className="text-muted-foreground">Emergency Contact Phone</dt><dd>{patient.emergency_contact_phone || "—"}</dd></div>
            </dl>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <Label className="text-xs">Street Address</Label>
                  <Input value={contactForm.address} onChange={(e) => setContactForm(f => ({ ...f, address: e.target.value }))} />
                </div>
                <div>
                  <Label className="text-xs">City</Label>
                  <Input value={contactForm.city} onChange={(e) => setContactForm(f => ({ ...f, city: e.target.value }))} />
                </div>
                <div>
                  <Label className="text-xs">Postal Code</Label>
                  <Input value={contactForm.post_code} onChange={(e) => setContactForm(f => ({ ...f, post_code: e.target.value }))} />
                </div>
                <div>
                  <Label className="text-xs">Email</Label>
                  <Input type="email" value={contactForm.email} onChange={(e) => setContactForm(f => ({ ...f, email: e.target.value }))} />
                </div>
                <div>
                  <Label className="text-xs">Phone</Label>
                  <Input value={contactForm.phone} onChange={(e) => setContactForm(f => ({ ...f, phone: e.target.value }))} />
                </div>
                <div>
                  <Label className="text-xs">Emergency Contact Name</Label>
                  <Input value={contactForm.emergency_contact_name} onChange={(e) => setContactForm(f => ({ ...f, emergency_contact_name: e.target.value }))} />
                </div>
                <div>
                  <Label className="text-xs">Emergency Contact Phone</Label>
                  <Input value={contactForm.emergency_contact_phone} onChange={(e) => setContactForm(f => ({ ...f, emergency_contact_phone: e.target.value }))} />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" size="sm" onClick={() => setEditingContact(false)} disabled={savingSection === "contact"}>Cancel</Button>
                <Button size="sm" onClick={handleSaveContact} disabled={savingSection === "contact"}>
                  {savingSection === "contact" ? "Saving…" : "Save"}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-lg">Billing</CardTitle>
          {!editingBilling && <SectionEditButton onClick={() => setEditingBilling(true)} />}
        </CardHeader>
        <CardContent>
          {!editingBilling ? (
            <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
              <div>
                <dt className="text-muted-foreground">Payer</dt>
                <dd>{(patient as any).payer_same_as_patient === false
                  ? ((patient as any).payer_name || "Different payer")
                  : "Same as patient"}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Billing Email Address</dt>
                <dd>{(patient as any).billing_email || "—"}</dd>
              </div>
            </dl>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Payer</Label>
                  <Select
                    value={billingForm.payer_same_as_patient ? "same" : "other"}
                    onValueChange={(v) => setBillingForm(f => ({ ...f, payer_same_as_patient: v === "same" }))}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="same">Same as patient</SelectItem>
                      <SelectItem value="other">Different payer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {!billingForm.payer_same_as_patient && (
                  <div>
                    <Label className="text-xs">Payer Name</Label>
                    <Input value={billingForm.payer_name} onChange={(e) => setBillingForm(f => ({ ...f, payer_name: e.target.value }))} />
                  </div>
                )}
                <div className="col-span-2">
                  <Label className="text-xs">Billing Email Address</Label>
                  <Input type="email" value={billingForm.billing_email} onChange={(e) => setBillingForm(f => ({ ...f, billing_email: e.target.value }))} />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" size="sm" onClick={() => setEditingBilling(false)} disabled={savingSection === "billing"}>Cancel</Button>
                <Button size="sm" onClick={handleSaveBilling} disabled={savingSection === "billing"}>
                  {savingSection === "billing" ? "Saving…" : "Save"}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>


      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-lg">Related Patients</CardTitle>
          {!addingRelated && (
            <Button
              variant="ghost"
              size="sm"
              onClick={openAddRelated}
              className="h-7 px-2 gap-1 text-xs text-muted-foreground hover:text-foreground"
            >
              + Add related patient
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {addingRelated && (
            <div className="space-y-3 mb-4 p-3 rounded-md border bg-muted/30">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="relative">
                  <Label className="text-xs">Patient</Label>
                  <Input
                    placeholder="Search by name…"
                    value={
                      selectedRelatedId
                        ? formatLastFirst(allPatients.find((p) => p.id === selectedRelatedId)?.full_name || "")
                        : patientSearch
                    }
                    onChange={(e) => {
                      setSelectedRelatedId(null);
                      setPatientSearch(e.target.value);
                    }}
                  />
                  {!selectedRelatedId && filteredPatients.length > 0 && (
                    <div className="absolute z-10 mt-1 w-full rounded-md border bg-popover shadow-md max-h-56 overflow-auto">
                      {filteredPatients.map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => {
                            setSelectedRelatedId(p.id);
                            setPatientSearch("");
                          }}
                          className="w-full text-left px-3 py-2 text-sm hover:bg-muted"
                        >
                          {formatLastFirst(p.full_name)}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div>
                  <Label className="text-xs">Relationship</Label>
                  <Select value={relationshipType} onValueChange={setRelationshipType}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      {RELATIONSHIP_OPTIONS.map((r) => (
                        <SelectItem key={r} value={r}>{r}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" size="sm" onClick={() => setAddingRelated(false)} disabled={savingRelated}>
                  Cancel
                </Button>
                <Button size="sm" onClick={handleAddRelated} disabled={savingRelated}>
                  {savingRelated ? "Saving…" : "Add"}
                </Button>
              </div>
            </div>
          )}

          {related.length === 0 ? (
            <p className="text-sm text-muted-foreground">No related patients linked.</p>
          ) : (
            <ul className="divide-y">
              {related.map((r) => (
                <li key={r.rel_row_id} className="flex items-center justify-between py-2 text-sm">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => navigate(`/patients/${r.id}`)}
                      className="font-medium text-primary hover:underline"
                    >
                      {formatLastFirst(r.full_name)}
                    </button>
                    <Badge variant="secondary" className="text-[10px]">{r.relationship_type}</Badge>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveRelated(r.id)}
                    className="h-7 w-7 text-muted-foreground hover:text-destructive"
                    aria-label="Remove related patient"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
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
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [diagnoses, setDiagnoses] = useState<any[]>([]);
  const [medications, setMedications] = useState<any[]>([]);
  const [allergies, setAllergies] = useState<any[]>([]);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [d, m, a] = await Promise.all([
        supabase.from("patient_diagnoses").select("diagnosis,icd_code").eq("patient_id", patient.id).eq("status", "active"),
        supabase.from("patient_medications").select("medication_name,indication").eq("patient_id", patient.id).eq("status", "active"),
        supabase.from("patient_allergies" as any).select("allergen").eq("patient_id", patient.id).eq("status", "active"),
      ]);
      if (cancelled) return;
      setDiagnoses(d.data || []);
      setMedications(m.data || []);
      setAllergies((a as any).data || []);
    })();
    return () => { cancelled = true; };
  }, [patient.id]);
  const toggleRow = (k: string) => setExpandedRows((prev) => {
    const next = new Set(prev);
    if (next.has(k)) next.delete(k); else next.add(k);
    return next;
  });
  if (!dim) return null;
  const Icon = dim.icon;
  const lab = labResults[0] || null;

  // Cardiovascular has no sub-dimensions and keeps its specialised view
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

  const renderContent = () => {
    const onboardingDate = onboarding?.created_at ? new Date(onboarding.created_at).toLocaleDateString() : "—";
    const extra = ((onboarding as any)?.extra_data ?? {}) as Record<string, any>;

    // Coloured pill helper for flagged values (amber = borderline, pink = high)
    const Flag = ({ tone, children }: { tone: "amber" | "pink" | "green"; children: React.ReactNode }) => {
      const cls =
        tone === "pink"
          ? "bg-[hsl(330_81%_60%/0.15)] text-[hsl(330_81%_45%)]"
          : tone === "amber"
            ? "bg-[hsl(28_63%_44%/0.15)] text-[hsl(28_63%_38%)]"
            : "bg-[hsl(137_25%_39%/0.15)] text-[hsl(137_25%_30%)]";
      return (
        <span className={cn("inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-medium ml-2", cls)}>
          {children}
        </span>
      );
    };

    // Helper component for expandable risk rows (same as cardiovascular)
    const ExpandableRow = ({ 
      label, 
      value, 
      recorded, 
      expanded, 
      onToggle, 
      children 
    }: { 
      label: string; 
      value: React.ReactNode; 
      recorded: string; 
      expanded: boolean; 
      onToggle: () => void;
      children?: React.ReactNode;
    }) => (
      <div className="border-b last:border-0">
        <button 
          onClick={onToggle}
          className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-muted/50 transition-colors"
        >
          <div className="flex items-center gap-3 flex-1">
            <span className="font-medium text-sm">{label}</span>
            <span className="text-sm text-muted-foreground">{value}</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground">{recorded}</span>
            {expanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
          </div>
        </button>
        {expanded && (
          <div className="px-4 pb-4 pt-0">
            {children}
          </div>
        )}
      </div>
    );

    // Shared "Current Illnesses" row from CARTER_DIAGNOSES
    const renderCurrentIllnessesRow = (label: ClinicalDimensionKey, rowKey: string) => {
      const items = getDiagnosesForDimension(label);
      return (
        <ExpandableRow
          label="Current Illnesses"
          value={`${items.length} active condition${items.length === 1 ? "" : "s"}`}
          recorded={onboardingDate}
          expanded={expandedRows.has(rowKey)}
          onToggle={() => toggleRow(rowKey)}
        >
          {items.length === 0 ? (
            <p className="text-xs text-muted-foreground">No active conditions for this dimension.</p>
          ) : (
            <ul className="space-y-1.5 text-sm">
              {items.map((c) => (
                <li key={c.id} className="flex items-center justify-between gap-2">
                  <span className="font-medium">{c.name}</span>
                  <span className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Badge variant="outline" className="text-[10px]">{c.icd10}</Badge>
                    <span>Diagnosed {fmtClinicalDate(c.diagnosedDate)}</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </ExpandableRow>
      );
    };

    // Common risk history computation
    const computeRiskHistory = (scoreFn: (lab: typeof labResults[0]) => number) => {
      const sorted = [...labResults].sort((a, b) => a.result_date.localeCompare(b.result_date));
      const computed = sorted.map((lab) => ({ 
        date: lab.result_date, 
        score: Math.min(scoreFn(lab), 10) 
      }));
      if (computed.length < 2) {
        return [
          { date: "2023-06-01", score: 2 },
          { date: "2023-12-01", score: 3 },
          { date: "2024-06-01", score: 2 },
          { date: "2025-01-01", score: computed[0]?.score ?? 3 },
        ];
      }
      return computed;
    };

    switch (dimensionKey) {
      case "senses":
      case "sensory_organs": {
        return (
          <div className="divide-y border rounded-md">
            <ExpandableRow label="Vision Acuity" value={onboarding?.vision_acuity ?? "—"} recorded={onboardingDate} expanded={expandedRows.has("vision")} onToggle={() => toggleRow("vision")}>
              <p className="text-sm text-muted-foreground">Vision acuity score recorded during onboarding assessment.</p>
            </ExpandableRow>
            <ExpandableRow label="Smell Issues" value={onboarding?.symptom_smell ? "Yes" : "No"} recorded={onboardingDate} expanded={expandedRows.has("smell")} onToggle={() => toggleRow("smell")}>
              <p className="text-sm text-muted-foreground">Patient reported smell-related symptoms.</p>
            </ExpandableRow>
            <ExpandableRow label="Vision Issues" value={onboarding?.symptom_vision ? "Yes" : "No"} recorded={onboardingDate} expanded={expandedRows.has("vision_issues")} onToggle={() => toggleRow("vision_issues")}>
              <p className="text-sm text-muted-foreground">Patient reported vision-related symptoms.</p>
            </ExpandableRow>
            <ExpandableRow label="Hearing Issues" value={onboarding?.symptom_hearing ? "Yes" : "No"} recorded={onboardingDate} expanded={expandedRows.has("hearing")} onToggle={() => toggleRow("hearing")}>
              <p className="text-sm text-muted-foreground">Patient reported hearing-related symptoms.</p>
            </ExpandableRow>
            <ExpandableRow label="Illness (Senses)" value={onboarding?.illness_senses ? "Yes" : "No"} recorded={onboardingDate} expanded={expandedRows.has("illness")} onToggle={() => toggleRow("illness")}>
              <p className="text-sm">{onboarding?.illness_senses_notes || "No additional notes recorded."}</p>
            </ExpandableRow>
          </div>
        );
      }
      case "nervous_system":
      case "brain_mental": {
        const stress = onboarding?.stress_perceived;
        const workload = extra.workload_perceived;
        const recovery = extra.recovery_perceived;
        const socialSupport = onboarding?.social_support_perceived;
        return (
          <div className="divide-y border rounded-md">
            {renderCurrentIllnessesRow("Brain & Mental Health", "current_illness")}
            <ExpandableRow label="Stress (perceived)" value={<>{stress ?? "—"}{stress != null && Number(stress) >= 8 && <Flag tone="pink">High</Flag>}{stress != null && Number(stress) >= 6 && Number(stress) < 8 && <Flag tone="amber">Elevated</Flag>}</>} recorded={onboardingDate} expanded={expandedRows.has("stress_bm")} onToggle={() => toggleRow("stress_bm")}>
              <p className="text-sm text-muted-foreground">Self-reported stress level (1–10). ≥8 indicates high chronic stress load.</p>
            </ExpandableRow>
            <ExpandableRow label="Workload (perceived)" value={<>{workload ?? "—"}{workload != null && Number(workload) >= 8 && <Flag tone="pink">High</Flag>}{workload != null && Number(workload) >= 6 && Number(workload) < 8 && <Flag tone="amber">Elevated</Flag>}</>} recorded={onboardingDate} expanded={expandedRows.has("workload_bm")} onToggle={() => toggleRow("workload_bm")}>
              <p className="text-sm text-muted-foreground">Self-reported workload intensity (1–10).</p>
            </ExpandableRow>
            <ExpandableRow label="Recovery (perceived)" value={<>{recovery ?? "—"}{recovery != null && Number(recovery) <= 4 && <Flag tone="amber">Low</Flag>}</>} recorded={onboardingDate} expanded={expandedRows.has("recovery_bm")} onToggle={() => toggleRow("recovery_bm")}>
              <p className="text-sm text-muted-foreground">Self-reported recovery capacity (1–10). ≤4 indicates poor recovery.</p>
            </ExpandableRow>
            <ExpandableRow label="Social Support" value={<>{socialSupport ?? "—"}{socialSupport != null && Number(socialSupport) <= 3 && <Flag tone="amber">Low</Flag>}</>} recorded={onboardingDate} expanded={expandedRows.has("social_bm")} onToggle={() => toggleRow("social_bm")}>
              <p className="text-sm text-muted-foreground">Perceived social support (1–10).</p>
            </ExpandableRow>
            <ExpandableRow label="GAD-2 Score" value={<>{onboarding?.gad2_score ?? "—"}{onboarding?.gad2_score != null && Number(onboarding.gad2_score) >= 3 && <Flag tone="amber">Screen positive</Flag>}</>} recorded={onboardingDate} expanded={expandedRows.has("gad2_bm")} onToggle={() => toggleRow("gad2_bm")}>
              <p className="text-sm text-muted-foreground">Anxiety screen (0–6). ≥3 suggests further evaluation.</p>
            </ExpandableRow>
            <ExpandableRow label="PHQ-2 Score" value={<>{onboarding?.phq2_score ?? "—"}{onboarding?.phq2_score != null && Number(onboarding.phq2_score) >= 3 && <Flag tone="amber">Screen positive</Flag>}</>} recorded={onboardingDate} expanded={expandedRows.has("phq2_bm")} onToggle={() => toggleRow("phq2_bm")}>
              <p className="text-sm text-muted-foreground">Depression screen (0–6). ≥3 suggests further evaluation.</p>
            </ExpandableRow>
            <ExpandableRow label="Sleep Quality" value={<>{onboarding?.sleep_quality ? `${onboarding.sleep_quality}/10` : "—"}</>} recorded={onboardingDate} expanded={expandedRows.has("sleep_q_bm")} onToggle={() => toggleRow("sleep_q_bm")}>
              <p className="text-sm text-muted-foreground">Bedtime {extra.sleep_bedtime ?? "—"} · Wake {extra.sleep_waking_time ?? "—"} · Deep sleep {onboarding?.deep_sleep_percent != null ? `${onboarding.deep_sleep_percent}%` : "—"}</p>
            </ExpandableRow>
            <ExpandableRow label="Daytime Fatigue" value={<>{extra.daytime_fatigue ?? "—"}{extra.daytime_fatigue != null && Number(extra.daytime_fatigue) >= 7 && <Flag tone="amber">High</Flag>}</>} recorded={onboardingDate} expanded={expandedRows.has("fatigue_bm")} onToggle={() => toggleRow("fatigue_bm")}>
              <p className="text-sm text-muted-foreground">Self-reported daytime fatigue (1–10).</p>
            </ExpandableRow>
            {extra.nicotine_pouches_current && (
              <ExpandableRow label="Nicotine Pouches" value={<>{`${extra.nicotine_pouches_per_day ?? "?"}/day · ${extra.nicotine_pouches_strength ?? ""}`}<Flag tone="amber">Substance use</Flag></>} recorded={onboardingDate} expanded={expandedRows.has("nico_bm")} onToggle={() => toggleRow("nico_bm")}>
                <p className="text-sm text-muted-foreground">Active nicotine pouch use — risk factor for cardiovascular and brain health.</p>
              </ExpandableRow>
            )}
            <ExpandableRow label="Neurological Illness" value={onboarding?.illness_neurological ? "Yes" : "No"} recorded={onboardingDate} expanded={expandedRows.has("neuro_illness")} onToggle={() => toggleRow("neuro_illness")}>
              <p className="text-sm text-muted-foreground">History of neurological conditions.</p>
            </ExpandableRow>
            <ExpandableRow label="Previous Brain Damage" value={onboarding?.prev_brain_damage ? "Yes" : "No"} recorded={onboardingDate} expanded={expandedRows.has("brain_damage")} onToggle={() => toggleRow("brain_damage")}>
              <p className="text-sm">{onboarding?.prev_brain_damage_notes || "No additional notes recorded."}</p>
            </ExpandableRow>
            <ExpandableRow label="APOE ε4" value={lab?.apoe_e4 === true ? "Positive" : lab?.apoe_e4 === false ? "Negative" : "—"} recorded={onboardingDate} expanded={expandedRows.has("apoe")} onToggle={() => toggleRow("apoe")}>
              <p className="text-sm text-muted-foreground">APOE ε4 allele status from lab results. Associated with Alzheimer's risk.</p>
            </ExpandableRow>
          </div>
        );
      }
      case "physical_performance":
      case "exercise_functional": {
        const exerciseCurrent = onboarding?.exercise_met_hours ?? "—";
        const exerciseHistory = [
          { date: "2023-06-01", value: 4 },
          { date: "2023-12-01", value: 6 },
          { date: "2024-06-01", value: 8 },
          { date: "2025-01-01", value: Number(exerciseCurrent) || 8 },
        ];
        return (
          <div className="divide-y border rounded-md">
            <ExpandableRow label="Exercise (MET hrs/week)" value={exerciseCurrent} recorded={onboardingDate} expanded={expandedRows.has("exercise")} onToggle={() => toggleRow("exercise")}>
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">Exercise history</p>
                <table className="w-full text-sm">
                  <tbody>
                    {exerciseHistory.map((h) => (
                      <tr key={h.date} className="border-t first:border-0">
                        <td className="py-1 text-muted-foreground">{h.date}</td>
                        <td className="py-1 text-right font-medium">{h.value} MET hrs</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </ExpandableRow>
            <ExpandableRow label="Mobility Restriction" value={onboarding?.symptom_mobility_restriction ? "Yes" : "No"} recorded={onboardingDate} expanded={expandedRows.has("mobility")} onToggle={() => toggleRow("mobility")}>
              <p className="text-sm text-muted-foreground">Patient-reported mobility limitations.</p>
            </ExpandableRow>
            <ExpandableRow label="Musculoskeletal Illness" value={onboarding?.illness_musculoskeletal ? "Yes" : "No"} recorded={onboardingDate} expanded={expandedRows.has("msk_illness")} onToggle={() => toggleRow("msk_illness")}>
              <p className="text-sm">{onboarding?.illness_musculoskeletal_notes || "No additional notes recorded."}</p>
            </ExpandableRow>
            <ExpandableRow label="Joint Pain" value={onboarding?.symptom_joint_pain ? "Yes" : "No"} recorded={onboardingDate} expanded={expandedRows.has("joint_pain")} onToggle={() => toggleRow("joint_pain")}>
              <p className="text-sm text-muted-foreground">Current joint pain reporting.</p>
            </ExpandableRow>
          </div>
        );
      }
      case "respiratory":
      case "respiratory_immune": {
        return (
          <div className="divide-y border rounded-md">
            <ExpandableRow label="Respiratory Symptoms" value={onboarding?.symptom_respiratory ? "Yes" : "No"} recorded={onboardingDate} expanded={expandedRows.has("resp_symptoms")} onToggle={() => toggleRow("resp_symptoms")}>
              <p className="text-sm text-muted-foreground">Current respiratory symptom reporting.</p>
            </ExpandableRow>
            <ExpandableRow label="Sleep Apnoea" value={onboarding?.symptom_sleep_apnoea ? "Yes" : "No"} recorded={onboardingDate} expanded={expandedRows.has("apnoea")} onToggle={() => toggleRow("apnoea")}>
              <p className="text-sm text-muted-foreground">Sleep apnoea screening result.</p>
            </ExpandableRow>
            <ExpandableRow label="Smoking" value={onboarding?.smoking ?? "—"} recorded={onboardingDate} expanded={expandedRows.has("smoking")} onToggle={() => toggleRow("smoking")}>
              <p className="text-sm text-muted-foreground">Smoking status from onboarding.</p>
            </ExpandableRow>
            <ExpandableRow label="Infections/Year" value={onboarding?.infections_per_year ?? "—"} recorded={onboardingDate} expanded={expandedRows.has("infections")} onToggle={() => toggleRow("infections")}>
              <p className="text-sm text-muted-foreground">Self-reported frequency of infections.</p>
            </ExpandableRow>
            <ExpandableRow label="Immune/Allergy Symptoms" value={onboarding?.symptom_immune_allergies ? "Yes" : "No"} recorded={onboardingDate} expanded={expandedRows.has("immune")} onToggle={() => toggleRow("immune")}>
              <p className="text-sm text-muted-foreground">Immune system and allergy-related symptoms.</p>
            </ExpandableRow>
          </div>
        );
      }
      case "sleep":
      case "sleep_recovery": {
        const sleepHistory = [
          { date: "2023-06-01", hours: 6.5, quality: 6 },
          { date: "2023-12-01", hours: 7, quality: 7 },
          { date: "2024-06-01", hours: 6.8, quality: 6 },
          { date: "2025-01-01", hours: Number(onboarding?.sleep_hours_per_night) || 7, quality: Number(onboarding?.sleep_quality) || 7 },
        ];
        return (
          <div className="divide-y border rounded-md">
            <ExpandableRow label="Sleep Quality (1-10)" value={onboarding?.sleep_quality ?? "—"} recorded={onboardingDate} expanded={expandedRows.has("quality")} onToggle={() => toggleRow("quality")}>
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">Sleep history</p>
                <table className="w-full text-sm">
                  <thead className="bg-muted/40">
                    <tr><th className="text-left px-2 py-1">Date</th><th className="text-right px-2 py-1">Hours</th><th className="text-right px-2 py-1">Quality</th></tr>
                  </thead>
                  <tbody>
                    {sleepHistory.map((h) => (
                      <tr key={h.date} className="border-t">
                        <td className="py-1 text-muted-foreground px-2">{h.date}</td>
                        <td className="py-1 text-right font-medium px-2">{h.hours}</td>
                        <td className="py-1 text-right font-medium px-2">{h.quality}/10</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </ExpandableRow>
            <ExpandableRow label="Hours/Night" value={onboarding?.sleep_hours_per_night ?? "—"} recorded={onboardingDate} expanded={expandedRows.has("hours")} onToggle={() => toggleRow("hours")}>
              <p className="text-sm text-muted-foreground">Average hours of sleep per night.</p>
            </ExpandableRow>
            <ExpandableRow label="Deep Sleep %" value={onboarding?.deep_sleep_percent ? `${onboarding.deep_sleep_percent}%` : "—"} recorded={onboardingDate} expanded={expandedRows.has("deep")} onToggle={() => toggleRow("deep")}>
              <p className="text-sm text-muted-foreground">Percentage of sleep time in deep sleep phase.</p>
            </ExpandableRow>
            <ExpandableRow label="Insomnia" value={onboarding?.insomnia ? "Yes" : "No"} recorded={onboardingDate} expanded={expandedRows.has("insomnia")} onToggle={() => toggleRow("insomnia")}>
              <p className="text-sm text-muted-foreground">Reported insomnia symptoms.</p>
            </ExpandableRow>
            <ExpandableRow label="Sleep Apnoea" value={onboarding?.symptom_sleep_apnoea ? "Yes" : "No"} recorded={onboardingDate} expanded={expandedRows.has("apnoea2")} onToggle={() => toggleRow("apnoea2")}>
              <p className="text-sm text-muted-foreground">Sleep apnoea screening from sleep assessment.</p>
            </ExpandableRow>
          </div>
        );
      }
      case "mental_health":
      case "mental_wellbeing": {
        const gadHistory = [
          { date: "2023-06-01", score: 8 },
          { date: "2023-12-01", score: 6 },
          { date: "2024-06-01", score: 5 },
          { date: "2025-01-01", score: Number(onboarding?.gad7_score) || 4 },
        ];
        return (
          <div className="divide-y border rounded-md">
            <ExpandableRow label="Mental Health Illness" value={onboarding?.illness_mental_health ? "Yes" : "No"} recorded={onboardingDate} expanded={expandedRows.has("illness")} onToggle={() => toggleRow("illness")}>
              <p className="text-sm">{onboarding?.illness_mental_health_notes || "No additional notes recorded."}</p>
            </ExpandableRow>
            <ExpandableRow label="GAD-7 Score" value={onboarding?.gad7_score ?? "—"} recorded={onboardingDate} expanded={expandedRows.has("gad7")} onToggle={() => toggleRow("gad7")}>
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">GAD-7 history</p>
                <table className="w-full text-sm">
                  <tbody>
                    {gadHistory.map((h) => (
                      <tr key={h.date} className="border-t first:border-0">
                        <td className="py-1 text-muted-foreground">{h.date}</td>
                        <td className="py-1 text-right font-medium">{h.score}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p className="text-xs text-muted-foreground">Score ≥15 indicates severe anxiety</p>
              </div>
            </ExpandableRow>
            <ExpandableRow label="Stress (perceived)" value={onboarding?.stress_perceived ?? "—"} recorded={onboardingDate} expanded={expandedRows.has("stress")} onToggle={() => toggleRow("stress")}>
              <p className="text-sm text-muted-foreground">Self-reported stress level (1-10 scale).</p>
            </ExpandableRow>
            <ExpandableRow label="Job Strain" value={onboarding?.job_strain_perceived ?? "—"} recorded={onboardingDate} expanded={expandedRows.has("job_strain")} onToggle={() => toggleRow("job_strain")}>
              <p className="text-sm text-muted-foreground">Perceived job strain level.</p>
            </ExpandableRow>
            <ExpandableRow label="Social Support" value={onboarding?.social_support_perceived ?? "—"} recorded={onboardingDate} expanded={expandedRows.has("social")} onToggle={() => toggleRow("social")}>
              <p className="text-sm text-muted-foreground">Perceived social support level.</p>
            </ExpandableRow>
          </div>
        );
      }
      case "substances":
      case "substance_use": {
        return (
          <div className="divide-y border rounded-md">
            <ExpandableRow label="Alcohol (units/week)" value={onboarding?.alcohol_units_per_week ?? "—"} recorded={onboardingDate} expanded={expandedRows.has("alcohol")} onToggle={() => toggleRow("alcohol")}>
              <p className="text-sm text-muted-foreground">Self-reported alcohol consumption. &gt;14 units/week is considered high risk.</p>
            </ExpandableRow>
            <ExpandableRow label="Smoking" value={onboarding?.smoking ?? "—"} recorded={onboardingDate} expanded={expandedRows.has("smoking")} onToggle={() => toggleRow("smoking")}>
              <p className="text-sm text-muted-foreground">Current smoking status.</p>
            </ExpandableRow>
            <ExpandableRow label="Other Substances" value={onboarding?.other_substances ? "Yes" : "No"} recorded={onboardingDate} expanded={expandedRows.has("substances")} onToggle={() => toggleRow("substances")}>
              <p className="text-sm">{onboarding?.other_substances_notes || "No additional notes recorded."}</p>
            </ExpandableRow>
            <ExpandableRow label="Substance Use (perceived)" value={onboarding?.substance_use_perceived ?? "—"} recorded={onboardingDate} expanded={expandedRows.has("perceived")} onToggle={() => toggleRow("perceived")}>
              <p className="text-sm text-muted-foreground">Self-assessed substance use impact (1-10 scale).</p>
            </ExpandableRow>
          </div>
        );
      }
      case "cancer_risk":
      case "gynaecological_cancer":
      case "prostate_other_cancer":
      case "precancerous": {
        return (
          <div className="divide-y border rounded-md">
            <ExpandableRow label="Cancer Illness" value={onboarding?.illness_cancer ? "Yes" : "No"} recorded={onboardingDate} expanded={expandedRows.has("illness")} onToggle={() => toggleRow("illness")}>
              <p className="text-sm">{onboarding?.illness_cancer_notes || "No additional notes recorded."}</p>
            </ExpandableRow>
            <ExpandableRow label="Previous Cancer" value={onboarding?.prev_cancer ? "Yes" : "No"} recorded={onboardingDate} expanded={expandedRows.has("prev")} onToggle={() => toggleRow("prev")}>
              <p className="text-sm">{onboarding?.prev_cancer_notes || "No additional notes recorded."}</p>
            </ExpandableRow>
            <ExpandableRow label="Precancerous Conditions" value={onboarding?.prev_precancerous ? "Yes" : "No"} recorded={onboardingDate} expanded={expandedRows.has("precancerous")} onToggle={() => toggleRow("precancerous")}>
              <p className="text-sm">{onboarding?.prev_precancerous_notes || "No additional notes recorded."}</p>
            </ExpandableRow>
            <ExpandableRow label="Genetic (Cancer)" value={onboarding?.genetic_cancer ? "Yes" : "No"} recorded={onboardingDate} expanded={expandedRows.has("genetic_cancer")} onToggle={() => toggleRow("genetic_cancer")}>
              <p className="text-sm text-muted-foreground">Family history of cancer.</p>
            </ExpandableRow>
            <ExpandableRow label="Genetic (Melanoma)" value={onboarding?.genetic_melanoma ? "Yes" : "No"} recorded={onboardingDate} expanded={expandedRows.has("genetic_melanoma")} onToggle={() => toggleRow("genetic_melanoma")}>
              <p className="text-sm text-muted-foreground">Family history of melanoma.</p>
            </ExpandableRow>
            <ExpandableRow label="Breast Screening" value={onboarding?.cancer_screening_breast === true ? "Yes" : onboarding?.cancer_screening_breast === false ? "No" : "—"} recorded={onboardingDate} expanded={expandedRows.has("breast")} onToggle={() => toggleRow("breast")}>
              <p className="text-sm text-muted-foreground">Up to date with breast cancer screening.</p>
            </ExpandableRow>
            <ExpandableRow label="Cervical Screening" value={onboarding?.cancer_screening_cervical === true ? "Yes" : onboarding?.cancer_screening_cervical === false ? "No" : "—"} recorded={onboardingDate} expanded={expandedRows.has("cervical")} onToggle={() => toggleRow("cervical")}>
              <p className="text-sm text-muted-foreground">Up to date with cervical cancer screening.</p>
            </ExpandableRow>
            <ExpandableRow label="Colorectal Screening" value={onboarding?.cancer_screening_colorectal === true ? "Yes" : onboarding?.cancer_screening_colorectal === false ? "No" : "—"} recorded={onboardingDate} expanded={expandedRows.has("colorectal")} onToggle={() => toggleRow("colorectal")}>
              <p className="text-sm text-muted-foreground">Up to date with colorectal cancer screening.</p>
            </ExpandableRow>
          </div>
        );
      }
      case "metabolic":
      case "metabolism":
      case "endocrine":
      case "kidneys":
      case "nutrition":
      case "body_composition": {
        return (
          <div className="divide-y border rounded-md">
            {renderCurrentIllnessesRow("Metabolic Health", "current_illness")}
          </div>
        );
      }
      case "digestion":
      case "gastrointestinal":
      case "liver":
      case "gut": {
        return (
          <div className="divide-y border rounded-md">
            {renderCurrentIllnessesRow("Digestion", "current_illness")}
          </div>
        );
      }
      default:
        return <p className="text-sm text-muted-foreground">No structured risk factors recorded for this dimension yet.</p>;
    }
  };

  // Determine whether this is a main dimension (with subs) or a sub-dimension
  const mainDim = findMainDimension(dimensionKey);

  // Compute real, signal-driven sub-scores. Parent score = average of subs that have data.
  const subScores = computeSubScores({ onboarding, labResults, diagnoses, medications, allergies });
  const aggregatedParent = mainDim ? aggregateMainScore(mainDim.key, subScores) : null;
  // Fallback: if no sub has data, fall back to the radar/category-derived score for the main dim.
  const radarData = computeRadarData(onboarding, labResults, healthCategories);
  const radarMain = mainDim ? radarData.find((d) => d.key === mainDim.key)?.score ?? null : null;
  const parentScore: number | null =
    aggregatedParent != null ? aggregatedParent : (onboarding ? radarMain : null);

  // Sub-dimension page
  if (mainDim && mainDim.key !== dimensionKey) {
    return (
      <SubDimensionView
        parent={mainDim}
        subKey={dimensionKey}
        parentScore={parentScore}
        subScore={subScores[dimensionKey] ?? null}
        patient={patient}
        healthCategories={healthCategories}
        onNavigateToParent={() => onNavigateDimension(mainDim.key)}
        onNavigateToMedications={() => onNavigateDimension("medications")}
        renderRiskFactors={renderContent}
        onDataChanged={onDataChanged}
      />
    );
  }

  // Main-dimension overview page (with sub-dimensions)
  if (mainDim && mainDim.subDimensions.length > 0) {
    return (
      <MainDimensionOverview
        main={mainDim}
        parentScore={parentScore}
        subScores={subScores}
        patient={patient}
        healthCategories={healthCategories}
        onNavigateToSub={(k) => onNavigateDimension(k)}
        onNavigateToMedications={() => onNavigateDimension("medications")}
        renderRiskFactors={renderContent}
        onDataChanged={onDataChanged}
      />
    );
  }

  // Fallback — main dim with no subs (none currently except cardiovascular which is handled above)
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
  const scoreColor = score <= 3 ? "text-[hsl(189_94%_43%)]" : score <= 6 ? "text-[hsl(330_81%_60%)]" : "text-[hsl(330_81%_50%)]";
  const scoreBg = "";

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
              <div className="flex items-baseline gap-2">
                <span className="text-xs font-medium text-muted-foreground">Risk Index</span>
                <span className={`text-2xl font-bold leading-none ${scoreColor}`}>{Number(score).toFixed(1)}</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 text-xs bg-card text-foreground border-border shadow-card hover:bg-accent"
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

  const scoreColor = skinScore <= 3 ? "text-[hsl(189_94%_43%)]" : skinScore <= 6 ? "text-[hsl(330_81%_60%)]" : "text-[hsl(330_81%_50%)]";
  const scoreBg = "";

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

  const riskFactors: { key: string; label: string; value: string; detail: React.ReactNode }[] = [
    { key: "skin_condition", label: "Skin Condition (1-10)", value: onboarding?.skin_condition != null ? String(onboarding.skin_condition) : "—", detail: <p className="text-sm text-muted-foreground">Self-reported skin condition score recorded at onboarding.</p> },
    { key: "skin_rash", label: "Skin Rash", value: onboarding?.symptom_skin_rash ? "Yes" : "No", detail: <p className="text-sm text-muted-foreground">Patient-reported active rash symptoms.</p> },
    { key: "mucous", label: "Mucous Membrane Issues", value: onboarding?.symptom_mucous_membranes ? "Yes" : "No", detail: <p className="text-sm text-muted-foreground">Symptoms affecting mucous membranes (oral, nasal, etc.).</p> },
    { key: "sun", label: "Sun Exposure", value: onboarding?.sun_exposure ? "Yes" : "No", detail: <p className="text-sm text-muted-foreground">Significant cumulative sun exposure history.</p> },
    { key: "melanoma", label: "Genetic Melanoma Risk", value: onboarding?.genetic_melanoma ? "Yes" : "No", detail: <p className="text-sm text-muted-foreground">Family history of melanoma or genetic predisposition.</p> },
  ];

  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const toggleRow = (k: string) => setExpandedRows((prev) => {
    const next = new Set(prev);
    if (next.has(k)) next.delete(k); else next.add(k);
    return next;
  });

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
              <div className="flex items-baseline gap-2">
                <span className="text-xs font-medium text-muted-foreground">Risk Index</span>
                <span className={`text-2xl font-bold leading-none ${scoreColor}`}>{Number(skinScore).toFixed(1)}</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 text-xs bg-card text-foreground border-border shadow-card hover:bg-accent"
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
                  subTab === tab ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
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
                <div className="divide-y border rounded-md">
                  {riskFactors.map((f) => {
                    const expanded = expandedRows.has(f.key);
                    return (
                      <div key={f.key} className="border-b last:border-0">
                        <button
                          onClick={() => toggleRow(f.key)}
                          className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex items-center gap-3 flex-1">
                            <span className="font-medium text-sm">{f.label}</span>
                            <span className="text-sm text-muted-foreground">{f.value}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-xs text-muted-foreground">{onboardingDate}</span>
                            {expanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                          </div>
                        </button>
                        {expanded && <div className="px-4 pb-4 pt-0">{f.detail}</div>}
                      </div>
                    );
                  })}
                </div>
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

// ─────────────── Cardiovascular Risk Factor helpers ───────────────
function ExpandableRiskRow({
  label,
  value,
  recorded,
  expanded,
  onToggle,
  expandable = true,
  children,
}: {
  label: string;
  value: React.ReactNode;
  recorded: string;
  expanded: boolean;
  onToggle: () => void;
  expandable?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <button
        type="button"
        onClick={expandable ? onToggle : undefined}
        className={cn(
          "w-full grid grid-cols-[1fr_1.2fr_auto_24px] items-center gap-3 px-3 py-2 text-left",
          expandable && "hover:bg-muted/40 cursor-pointer",
        )}
      >
        <span className="font-medium text-sm">{label}</span>
        <span className="text-sm">{value}</span>
        <span className="text-xs text-muted-foreground">{recorded}</span>
        {expandable ? (
          expanded ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )
        ) : (
          <span />
        )}
      </button>
      {expanded && expandable && (
        <div className="px-3 pb-3 pt-1 bg-muted/20 border-t">{children}</div>
      )}
    </div>
  );
}

function Sparkline({ points }: { points: number[] }) {
  if (points.length < 2) return null;
  const w = 48;
  const h = 14;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;
  const stepX = w / (points.length - 1);
  const path = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${i * stepX} ${h - ((p - min) / range) * h}`)
    .join(" ");
  return (
    <svg width={w} height={h} className="text-primary" aria-hidden>
      <path d={path} fill="none" stroke="currentColor" strokeWidth={1.5} />
    </svg>
  );
}

// Inline annotation list with add/edit/delete for the marker detail sidebar.
function AnnotationListEditor({
  biomarkerKey,
  biomarkerLabel,
  doctor = "Dr. Laine",
}: {
  biomarkerKey: string;
  biomarkerLabel: string;
  doctor?: string;
}) {
  useAnnotationsVersion();
  const list = getAnnotationsForBiomarker(biomarkerKey)
    .slice()
    .sort((a, b) => a.date.localeCompare(b.date));
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteReason, setDeleteReason] = useState("");

  // Inline "Add annotation" form state
  const [adding, setAdding] = useState(false);
  const [newDate, setNewDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [newText, setNewText] = useState("");

  const handleSaveNew = () => {
    if (!newText.trim() || !newDate) return;
    addAnnotation({
      biomarkerKey,
      biomarkerLabel,
      date: newDate,
      text: newText.trim(),
      doctor,
    });
    setNewText("");
    setNewDate(new Date().toISOString().slice(0, 10));
    setAdding(false);
  };

  const renderAddSection = () => (
    <div className="mb-2">
      {adding ? (
        <div className="rounded-md border bg-card p-2 space-y-2">
          <div>
            <Label className="text-[11px] text-muted-foreground">Date</Label>
            <Input
              type="date"
              value={newDate}
              onChange={(e) => setNewDate(e.target.value)}
              className="h-8 text-xs mt-0.5"
            />
          </div>
          <div>
            <Label className="text-[11px] text-muted-foreground">Annotation</Label>
            <Textarea
              autoFocus
              value={newText}
              onChange={(e) => setNewText(e.target.value)}
              placeholder="e.g. Started Atorvastatin 20mg — monitoring response"
              className="min-h-[60px] text-xs resize-none mt-0.5"
            />
          </div>
          <div className="flex justify-end gap-1.5">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={() => {
                setAdding(false);
                setNewText("");
              }}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              className="h-7 text-xs"
              onClick={handleSaveNew}
              disabled={!newText.trim() || !newDate}
            >
              Save annotation
            </Button>
          </div>
        </div>
      ) : (
        <Button
          variant="outline"
          size="sm"
          className="h-8 w-full text-xs"
          onClick={() => setAdding(true)}
        >
          <Plus className="h-3.5 w-3.5 mr-1" />
          Add annotation
        </Button>
      )}
    </div>
  );

  if (list.length === 0) {
    return (
      <div className="mt-4">
        <p className="text-xs font-medium text-muted-foreground mb-1.5">Annotations</p>
        {renderAddSection()}
        <p className="text-xs text-muted-foreground italic">
          No annotations yet. Click a point on the graph or use the button above to add one.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-4">
      <p className="text-xs font-medium text-muted-foreground mb-1.5">
        Annotations ({list.length})
      </p>
      {renderAddSection()}
      <ul className="space-y-1.5">

        {list.map((a) => {
          const isEditing = editingId === a.id;
          const isDeleting = deletingId === a.id;
          return (
            <li key={a.id} className="rounded-md border bg-muted/30 p-2 text-xs">
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium text-foreground">{a.date}</span>
                {!isEditing && !isDeleting && (
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        setEditText(a.text);
                        setEditingId(a.id);
                      }}
                      className="text-muted-foreground hover:text-foreground"
                      title="Edit"
                    >
                      <Pencil className="h-3 w-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setDeleteReason("");
                        setDeletingId(a.id);
                      }}
                      className="text-muted-foreground hover:text-destructive"
                      title="Delete"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                )}
              </div>
              {!isEditing && !isDeleting && (
                <>
                  <p className="text-foreground whitespace-pre-wrap mt-1">{a.text}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    — {a.doctor}
                    {a.updatedAt ? " (edited)" : ""}
                  </p>
                </>
              )}
              {isEditing && (
                <div className="mt-1 space-y-1.5">
                  <Textarea
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    className="min-h-[60px] text-xs resize-none"
                  />
                  <div className="flex justify-end gap-1.5">
                    <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={() => setEditingId(null)}>
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      className="h-6 text-xs"
                      disabled={!editText.trim()}
                      onClick={() => {
                        updateAnnotation(a.id, { text: editText.trim() });
                        setEditingId(null);
                      }}
                    >
                      Save
                    </Button>
                  </div>
                </div>
              )}
              {isDeleting && (
                <div className="mt-1 space-y-1.5">
                  <p className="text-[11px] text-muted-foreground">
                    Deletion is logged for audit. Provide a reason.
                  </p>
                  <Textarea
                    value={deleteReason}
                    onChange={(e) => setDeleteReason(e.target.value)}
                    placeholder="Reason for deletion"
                    className="min-h-[50px] text-xs resize-none"
                  />
                  <div className="flex justify-end gap-1.5">
                    <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={() => setDeletingId(null)}>
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      className="h-6 text-xs"
                      disabled={!deleteReason.trim()}
                      onClick={() => {
                        deleteAnnotation(a.id, deleteReason.trim(), a.doctor);
                        setDeletingId(null);
                      }}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ul>
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
  const [selectedMarker, setSelectedMarker] = useState<{
    key: string;
    label: string;
    unit: string;
    refLow?: number;
    refHigh?: number;
    accentColorVar: string;
  } | null>(null);
  const [sidebarWindow, setSidebarWindow] = useState<"6m" | "1y" | "3y" | "all">("3y");
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

  // Onboarding date for Recorded column
  const onboardingDate = onboarding?.created_at ? new Date(onboarding.created_at).toLocaleDateString() : "—";

  // ── Cardiovascular risk factors (reordered + expandable + dummy history) ──
  // Pull from single source of truth (shared clinical data)
  const cvCurrentIllnesses = getDiagnosesForDimension("Cardiovascular Health").map((d) => ({
    name: d.name,
    diagnosedDate: fmtClinicalDate(d.diagnosedDate),
    severity: undefined as string | undefined,
  }));
  const cvPastIllnesses = CARTER_DIAGNOSES
    .filter((d) => d.dimension === "Cardiovascular Health" && d.status === "resolved")
    .map((d) => ({
      name: d.name,
      from: d.diagnosedDate,
      to: d.resolvedDate ?? "—",
      resolution: undefined as string | undefined,
    }));
  // Dummy: smoking history (changes over time)
  const smokingCurrent = onboarding?.smoking ?? "no";
  const smokingHistory: { date: string; value: string }[] = [
    { date: "2018-01-01", value: "yes" },
    { date: "2021-03-15", value: "no" },
  ];
  const smokingChanged = smokingHistory.length > 1;
  const smokingPrev = smokingChanged ? smokingHistory[smokingHistory.length - 2] : null;
  // Dummy: exercise MET hours history
  const exerciseCurrent = onboarding?.exercise_met_hours != null ? Number(onboarding.exercise_met_hours) : 12;
  const exerciseHistory: { date: string; value: number }[] = [
    { date: "2022-04-10", value: 6 },
    { date: "2023-04-22", value: 8 },
    { date: "2024-04-12", value: 10 },
    { date: "2025-04-09", value: exerciseCurrent },
  ];
  const exerciseTrend = exerciseHistory[exerciseHistory.length - 1].value - exerciseHistory[0].value;
  // Dummy: waist-hip ratio history
  const whrCurrent = onboarding?.waist_to_hip_ratio != null ? Number(onboarding.waist_to_hip_ratio) : 0.92;
  const whrHistory: { date: string; value: number }[] = [
    { date: "2022-04-10", value: 0.98 },
    { date: "2023-04-22", value: 0.96 },
    { date: "2024-04-12", value: 0.94 },
    { date: "2025-04-09", value: whrCurrent },
  ];
  const whrTrend = whrHistory[whrHistory.length - 1].value - whrHistory[0].value;
  const geneticPredisposition = onboarding?.genetic_cardiovascular ? "Yes" : "No";

  type CvRiskRowKey = "current_illness" | "past_illness" | "genetic" | "smoking" | "exercise" | "whr";
  const [expandedRiskRows, setExpandedRiskRows] = useState<Set<CvRiskRowKey>>(new Set());
  const toggleRiskRow = (k: CvRiskRowKey) =>
    setExpandedRiskRows((prev) => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });


  // Chart data for each marker
  const ldlData = sorted.filter((l) => l.ldl_mmol_l != null).map((l) => ({ date: l.result_date, value: Number(l.ldl_mmol_l) }));
  const bpData = sorted.filter((l) => l.blood_pressure_systolic != null).map((l) => ({ date: l.result_date, systolic: Number(l.blood_pressure_systolic), diastolic: Number(l.blood_pressure_diastolic) }));
  const hba1cData = sorted.filter((l) => l.hba1c_mmol_mol != null).map((l) => ({ date: l.result_date, value: Number(l.hba1c_mmol_mol) }));
  const alatData = sorted.filter((l) => l.alat_u_l != null).map((l) => ({ date: l.result_date, value: Number(l.alat_u_l) }));
  const afosData = sorted.filter((l) => l.afos_alp_u_l != null).map((l) => ({ date: l.result_date, value: Number(l.afos_alp_u_l) }));
  const gtData = sorted.filter((l) => l.gt_u_l != null).map((l) => ({ date: l.result_date, value: Number(l.gt_u_l) }));
  const alatAsatData = sorted.filter((l) => l.alat_asat_ratio != null).map((l) => ({ date: l.result_date, value: Number(l.alat_asat_ratio) }));

  const scoreColor = cvScore <= 3 ? "text-[hsl(189_94%_43%)]" : cvScore <= 6 ? "text-[hsl(330_81%_60%)]" : "text-[hsl(330_81%_50%)]";
  const scoreBg = "";

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

  const [cvSubTab, setCvSubTab] = useState<"risk_factors" | "lab_graphs">("risk_factors");

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
              <div className="flex items-baseline gap-2">
                <span className="text-xs font-medium text-muted-foreground">Risk Index</span>
                <span className={`text-2xl font-bold leading-none ${scoreColor}`}>{Number(cvScore).toFixed(1)}</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 text-xs bg-card text-foreground border-border shadow-card hover:bg-accent"
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
                  cvSubTab === "risk_factors" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Risk Factors
              </button>
              <button
                onClick={() => { setCvSubTab("lab_graphs"); setSelectedMarker(null); }}
                className={`inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1 text-sm font-medium transition-all ${
                  cvSubTab === "lab_graphs" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Lab Results
              </button>
            </div>
          </CardHeader>
          <CardContent>
            {cvSubTab === "risk_factors" && (
              <div className="divide-y border rounded-md">
                <ExpandableRiskRow
                  label="Current Illnesses"
                  value={`${cvCurrentIllnesses.length} active condition${cvCurrentIllnesses.length === 1 ? "" : "s"}`}
                  recorded={onboardingDate}
                  expanded={expandedRiskRows.has("current_illness")}
                  onToggle={() => toggleRiskRow("current_illness")}
                >
                  {cvCurrentIllnesses.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No active cardiovascular conditions.</p>
                  ) : (
                    <ul className="space-y-1.5 text-sm">
                      {cvCurrentIllnesses.map((c) => (
                        <li key={c.name} className="flex items-center justify-between gap-2">
                          <span className="font-medium">{c.name}</span>
                          <span className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span>Diagnosed {c.diagnosedDate}</span>
                            {c.severity && <Badge variant="outline" className="text-[10px]">{c.severity}</Badge>}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </ExpandableRiskRow>

                <ExpandableRiskRow
                  label="Past Illnesses"
                  value={`${cvPastIllnesses.length} resolved`}
                  recorded={onboardingDate}
                  expanded={expandedRiskRows.has("past_illness")}
                  onToggle={() => toggleRiskRow("past_illness")}
                >
                  {cvPastIllnesses.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No past cardiovascular illnesses on record.</p>
                  ) : (
                    <ul className="space-y-1.5 text-sm">
                      {cvPastIllnesses.map((c) => (
                        <li key={c.name} className="flex items-center justify-between gap-2">
                          <span className="font-medium">{c.name}</span>
                          <span className="text-xs text-muted-foreground">
                            {c.from} → {c.to}
                            {c.resolution ? ` · ${c.resolution}` : ""}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </ExpandableRiskRow>

                <ExpandableRiskRow
                  label="Genetic Predisposition"
                  value={geneticPredisposition}
                  recorded={onboardingDate}
                  expanded={expandedRiskRows.has("genetic")}
                  onToggle={() => toggleRiskRow("genetic")}
                >
                  <p className="text-sm">
                    {onboarding?.genetic_cardiovascular
                      ? "Family history of cardiovascular disease recorded at onboarding."
                      : "No reported family history of cardiovascular disease."}
                  </p>
                  {onboarding?.illness_cardiovascular_notes && (
                    <p className="text-xs text-muted-foreground mt-1">{onboarding.illness_cardiovascular_notes}</p>
                  )}
                </ExpandableRiskRow>

                <ExpandableRiskRow
                  label="Smoking"
                  value={
                    <span className="flex items-center gap-2">
                      <span>{smokingCurrent}</span>
                      {smokingChanged && smokingPrev && (
                        <span className="text-[11px] text-muted-foreground italic">
                          (changed from {smokingPrev.value}, {new Date(smokingHistory[smokingHistory.length - 1].date).toLocaleDateString(undefined, { month: "short", year: "numeric" })})
                        </span>
                      )}
                    </span>
                  }
                  recorded={onboardingDate}
                  expanded={expandedRiskRows.has("smoking")}
                  onToggle={() => toggleRiskRow("smoking")}
                >
                  <p className="text-xs font-medium text-muted-foreground mb-1.5">Smoking status timeline</p>
                  <ul className="space-y-1 text-sm">
                    {smokingHistory.map((h) => (
                      <li key={h.date} className="flex items-center justify-between">
                        <span>{h.date}</span>
                        <span className="font-medium">{h.value}</span>
                      </li>
                    ))}
                  </ul>
                </ExpandableRiskRow>

                <ExpandableRiskRow
                  label="Exercise, MET (hours/week)"
                  value={
                    <span className="flex items-center gap-2">
                      <span>{exerciseCurrent}</span>
                      <span className={cn("text-[11px]", exerciseTrend >= 0 ? "text-green-600" : "text-destructive")}>
                        {exerciseTrend >= 0 ? "▲" : "▼"} {Math.abs(exerciseTrend).toFixed(1)}
                      </span>
                    </span>
                  }
                  recorded={onboardingDate}
                  expanded={expandedRiskRows.has("exercise")}
                  onToggle={() => toggleRiskRow("exercise")}
                >
                  <p className="text-xs font-medium text-muted-foreground mb-1.5">Exercise history</p>
                  <table className="w-full text-sm">
                    <tbody>
                      {exerciseHistory.map((h) => (
                        <tr key={h.date} className="border-t first:border-0">
                          <td className="py-1 text-muted-foreground">{h.date}</td>
                          <td className="py-1 text-right font-medium">{h.value} MET hrs</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </ExpandableRiskRow>

                <ExpandableRiskRow
                  label="Waist-Hip Ratio"
                  value={
                    <span className="flex items-center gap-2">
                      <span>{whrCurrent}</span>
                      <span className={cn("text-[11px]", whrTrend <= 0 ? "text-green-600" : "text-destructive")}>
                        {whrTrend <= 0 ? "▼" : "▲"} {Math.abs(whrTrend).toFixed(2)}
                      </span>
                    </span>
                  }
                  recorded={onboardingDate}
                  expanded={expandedRiskRows.has("whr")}
                  onToggle={() => toggleRiskRow("whr")}
                >
                  <p className="text-xs font-medium text-muted-foreground mb-1.5">Waist-Hip Ratio history</p>
                  <table className="w-full text-sm">
                    <tbody>
                      {whrHistory.map((h) => (
                        <tr key={h.date} className="border-t first:border-0">
                          <td className="py-1 text-muted-foreground">{h.date}</td>
                          <td className="py-1 text-right font-medium">{h.value}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </ExpandableRiskRow>
              </div>
            )}

            {cvSubTab === "lab_graphs" && (() => {
              const CV_BIOMARKERS: Array<{
                key: string;
                label: string;
                sidebarLabel?: string;
                unit: string;
                refLow?: number;
                refHigh?: number;
                accentColorVar: string;
              }> = [
                { key: "ldl_mmol_l", label: "LDL", unit: "mmol/L", refHigh: 3.0, accentColorVar: "hsl(25 45% 30%)" },
                { key: "blood_pressure_systolic", label: "Blood Pressure", sidebarLabel: "Blood Pressure (Systolic / Diastolic)", unit: "mmHg", refLow: 60, refHigh: 140, accentColorVar: "hsl(var(--destructive))" },
                { key: "alat_u_l", label: "ALAT", unit: "U/L", refHigh: 50, accentColorVar: "hsl(200 70% 40%)" },
                { key: "afos_alp_u_l", label: "AFOS/ALP", unit: "U/L", refLow: 35, refHigh: 105, accentColorVar: "hsl(280 50% 45%)" },
                { key: "gt_u_l", label: "GT", unit: "U/L", refHigh: 60, accentColorVar: "hsl(160 55% 35%)" },
                { key: "alat_asat_ratio", label: "ALAT/ASAT Ratio", unit: "", refHigh: 1.0, accentColorVar: "hsl(40 70% 40%)" },
                { key: "hba1c_mmol_mol", label: "HbA1c", unit: "mmol/mol", refHigh: 42, accentColorVar: "hsl(340 60% 45%)" },
              ];
              const selectMarker = (b: typeof CV_BIOMARKERS[number]) =>
                setSelectedMarker({
                  key: b.key,
                  label: b.sidebarLabel ?? b.label,
                  unit: b.unit,
                  refLow: b.refLow,
                  refHigh: b.refHigh,
                  accentColorVar: b.accentColorVar,
                });

              return (
                <div className="flex gap-4">
                  <div className={`grid grid-cols-1 ${selectedMarker ? "lg:grid-cols-1" : "lg:grid-cols-2"} gap-4 flex-1 min-w-0`}>
                    {CV_BIOMARKERS.map((b) => (
                      <CardioLabBiomarkerPanel
                        key={b.key}
                        biomarkerKey={b.key}
                        label={b.label}
                        unit={b.unit}
                        refLow={b.refLow}
                        refHigh={b.refHigh}
                        accentColorVar={b.accentColorVar}
                        selected={selectedMarker?.key === b.key}
                        onSelect={() => selectMarker(b)}
                        patientId={patient?.id}
                        patientName={patient?.full_name}
                      />
                    ))}
                  </div>

                  {selectedMarker && (() => {
                    const rows = getSeriesRowsForBiomarker(
                      selectedMarker.key,
                      sidebarWindow,
                      selectedMarker.refLow,
                      selectedMarker.refHigh,
                    );
                    return (
                      <div
                        className="w-[380px] shrink-0 border rounded-lg bg-card flex flex-col animate-in slide-in-from-right-5 duration-200 self-start sticky top-4 max-h-[calc(100vh-2rem)]"
                        style={{ borderLeftWidth: 4, borderLeftColor: selectedMarker.accentColorVar }}
                      >
                        {/* Sticky header */}
                        <div className="flex items-center justify-between p-4 border-b bg-card sticky top-0 z-10 rounded-t-lg">
                          <div className="flex items-center gap-2 min-w-0">
                            <span
                              className="inline-block w-2.5 h-2.5 rounded-full shrink-0"
                              style={{ backgroundColor: selectedMarker.accentColorVar }}
                              aria-hidden
                            />
                            <div className="min-w-0">
                              <h3 className="font-semibold text-sm truncate">{selectedMarker.label}</h3>
                              {selectedMarker.unit && (
                                <p className="text-xs text-muted-foreground">{selectedMarker.unit}</p>
                              )}
                            </div>
                          </div>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setSelectedMarker(null)}>
                            <X className="h-4 w-4" />
                          </Button>
                        </div>

                        <div className="p-4 flex-1 overflow-auto space-y-4">
                          {/* Time window selector — mirrors the graph window */}
                          <div className="flex items-center justify-between">
                            <p className="text-xs font-medium text-muted-foreground">Data points</p>
                            <div className="inline-flex rounded-md border bg-muted/50 p-0.5 text-[10px]">
                              {(["6m", "1y", "3y", "all"] as const).map((w) => (
                                <button
                                  key={w}
                                  onClick={() => setSidebarWindow(w)}
                                  className={cn(
                                    "px-1.5 py-0.5 rounded-sm transition-colors",
                                    sidebarWindow === w
                                      ? "bg-background text-foreground shadow-sm font-medium"
                                      : "text-muted-foreground hover:text-foreground",
                                  )}
                                >
                                  {w === "all" ? "All" : w}
                                </button>
                              ))}
                            </div>
                          </div>

                          {rows.length === 0 ? (
                            <p className="text-sm text-muted-foreground text-center py-8">No data recorded yet.</p>
                          ) : (
                            <div className="border rounded-md overflow-hidden">
                              <div className="max-h-64 overflow-auto">
                                <table className="w-full text-xs">
                                  <thead className="bg-muted/40 sticky top-0">
                                    <tr>
                                      <th className="text-left font-medium px-2 py-1.5">Date</th>
                                      <th className="text-left font-medium px-2 py-1.5">Value</th>
                                      <th className="text-left font-medium px-2 py-1.5">In range</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {rows.map((r) => (
                                      <tr key={r.date} className="border-t">
                                        <td className="px-2 py-1.5 text-muted-foreground">{r.date}</td>
                                        <td className="px-2 py-1.5 font-medium">{r.value}</td>
                                        <td className="px-2 py-1.5">
                                          {r.inRange === null ? (
                                            <span className="text-muted-foreground">—</span>
                                          ) : r.inRange ? (
                                            <span className="inline-flex items-center gap-1 text-[hsl(142_60%_35%)]">
                                              <span className="w-1.5 h-1.5 rounded-full bg-[hsl(142_60%_45%)]" />
                                              Yes
                                            </span>
                                          ) : (
                                            <span className="inline-flex items-center gap-1 text-destructive">
                                              <span className="w-1.5 h-1.5 rounded-full bg-destructive" />
                                              No
                                            </span>
                                          )}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          )}

                          <AnnotationListEditor
                            biomarkerKey={selectedMarker.key}
                            biomarkerLabel={selectedMarker.label}
                          />


                          {MARKER_DIMENSIONS[selectedMarker.key] && (
                            <div>
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
              );
            })()}
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

      {/* ── Incorporate annotations side panel ── */}
      <Sheet open={incorporateOpen !== null} onOpenChange={(o) => !o && setIncorporateOpen(null)}>
        <SheetContent side="right" className="w-[440px] sm:max-w-[440px] flex flex-col">
          <SheetHeader>
            <SheetTitle>
              Incorporate annotations into{" "}
              {incorporateOpen === "summary" ? "Summary" : "Recommendations"}
            </SheetTitle>
            <SheetDescription className="text-xs">
              Select annotations to append as draft text. Nothing is saved until you review and click Save.
            </SheetDescription>
          </SheetHeader>

          <div className="flex-1 overflow-auto mt-4 space-y-2">
            {(incorporateOpen === "summary" ? newForSummary : incorporateOpen === "recommendations" ? newForRecommendations : [])
              .slice()
              .sort((a, b) => a.date.localeCompare(b.date))
              .map((a) => {
                const checked = selectedAnnIds.has(a.id);
                return (
                  <label
                    key={a.id}
                    className={cn(
                      "flex items-start gap-2 rounded-md border p-3 cursor-pointer transition-colors",
                      checked ? "border-primary bg-primary/5" : "hover:bg-muted/40",
                    )}
                  >
                    <Checkbox
                      checked={checked}
                      onCheckedChange={(v) => {
                        setSelectedAnnIds((prev) => {
                          const next = new Set(prev);
                          if (v) next.add(a.id);
                          else next.delete(a.id);
                          return next;
                        });
                      }}
                      className="mt-0.5"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-medium text-foreground">{a.biomarkerLabel}</span>
                        <span className="text-[11px] text-muted-foreground">{a.date}</span>
                      </div>
                      <p className="text-sm text-foreground mt-1">{a.text}</p>
                      <p className="text-[11px] text-muted-foreground mt-1">— {a.doctor}</p>
                    </div>
                  </label>
                );
              })}
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t">
            <Button variant="ghost" onClick={() => setIncorporateOpen(null)}>Cancel</Button>
            <Button onClick={applyIncorporate} disabled={selectedAnnIds.size === 0}>
              Insert as draft ({selectedAnnIds.size})
            </Button>
          </div>
        </SheetContent>
      </Sheet>
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

function LabResultsView({ patientId, patientName, labResults, onLabResultsAdded, onNavigateDimension, markerNotes, setMarkerNotes, reviewMode, onReviewComplete }: {
  patientId: string;
  patientName?: string | null;
  labResults: Tables<"patient_lab_results">[];
  onLabResultsAdded: () => void;
  onNavigateDimension: (section: string) => void;
  markerNotes: Record<string, string>;
  setMarkerNotes: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  reviewMode?: boolean;
  onReviewComplete?: () => void;
}) {
  const { notifyChanged, openNewTask } = useTaskActions();
  const { user } = useAuth();
  const [selectedMarker, setSelectedMarker] = useState<{ key: string; label: string; unit: string } | null>(null);
  // (legacy tab state removed; lab results render directly now)
  const [customRefs, setCustomRefs] = useState<Record<string, { low?: number; high?: number }>>({});
  // Local re-render trigger for the lab-review store
  const [, forceTick] = useState(0);
  const [reviewBanner, setReviewBanner] = useState(false);

  // Annotations for the selected marker
  type Annotation = { id: string; annotation_date: string; text: string; author_name: string };
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [annotationText, setAnnotationText] = useState("");
  const [annotationDate, setAnnotationDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [viewMode, setViewMode] = useState<"graphs" | "table">("graphs");
  const [panelWindow, setPanelWindow] = useState<"6m" | "1y" | "3y" | "all">("all");
  const [showAddAnnotation, setShowAddAnnotation] = useState(false);
  const [editingAnnotationId, setEditingAnnotationId] = useState<string | null>(null);
  const [editingAnnotationText, setEditingAnnotationText] = useState("");

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

  // The most-recent real lab result (used to drive the AWAITING REVIEW flow).
  const newestLab = sorted.length > 0 ? sorted[sorted.length - 1] : null;

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


  // ---- Lab review flow (AWAITING REVIEW) ----
  // When entering review mode, seed the unreviewed-marker store with all
  // out-of-range markers from the most recent lab result for this patient.
  React.useEffect(() => {
    if (!reviewMode || !newestLab) return;
    const markers: NewMarker[] = [];
    for (const cat of categories) {
      for (const row of cat.rows) {
        if (isOutOfRange(row.key, newestLab)) {
          const key = row.key === "_bp" ? "blood_pressure_systolic" : row.key;
          markers.push({ key, label: row.label, unit: row.unit });
        }
      }
    }
    seedLabReviewMarkers(patientId, markers);
    const unsub = subscribeLabReview(() => forceTick((n) => n + 1));
    return unsub;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patientId, reviewMode, newestLab?.id]);

  const newMarkers = getNewMarkers(patientId);
  const newKeys = new Set(newMarkers.map((m) => m.key));

  // Filter normal categories to hide rows currently shown in AWAITING REVIEW.
  const visibleCategories = React.useMemo(() => {
    if (newKeys.size === 0) return categories;
    return categories.map((cat) => ({
      ...cat,
      rows: cat.rows.filter((r) => !newKeys.has(r.key as string)),
    })).filter((cat) => cat.rows.length > 0);
  }, [categories, newKeys.size]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleVerifyMarker = async (key: string) => {
    const cleared = verifyMarker(patientId, key);
    if (cleared) {
      setReviewBanner(true);
      setTimeout(() => setReviewBanner(false), 2500);
      await completeLabReviewTask(patientId);
      notifyChanged();
      onReviewComplete?.();
      toast.success("All new results reviewed");
    }
  };

  // Lookup helper: latest value + out-of-range for a marker (for the AWAITING REVIEW preview).
  const latestForMarker = (key: string) => {
    for (let i = sorted.length - 1; i >= 0; i--) {
      const lab = sorted[i];
      const val = key === "_bp" ? lab.blood_pressure_systolic : (lab as any)[key];
      if (val !== null && val !== undefined) {
        return { lab, oor: isOutOfRange(key, lab), display: getCellValue(lab, key) };
      }
    }
    return null;
  };

  // ---- Annotations for the selected marker ----
  const loadAnnotations = React.useCallback(async () => {
    if (!selectedMarker) { setAnnotations([]); return; }
    const { data } = await supabase
      .from("marker_annotations")
      .select("id, annotation_date, text, author_name")
      .eq("patient_id", patientId)
      .eq("marker_key", selectedMarker.key)
      .order("annotation_date", { ascending: false });
    setAnnotations((data ?? []) as Annotation[]);
  }, [patientId, selectedMarker]);

  React.useEffect(() => { loadAnnotations(); }, [loadAnnotations]);

  const saveAnnotation = async () => {
    if (!selectedMarker || !annotationText.trim() || !user) return;
    const { error } = await supabase.from("marker_annotations").insert({
      patient_id: patientId,
      marker_key: selectedMarker.key,
      annotation_date: annotationDate,
      text: annotationText.trim(),
      author_name: "Dr. Laine",
      created_by: user.id,
    });
    if (error) { toast.error("Could not save annotation"); return; }
    setAnnotationText("");
    setAnnotationDate(new Date().toISOString().slice(0, 10));
    loadAnnotations();
    toast.success("Annotation saved");
  };

  const deleteAnnotation = async (id: string) => {
    const { error } = await supabase.from("marker_annotations").delete().eq("id", id);
    if (error) { toast.error("Could not delete annotation"); return; }
    loadAnnotations();
  };

  const updateAnnotation = async (id: string, text: string) => {
    const { error } = await supabase.from("marker_annotations").update({ text }).eq("id", id);
    if (error) { toast.error("Could not update annotation"); return; }
    setEditingAnnotationId(null);
    setEditingAnnotationText("");
    loadAnnotations();
  };

  const createTaskFromMarker = () => {
    if (!selectedMarker) return;
    const due = new Date();
    due.setDate(due.getDate() + 3);
    let oor: "high" | "low" | null = null;
    for (let i = sorted.length - 1; i >= 0; i--) {
      const lab = sorted[i];
      const val = (lab as any)[selectedMarker.key];
      if (val !== null && val !== undefined) {
        oor = isOutOfRange(selectedMarker.key, lab);
        break;
      }
    }
    openNewTask({
      title: `Review ${selectedMarker.label} – ${patientName ?? "Patient"}`,
      category: "clinical_review",
      patient_id: patientId,
      priority: oor ? "high" : "medium",
      due_date: due.toISOString().slice(0, 10),
    });
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between shrink-0">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <FlaskConical className="h-5 w-5 text-primary" />
          Laboratory Results
        </h2>
        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-md border bg-muted/50 p-0.5 text-[11px]">
            <button
              onClick={() => setViewMode("graphs")}
              className={cn(
                "px-2 py-1 rounded-sm transition-colors",
                viewMode === "graphs"
                  ? "bg-background text-foreground shadow-sm font-medium"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              📊 Graphs
            </button>
            <button
              onClick={() => setViewMode("table")}
              className={cn(
                "px-2 py-1 rounded-sm transition-colors",
                viewMode === "table"
                  ? "bg-background text-foreground shadow-sm font-medium"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              📋 Table
            </button>
          </div>
          <AddLabResultsDialog patientId={patientId} onSaved={onLabResultsAdded} />
        </div>
      </div>

      {reviewBanner && (
        <div className="rounded-[14px] border border-success/40 bg-success/10 px-4 py-2.5 text-sm text-success font-medium animate-in fade-in slide-in-from-top-1">
          ✓ All new results reviewed. The task has been marked as completed.
        </div>
      )}

      {newMarkers.length > 0 && (
        <Card className="rounded-[20px] shadow-card overflow-hidden border-l-4 border-l-warning">
          <CardContent className="p-0">
            <div className="px-4 py-2.5 bg-warning/5 flex items-center gap-2">
              <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-warning">
                Awaiting Review
              </span>
              <span className="text-[10px] text-muted-foreground">
                · {newMarkers.length} new result{newMarkers.length === 1 ? "" : "s"} to verify
              </span>
            </div>
            <div className="divide-y">
              {newMarkers.map((m) => {
                const latest = latestForMarker(m.key);
                const oor = latest?.oor;
                return (
                  <div
                    key={m.key}
                    className={cn(
                      "flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-primary/[0.04] transition-colors",
                      selectedMarker?.key === m.key && "bg-primary/10",
                    )}
                    onClick={() => handleRowClick(m.key, m.label, m.unit)}
                  >
                    <span className="inline-block px-1.5 py-0.5 rounded text-[9px] font-bold bg-primary/15 text-primary">NEW</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">{m.label}</p>
                      <p className="text-[11px] text-muted-foreground">{m.unit}</p>
                    </div>
                    {latest && (
                      <span className={cn(
                        "text-sm font-semibold tabular-nums",
                        oor ? "text-[hsl(0_72%_45%)]" : "text-foreground",
                      )}>
                        {latest.display}
                        {oor === "high" && " ▲"}
                        {oor === "low" && " ▼"}
                      </span>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 px-3 text-xs gap-1 rounded-full"
                      onClick={(e) => { e.stopPropagation(); handleVerifyMarker(m.key); }}
                    >
                      ✓ Verify
                    </Button>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex gap-4" style={{ minHeight: 400, maxHeight: "70vh" }}>
        <div className={`min-w-0 min-h-0 flex flex-col ${selectedMarker ? "flex-1" : "w-full"}`}>
        {sorted.length === 0 ? (
          <Card className="rounded-[20px]">
            <CardContent className="py-8 text-center text-muted-foreground">
              No lab results yet. Click "Add Lab Results" to add the first entry.
            </CardContent>
          </Card>
        ) : viewMode === "graphs" ? (
          <div className="flex-1 min-h-0 overflow-y-auto pr-1 space-y-6">
            {categories.map((cat) => {
              const rowsWithData = cat.rows.filter((row) => {
                if (row.key === "_bp") {
                  return sorted.some((lab) => lab.blood_pressure_systolic != null);
                }
                return sorted.some((lab) => {
                  const v = (lab as any)[row.key];
                  return v !== null && v !== undefined && typeof v !== "boolean";
                });
              });
              if (rowsWithData.length === 0) return null;
              return (
                <div key={cat.title} className="space-y-3">
                  <h3 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                    {cat.title}
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {rowsWithData.map((row) => {
                      const dataKey = row.key === "_bp" ? "blood_pressure_systolic" : row.key;
                      const refForRow = {
                        ...REFERENCE_VALUES[dataKey],
                        ...customRefs[dataKey],
                      };
                      const series = sorted
                        .map((lab) => {
                          const v = row.key === "_bp"
                            ? lab.blood_pressure_systolic
                            : (lab as any)[row.key];
                          if (v === null || v === undefined || typeof v === "boolean") return null;
                          return { date: lab.result_date, value: Number(v) };
                        })
                        .filter(Boolean) as { date: string; value: number }[];
                      const isBp = row.key === "_bp";
                      const diastolicSeries = isBp
                        ? (sorted
                            .map((lab) => {
                              const v = lab.blood_pressure_diastolic;
                              if (v === null || v === undefined) return null;
                              return { date: lab.result_date, value: Number(v) };
                            })
                            .filter(Boolean) as { date: string; value: number }[])
                        : undefined;
                      const diastolicRef = isBp
                        ? { ...REFERENCE_VALUES["blood_pressure_diastolic"], ...customRefs["blood_pressure_diastolic"] }
                        : undefined;
                      const isSel = selectedMarker?.key === dataKey;
                      return (
                        <button
                          key={row.key}
                          onClick={() => handleRowClick(row.key, row.label, row.unit)}
                          className={cn(
                            "text-left rounded-[14px] border bg-card p-3 transition-colors hover:border-primary/50",
                            isSel && "border-primary shadow-sm",
                          )}
                        >
                          <MarkerDetailChart
                            label={isBp ? "Systolic" : row.label}
                            unit={row.unit}
                            chartData={series}
                            refValues={refForRow}
                            secondarySeries={diastolicSeries}
                            secondaryLabel={isBp ? "Diastolic" : undefined}
                            secondaryRefValues={diastolicRef}
                            displayOnly
                          />
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <Card className="flex-1 min-h-0 flex flex-col rounded-[20px] shadow-card overflow-hidden">
            <CardContent className="p-0 flex-1 min-h-0 flex flex-col">
              <div className="flex min-h-0 flex-1">
                {/* Fixed left columns: Marker + Unit */}
                <div ref={leftScrollRef} onScroll={() => syncScroll("left")} className="shrink-0 border-r overflow-y-auto bg-card">
                  <table className="text-sm border-collapse">
                    <thead className="sticky top-0 z-10 bg-card">
                      <tr className="border-b">
                        <th className="h-11 px-4 text-left align-middle text-[11px] font-semibold uppercase tracking-wide text-muted-foreground min-w-[200px]">Marker</th>
                        <th className="h-11 px-4 text-left align-middle text-[11px] font-semibold uppercase tracking-wide text-muted-foreground min-w-[80px]">Unit</th>
                      </tr>
                    </thead>
                    <tbody>
                      {visibleCategories.map((cat) => (
                        <React.Fragment key={cat.title}>
                          <tr>
                            <td colSpan={2} className="font-semibold text-[10px] uppercase tracking-[0.08em] text-muted-foreground py-2.5 px-4 bg-muted/30">
                              {cat.title}
                            </td>
                          </tr>
                          {cat.rows.map((row) => {
                            const isSel = selectedMarker?.key === row.key || (row.key === "_bp" && selectedMarker?.key === "blood_pressure_systolic");
                            return (
                              <tr
                                key={row.key}
                                className={cn(
                                  "border-b cursor-pointer transition-colors",
                                  isSel ? "bg-primary/10" : "hover:bg-primary/[0.04]",
                                )}
                                onClick={() => handleRowClick(row.key, row.label, row.unit)}
                              >
                                <td className="px-4 py-3 align-middle font-medium text-sm text-foreground">{row.label}</td>
                                <td className="px-4 py-3 align-middle text-xs text-muted-foreground">{row.unit}</td>
                              </tr>
                            );
                          })}
                        </React.Fragment>
                      ))}
                    </tbody>
                  </table>
                </div>
                {/* Scrollable right columns: date values */}
                <div ref={rightScrollRef} onScroll={() => syncScroll("right")} className="overflow-auto flex-1 min-w-0 bg-card">
                  <table className="text-sm border-collapse w-max">
                    <thead className="sticky top-0 z-10 bg-card">
                      <tr className="border-b">
                         {sorted.map((lab) => {
                          const d = new Date(lab.result_date);
                          const label = `${d.getFullYear()} / ${String(d.getMonth() + 1).padStart(2, "0")}`;
                          const isNewCol = reviewMode && newestLab?.id === lab.id;
                          return (
                            <th key={lab.id} className="h-11 px-4 text-center align-middle text-[11px] font-semibold uppercase tracking-wide text-muted-foreground min-w-[100px] whitespace-nowrap">
                              <div className="flex items-center justify-center gap-1.5">
                                <span>{label}</span>
                                {isNewCol && (
                                  <span className="inline-block px-1.5 py-0.5 rounded text-[9px] font-bold bg-primary/15 text-primary">NEW</span>
                                )}
                              </div>
                            </th>
                          );
                        })}
                      </tr>
                    </thead>
                    <tbody>
                      {visibleCategories.map((cat) => (
                        <React.Fragment key={cat.title}>
                          <tr>
                            <td colSpan={sorted.length} className="bg-muted/30 py-2.5 px-4">
                              &nbsp;
                            </td>
                          </tr>
                          {cat.rows.map((row) => {
                            const isSel = selectedMarker?.key === row.key || (row.key === "_bp" && selectedMarker?.key === "blood_pressure_systolic");
                            return (
                              <tr
                                key={row.key}
                                className={cn(
                                  "border-b cursor-pointer transition-colors",
                                  isSel ? "bg-primary/10" : "hover:bg-primary/[0.04]",
                                )}
                                onClick={() => handleRowClick(row.key, row.label, row.unit)}
                              >
                                {sorted.map((lab) => {
                                  const oor = isOutOfRange(row.key, lab);
                                  return (
                                    <td
                                      key={lab.id}
                                      className={cn(
                                        "px-4 py-3 align-middle text-center text-sm whitespace-nowrap",
                                        oor ? "text-[hsl(0_72%_45%)] font-semibold" : "text-foreground",
                                      )}
                                    >
                                      {getCellValue(lab, row.key)}
                                      {oor === "high" && " ▲"}
                                      {oor === "low" && " ▼"}
                                    </td>
                                  );
                                })}
                              </tr>
                            );
                          })}
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

        {/* Detail panel — unified chart with inline annotations & task icon */}
        {selectedMarker && (() => {
          const isBp = selectedMarker.key === "blood_pressure_systolic";

          // Diastolic series + ref for BP marker
          const diastolicChartData = isBp
            ? (sorted
                .map((lab) => {
                  const v = lab.blood_pressure_diastolic;
                  if (v === null || v === undefined) return null;
                  return { date: lab.result_date, value: Number(v) };
                })
                .filter(Boolean) as { date: string; value: number }[])
            : [];
          const diastolicRef = isBp
            ? { ...REFERENCE_VALUES["blood_pressure_diastolic"], ...customRefs["blood_pressure_diastolic"] }
            : null;

          // In-range helpers (per-ref)
          const inRangeWith = (refObj: { low?: number; high?: number } | null | undefined, v: number) => {
            if (!refObj) return true;
            if (refObj.high != null && v > refObj.high) return false;
            if (refObj.low != null && v < refObj.low) return false;
            return true;
          };
          const inRangeFor = (v: number) => inRangeWith(ref, v);

          const latestPoint = chartData.length > 0 ? chartData[chartData.length - 1] : null;
          const latestDiaPoint = diastolicChartData.length > 0 ? diastolicChartData[diastolicChartData.length - 1] : null;
          const latestInRange = latestPoint
            ? inRangeFor(latestPoint.value) && (!isBp || !latestDiaPoint || inRangeWith(diastolicRef, latestDiaPoint.value))
            : true;

          // Time-window filter for data points
          const now = new Date();
          const cutoff = new Date(now);
          if (panelWindow === "6m") cutoff.setMonth(cutoff.getMonth() - 6);
          else if (panelWindow === "1y") cutoff.setFullYear(cutoff.getFullYear() - 1);
          else if (panelWindow === "3y") cutoff.setFullYear(cutoff.getFullYear() - 3);
          const inWindow = (date: string) => panelWindow === "all" || new Date(date) >= cutoff;
          const filteredPoints = chartData
            .filter((p) => inWindow(p.date))
            .slice()
            .sort((a, b) => b.date.localeCompare(a.date));
          const filteredDiaPoints = diastolicChartData
            .filter((p) => inWindow(p.date))
            .slice()
            .sort((a, b) => b.date.localeCompare(a.date));

          const winBtn = (k: typeof panelWindow, label: string) => (
            <button
              key={k}
              onClick={() => setPanelWindow(k)}
              className={cn(
                "px-2 py-0.5 rounded-sm text-[11px] transition-colors",
                panelWindow === k
                  ? "bg-background text-foreground shadow-sm font-medium"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {label}
            </button>
          );

          // Panel shows OPPOSITE perspective from the main view:
          // - Graph view ⇒ show data table
          // - Table view ⇒ show graph
          const showGraph = viewMode === "table";

          return (
            <div className="w-[420px] shrink-0 rounded-[20px] border bg-card shadow-card flex flex-col min-h-0 overflow-y-auto">
              {/* Header */}
              <div className="flex items-center justify-between gap-2 p-3 border-b shrink-0">
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className={cn(
                      "inline-block w-2.5 h-2.5 rounded-full shrink-0",
                      latestInRange ? "bg-emerald-500" : "bg-rose-500",
                    )}
                    aria-hidden
                  />
                  <h3 className="font-semibold text-sm truncate">
                    {selectedMarker.label}
                    {selectedMarker.unit && (
                      <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                        ({selectedMarker.unit})
                      </span>
                    )}
                  </h3>
                </div>
                <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => setSelectedMarker(null)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="p-4 flex-1 space-y-5">
                {/* Data points OR Graph (opposite of main view) */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      {showGraph ? "Trend" : "Data points"}
                    </p>
                    {!showGraph && (
                      <div className="inline-flex rounded-md border bg-muted/50 p-0.5">
                        {winBtn("6m", "6m")}
                        {winBtn("1y", "1y")}
                        {winBtn("3y", "3y")}
                        {winBtn("all", "All")}
                      </div>
                    )}
                  </div>
                  {showGraph ? (
                    chartData.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">No data points available.</p>
                    ) : (
                      <MarkerDetailChart
                        label={isBp ? "Systolic" : selectedMarker.label}
                        unit={selectedMarker.unit}
                        chartData={chartData}
                        refValues={ref}
                        secondarySeries={isBp ? diastolicChartData : undefined}
                        secondaryLabel={isBp ? "Diastolic" : undefined}
                        secondaryRefValues={isBp ? diastolicRef : undefined}
                        annotations={annotations.map((a) => ({
                          id: a.id,
                          date: a.annotation_date,
                          text: a.text,
                          author: a.author_name,
                        }))}
                        annotationText={annotationText}
                        annotationDate={annotationDate}
                        onAnnotationTextChange={setAnnotationText}
                        onAnnotationDateChange={setAnnotationDate}
                        onSaveAnnotation={saveAnnotation}
                        onDeleteAnnotation={deleteAnnotation}
                        onCreateTask={createTaskFromMarker}
                      />
                    )
                  ) : filteredPoints.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">No data points in this range.</p>
                  ) : (
                    <div className="rounded-md border overflow-hidden">
                      <table className="w-full text-sm">
                        <thead className="bg-muted/40">
                          <tr className="text-[11px] uppercase tracking-wide text-muted-foreground">
                            <th className="text-left px-3 py-1.5 font-medium">Date</th>
                            <th className="text-left px-3 py-1.5 font-medium">Value</th>
                            <th className="text-left px-3 py-1.5 font-medium">In range</th>
                          </tr>
                        </thead>
                        <tbody>
                          {isBp ? (
                            <>
                              <tr className="bg-muted/20">
                                <td colSpan={3} className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                                  Systolic
                                </td>
                              </tr>
                              {filteredPoints.map((p, idx) => {
                                const inR = inRangeWith(ref, p.value);
                                return (
                                  <tr key={`s-${p.date}-${idx}`} className="border-t">
                                    <td className="px-3 py-1.5 text-xs text-foreground">{new Date(p.date).toLocaleDateString()}</td>
                                    <td className={cn("px-3 py-1.5 text-xs", inR ? "text-foreground" : "font-bold text-rose-600")}>{p.value}</td>
                                    <td className="px-3 py-1.5 text-xs">
                                      <span className="inline-flex items-center gap-1.5">
                                        <span className={cn("inline-block w-2 h-2 rounded-full", inR ? "bg-emerald-500" : "bg-rose-500")} />
                                        {inR ? "Yes" : "No"}
                                      </span>
                                    </td>
                                  </tr>
                                );
                              })}
                              <tr className="bg-muted/20 border-t">
                                <td colSpan={3} className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                                  Diastolic
                                </td>
                              </tr>
                              {filteredDiaPoints.map((p, idx) => {
                                const inR = inRangeWith(diastolicRef, p.value);
                                return (
                                  <tr key={`d-${p.date}-${idx}`} className="border-t">
                                    <td className="px-3 py-1.5 text-xs text-foreground">{new Date(p.date).toLocaleDateString()}</td>
                                    <td className={cn("px-3 py-1.5 text-xs", inR ? "text-foreground" : "font-bold text-rose-600")}>{p.value}</td>
                                    <td className="px-3 py-1.5 text-xs">
                                      <span className="inline-flex items-center gap-1.5">
                                        <span className={cn("inline-block w-2 h-2 rounded-full", inR ? "bg-emerald-500" : "bg-rose-500")} />
                                        {inR ? "Yes" : "No"}
                                      </span>
                                    </td>
                                  </tr>
                                );
                              })}
                            </>
                          ) : (
                            filteredPoints.map((p, idx) => {
                              const inR = inRangeFor(p.value);
                              return (
                                <tr key={`${p.date}-${idx}`} className="border-t">
                                  <td className="px-3 py-1.5 text-xs text-foreground">
                                    {new Date(p.date).toLocaleDateString()}
                                  </td>
                                  <td className={cn(
                                    "px-3 py-1.5 text-xs",
                                    inR ? "text-foreground" : "font-bold text-rose-600",
                                  )}>
                                    {p.value}
                                  </td>
                                  <td className="px-3 py-1.5 text-xs">
                                    <span className="inline-flex items-center gap-1.5">
                                      <span className={cn(
                                        "inline-block w-2 h-2 rounded-full",
                                        inR ? "bg-emerald-500" : "bg-rose-500",
                                      )} />
                                      {inR ? "Yes" : "No"}
                                    </span>
                                  </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Annotations */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Annotations ({annotations.length})
                    </p>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs"
                      onClick={() => setShowAddAnnotation((v) => !v)}
                    >
                      <Plus className="h-3.5 w-3.5 mr-1" />
                      Add annotation
                    </Button>
                  </div>

                  {showAddAnnotation && (
                    <div className="mb-3 rounded-md border p-2 space-y-2 bg-muted/20">
                      <Textarea
                        placeholder="Add a clinical annotation for this marker and date..."
                        value={annotationText}
                        onChange={(e) => setAnnotationText(e.target.value)}
                        className="min-h-[60px] text-xs"
                      />
                      <div className="flex items-center gap-2">
                        <Input
                          type="date"
                          value={annotationDate}
                          onChange={(e) => setAnnotationDate(e.target.value)}
                          className="h-8 text-xs flex-1"
                        />
                        <Button
                          size="sm"
                          className="h-8"
                          onClick={async () => {
                            await saveAnnotation();
                            setShowAddAnnotation(false);
                          }}
                          disabled={!annotationText.trim()}
                        >
                          Save
                        </Button>
                      </div>
                    </div>
                  )}

                  {annotations.length === 0 ? (
                    <p className="text-xs text-muted-foreground py-2">No annotations yet.</p>
                  ) : (
                    <ul className="space-y-2">
                      {annotations.map((a) => (
                        <li key={a.id} className="rounded-md border p-2 text-xs">
                          {editingAnnotationId === a.id ? (
                            <div className="space-y-2">
                              <Textarea
                                value={editingAnnotationText}
                                onChange={(e) => setEditingAnnotationText(e.target.value)}
                                className="min-h-[50px] text-xs"
                              />
                              <div className="flex justify-end gap-1.5">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7"
                                  onClick={() => { setEditingAnnotationId(null); setEditingAnnotationText(""); }}
                                >
                                  Cancel
                                </Button>
                                <Button
                                  size="sm"
                                  className="h-7"
                                  onClick={() => updateAnnotation(a.id, editingAnnotationText.trim())}
                                  disabled={!editingAnnotationText.trim()}
                                >
                                  Save
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0 flex-1">
                                <p className="font-semibold text-foreground">
                                  {new Date(a.annotation_date).toLocaleDateString()}
                                </p>
                                <p className="text-foreground mt-0.5 whitespace-pre-wrap">{a.text}</p>
                                <p className="text-muted-foreground mt-1">— {a.author_name}</p>
                              </div>
                              <div className="flex items-center gap-0.5 shrink-0">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6"
                                  onClick={() => {
                                    setEditingAnnotationId(a.id);
                                    setEditingAnnotationText(a.text);
                                  }}
                                >
                                  <Pencil className="h-3 w-3" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6 text-destructive hover:text-destructive"
                                  onClick={() => deleteAnnotation(a.id)}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {/* Affects Health Dimensions */}
                {MARKER_DIMENSIONS[selectedMarker.key] && (
                  <div>
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
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
}

export default PatientProfilePage;
