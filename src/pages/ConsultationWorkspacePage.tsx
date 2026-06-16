import { useRef, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { ArrowLeft, Pill, ClipboardList, ChevronDown, ChevronRight, Flag, X, ArrowUpRight } from "lucide-react";

type Tone = "rose" | "amber" | "teal";

const DIMENSIONS: { label: string; score: number; band: "HIGH" | "MEDIUM" | "LOW"; tone: Tone }[] = [
  { label: "Cardiovascular Health", score: 9.6, band: "HIGH", tone: "rose" },
  { label: "Metabolic Health", score: 7.8, band: "HIGH", tone: "rose" },
  { label: "Digestion", score: 7.3, band: "HIGH", tone: "rose" },
  { label: "Cancer Risk", score: 6.3, band: "MEDIUM", tone: "amber" },
  { label: "Exercise & Functional", score: 4.0, band: "MEDIUM", tone: "amber" },
  { label: "Brain & Mental Health", score: 2.8, band: "LOW", tone: "teal" },
  { label: "Respiratory & Immune", score: 2.8, band: "LOW", tone: "teal" },
  { label: "Skin, Oral & Mucosal", score: 2.8, band: "LOW", tone: "teal" },
  { label: "Reproductive & Sexual", score: 2.8, band: "LOW", tone: "teal" },
];

type Band = "LOW" | "MEDIUM" | "HIGH";

const BAND_LABEL: Record<Band, string> = { LOW: "Low", MEDIUM: "Medium", HIGH: "High" };
const BAND_MIDPOINT: Record<Band, number> = { LOW: 2.5, MEDIUM: 5.5, HIGH: 8.0 };

function scoreToBand(score: number): Band {
  if (score < 4) return "LOW";
  if (score < 7) return "MEDIUM";
  return "HIGH";
}

function findCurrentDimension(label: string) {
  // labels in DIMENSIONS may be shortened (e.g. "Respiratory & Immune" vs "Respiratory & Immune Health")
  return (
    DIMENSIONS.find((d) => d.label === label) ||
    DIMENSIONS.find((d) => label.startsWith(d.label) || d.label.startsWith(label)) ||
    null
  );
}

const MEDICATIONS = [
  "Lisinopril · 10mg · Morning",
  "Atorvastatin · 20mg · Evening",
  "Warfarin · 5mg · Daily",
  "Metformin · 500mg · Twice daily",
];

const ALLERGIES = ["NSAIDs", "Penicillin", "Tree nuts"];

type LabSeverity = "rose" | "amber" | "neutral";
type LabRow = {
  marker: string;
  value: string;
  unit: string;
  status: string;
  trend: "up" | "down" | "flat";
  severity: LabSeverity;
  flagged: boolean;
  dimension?: string; // mapped dimension for the smart suggestion
};
type LabGroup = { id: string; date: string; label: string; rows: LabRow[] };

const LAB_GROUPS: LabGroup[] = [];

const ALL_DIMENSIONS = [
  "Cardiovascular Health",
  "Metabolic Health",
  "Brain & Mental Health",
  "Exercise & Functional Capacity",
  "Digestion",
  "Cancer Risk",
  "Respiratory & Immune Health",
  "Skin, Oral & Mucosal Health",
  "Reproductive & Sexual Health",
];

const TONE_COLOR: Record<Tone, string> = {
  rose: "#E8446A",
  amber: "#D97706",
  teal: "#0EA5A0",
};

const ASSIGNEES = ["Dr. Laine", "Nurse Mäkinen", "System"] as const;
const TASK_TYPES = ["Referral", "Prescription", "Lab order", "Appointment", "Other"] as const;
const VISIT_TYPES = ["Check-up", "Consultation", "Procedure"] as const;
const TIMEFRAMES = ["2 weeks", "1 month", "3 months", "6 months", "Custom date"] as const;

type Finding = { text: string; flagged: boolean };
type Task = { id: string; title: string; assignee: string; due: string; type: typeof TASK_TYPES[number] };
type Referral = { id: string; specialty: string; referTo: string; assignee: string; due: string; notes: string };
type FollowUp = { id: string; visitType: typeof VISIT_TYPES[number]; timeframe: string; with: string; notes: string };

type OpenForm = null | "task" | "referral" | "followup";

function todayPlus(days: number) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function uid() {
  return Math.random().toString(36).slice(2, 9);
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[11px] font-medium uppercase tracking-[0.08em] text-[#9B8775]">
      {children}
    </div>
  );
}

function GhostButton({
  children,
  className = "",
  onClick,
}: {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        "inline-flex items-center justify-center gap-1.5 rounded-[6px] text-[12px] font-medium text-[#6E5A48] hover:bg-[#F0EBE4] transition-colors h-8 px-3 " +
        className
      }
      style={{ border: "1px solid #E7DCCD" }}
    >
      {children}
    </button>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="bg-white rounded-[8px] flex flex-col gap-2"
      style={{ border: "1px solid #E7DCCD", padding: "16px" }}
    >
      {children}
    </div>
  );
}

function AutoTextarea({
  placeholder,
  value,
  onChange,
  minHeight = 80,
  bordered = false,
}: {
  placeholder: string;
  value?: string;
  onChange?: (v: string) => void;
  minHeight?: number;
  bordered?: boolean;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  return (
    <textarea
      ref={ref}
      placeholder={placeholder}
      value={value}
      onChange={(e) => {
        onChange?.(e.target.value);
        const el = e.currentTarget;
        el.style.height = "auto";
        el.style.height = el.scrollHeight + "px";
      }}
      className="w-full resize-none bg-transparent outline-none text-[14px] font-normal text-[#1F1611] placeholder:text-[#C9BBA9] leading-relaxed py-1"
      style={{ minHeight, border: "none", borderBottom: bordered ? "1px solid #E7DCCD" : "none" }}
    />
  );
}

function VitalInput({
  label,
  suffix,
  value,
  onChange,
}: {
  label: string;
  suffix: string;
  value?: string;
  onChange?: (v: string) => void;
}) {
  return (
    <div className="inline-flex items-baseline gap-1.5 text-[13px] text-[#6E5A48]">
      <span className="uppercase tracking-wide text-[11px] text-[#9B8775]">{label}</span>
      <input
        value={value ?? ""}
        onChange={(e) => onChange?.(e.target.value)}
        className="w-12 text-center bg-transparent outline-none text-[14px] text-[#1F1611] py-0.5"
        style={{ borderBottom: "1px solid #E7DCCD" }}
      />
      <span className="text-[11px] text-[#9B8775]">{suffix}</span>
    </div>
  );
}

function FlagToggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!on)}
      className="inline-flex items-center gap-2 group"
    >
      <span
        className="relative inline-flex items-center w-8 h-[18px] rounded-full transition-colors duration-150"
        style={{ background: on ? "#E8446A" : "#E7DCCD" }}
      >
        <span
          className="absolute top-[2px] h-[14px] w-[14px] rounded-full bg-white shadow-sm transition-all duration-150"
          style={{ left: on ? "16px" : "2px" }}
        />
      </span>
      <span className="text-[12px] text-[#6E5A48] inline-flex items-center gap-1">
        <Flag className="h-3 w-3" style={{ color: on ? "#E8446A" : "#C9BBA9" }} />
        Flag for review
      </span>
    </button>
  );
}

function FindingBlock({
  dimension,
  finding,
  pendingRemoval,
  onChange,
  onFlag,
  onRequestRemove,
  onConfirmRemove,
  onCancelRemove,
}: {
  dimension: string;
  finding: Finding;
  pendingRemoval: boolean;
  onChange: (t: string) => void;
  onFlag: (v: boolean) => void;
  onRequestRemove: () => void;
  onConfirmRemove: () => void;
  onCancelRemove: () => void;
}) {
  return (
    <div
      className="animate-accordion-down overflow-hidden pt-2"
      style={{ borderTop: "1px dashed #F0EBE4" }}
    >
      <div className="text-[12px] font-semibold text-[#6E5A48] mb-1 flex items-center justify-between">
        <span>{dimension}</span>
        <button
          type="button"
          onClick={onRequestRemove}
          className="text-[11px] text-[#C9BBA9] hover:text-[#E8446A] transition-colors"
        >
          Remove
        </button>
      </div>
      <AutoTextarea
        placeholder="Findings and clinical interpretation..."
        value={finding.text}
        onChange={onChange}
        minHeight={56}
        bordered
      />
      <div className="flex items-center justify-between mt-2">
        <FlagToggle on={finding.flagged} onChange={onFlag} />
      </div>

      {pendingRemoval && (
        <div
          className="mt-2 rounded-[6px] p-2 flex items-center justify-between gap-3 animate-fade-in"
          style={{ background: "#FBE4EA" }}
        >
          <span className="text-[12px] text-[#6E5A48]">
            Remove findings for {dimension}? This can't be undone.
          </span>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={onCancelRemove}
              className="text-[12px] font-medium text-[#6E5A48] hover:text-[#2E1F14] px-2 py-1"
            >
              Keep
            </button>
            <button
              onClick={onConfirmRemove}
              className="text-[12px] font-medium text-white px-2 py-1 rounded-[4px]"
              style={{ background: "#E8446A" }}
            >
              Remove
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------- Phase 3 form primitives ---------- */

function FormCard({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="bg-white rounded-[8px] animate-fade-in flex flex-col gap-3"
      style={{ border: "1px solid #E7DCCD", padding: "12px" }}
    >
      {children}
    </div>
  );
}

function TextField({
  value,
  onChange,
  placeholder,
  size = "md",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  size?: "md" | "sm";
}) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={
        "w-full bg-transparent outline-none py-1 placeholder:text-[#C9BBA9] " +
        (size === "md"
          ? "text-[14px] text-[#1F1611]"
          : "text-[12px] text-[#6E5A48]")
      }
      style={{ borderBottom: "1px solid #E7DCCD" }}
    />
  );
}

function SelectField({
  value,
  onChange,
  options,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  options: readonly string[];
  placeholder?: string;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full bg-transparent outline-none text-[12px] text-[#6E5A48] py-1 appearance-none cursor-pointer"
      style={{
        borderBottom: "1px solid #E7DCCD",
        backgroundImage:
          "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='%239B8775' stroke-width='2'><polyline points='6 9 12 15 18 9'/></svg>\")",
        backgroundRepeat: "no-repeat",
        backgroundPosition: "right 2px center",
        paddingRight: 16,
      }}
    >
      {placeholder && (
        <option value="" disabled>
          {placeholder}
        </option>
      )}
      {options.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </select>
  );
}

function DateField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <input
      type="date"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full bg-transparent outline-none text-[12px] text-[#6E5A48] py-1"
      style={{ borderBottom: "1px solid #E7DCCD" }}
    />
  );
}

function ChipSelector<T extends string>({
  options,
  value,
  onChange,
}: {
  options: readonly T[];
  value: T | "";
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1">
      {options.map((o) => {
        const active = o === value;
        return (
          <button
            key={o}
            type="button"
            onClick={() => onChange(o)}
            className="rounded-full text-[11px] font-medium"
            style={{
              padding: "3px 8px",
              background: active ? "#2E1F14" : "#F5F0EA",
              color: active ? "#FFFFFF" : "#9B8775",
              border: active ? "1px solid #2E1F14" : "1px solid #E7DCCD",
              transition:
                "background-color 140ms ease-out, color 140ms ease-out, border-color 140ms ease-out",
            }}
          >
            {o}
          </button>
        );
      })}
    </div>
  );
}

function PrimaryButton({
  children,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="h-7 px-3 rounded-[6px] text-[12px] font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-40"
      style={{ background: "#2E1F14" }}
    >
      {children}
    </button>
  );
}

function CancelLink({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-[12px] text-[#9B8775] hover:text-[#2E1F14] transition-colors"
    >
      Cancel
    </button>
  );
}

function NeutralChip({ children }: { children: React.ReactNode }) {
  return (
    <span
      className="inline-flex items-center rounded-full text-[11px] font-medium"
      style={{ padding: "2px 8px", background: "#F5F0EA", color: "#6E5A48" }}
    >
      {children}
    </span>
  );
}

function RowItem({
  children,
  onRemove,
}: {
  children: React.ReactNode;
  onRemove: () => void;
}) {
  return (
    <div
      className="group relative py-2 pr-6 animate-fade-in"
      style={{ borderTop: "0.5px solid #F0EBE4" }}
    >
      {children}
      <button
        type="button"
        onClick={onRemove}
        className="absolute top-2 right-0 opacity-0 group-hover:opacity-100 transition-opacity"
        aria-label="Remove"
      >
        <X className="h-3.5 w-3.5" style={{ color: "#C9BBA9" }} />
      </button>
    </div>
  );
}

/* ---------- Inline forms ---------- */

function TaskForm({ onSave, onCancel }: { onSave: (t: Task) => void; onCancel: () => void }) {
  const [title, setTitle] = useState("");
  const [assignee, setAssignee] = useState<string>(ASSIGNEES[0]);
  const [due, setDue] = useState(todayPlus(3));
  const [type, setType] = useState<typeof TASK_TYPES[number] | "">("");

  return (
    <FormCard>
      <input
        autoFocus
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="What needs to happen..."
        className="w-full bg-transparent outline-none text-[14px] text-[#1F1611] placeholder:text-[#C9BBA9] py-1"
        style={{ borderBottom: "1px solid #E7DCCD" }}
      />
      <div className="grid grid-cols-2 gap-3">
        <SelectField value={assignee} onChange={setAssignee} options={ASSIGNEES} />
        <DateField value={due} onChange={setDue} />
      </div>
      <ChipSelector options={TASK_TYPES} value={type} onChange={(v) => setType(v)} />
      <div className="flex items-center justify-end gap-3 pt-1">
        <CancelLink onClick={onCancel} />
        <PrimaryButton
          disabled={!title.trim() || !type}
          onClick={() =>
            onSave({
              id: uid(),
              title: title.trim(),
              assignee,
              due,
              type: type as typeof TASK_TYPES[number],
            })
          }
        >
          Add task
        </PrimaryButton>
      </div>
    </FormCard>
  );
}

function ReferralForm({
  onSave,
  onCancel,
}: {
  onSave: (r: Referral) => void;
  onCancel: () => void;
}) {
  const [specialty, setSpecialty] = useState("");
  const [referTo, setReferTo] = useState("");
  const [assignee, setAssignee] = useState<string>(ASSIGNEES[1]);
  const [due, setDue] = useState(todayPlus(7));
  const [notes, setNotes] = useState("");

  return (
    <FormCard>
      <TextField value={specialty} onChange={setSpecialty} placeholder="e.g. Gastroenterology" />
      <TextField
        value={referTo}
        onChange={setReferTo}
        placeholder="Specific clinic or leave blank"
        size="sm"
      />
      <div className="grid grid-cols-2 gap-3">
        <SelectField value={assignee} onChange={setAssignee} options={ASSIGNEES} />
        <DateField value={due} onChange={setDue} />
      </div>
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Reason for referral..."
        className="w-full bg-transparent outline-none text-[12px] text-[#6E5A48] placeholder:text-[#C9BBA9] py-1 resize-none"
        style={{ minHeight: 40, borderBottom: "1px solid #E7DCCD" }}
      />
      <div className="flex items-center justify-end gap-3 pt-1">
        <CancelLink onClick={onCancel} />
        <PrimaryButton
          disabled={!specialty.trim()}
          onClick={() =>
            onSave({
              id: uid(),
              specialty: specialty.trim(),
              referTo: referTo.trim(),
              assignee,
              due,
              notes: notes.trim(),
            })
          }
        >
          Add referral
        </PrimaryButton>
      </div>
    </FormCard>
  );
}

function FollowUpForm({
  onSave,
  onCancel,
}: {
  onSave: (f: FollowUp) => void;
  onCancel: () => void;
}) {
  const [visitType, setVisitType] = useState<typeof VISIT_TYPES[number] | "">("");
  const [timeframe, setTimeframe] = useState<string>(TIMEFRAMES[2]);
  const [withWho, setWithWho] = useState<string>(ASSIGNEES[0]);
  const [notes, setNotes] = useState("");

  return (
    <FormCard>
      <ChipSelector options={VISIT_TYPES} value={visitType} onChange={(v) => setVisitType(v)} />
      <div className="grid grid-cols-2 gap-3">
        <SelectField value={timeframe} onChange={setTimeframe} options={TIMEFRAMES} />
        <SelectField value={withWho} onChange={setWithWho} options={ASSIGNEES.slice(0, 2)} />
      </div>
      <TextField
        value={notes}
        onChange={setNotes}
        placeholder="Purpose of follow-up..."
        size="sm"
      />
      <div className="flex items-center justify-end gap-3 pt-1">
        <CancelLink onClick={onCancel} />
        <PrimaryButton
          disabled={!visitType}
          onClick={() =>
            onSave({
              id: uid(),
              visitType: visitType as typeof VISIT_TYPES[number],
              timeframe,
              with: withWho,
              notes: notes.trim(),
            })
          }
        >
          Add follow-up
        </PrimaryButton>
      </div>
    </FormCard>
  );
}

/* ---------- Main page ---------- */

export default function ConsultationWorkspacePage() {
  const navigate = useNavigate();
  const [medsOpen, setMedsOpen] = useState(false);

  const [findings, setFindings] = useState<Record<string, Finding>>({});
  const [order, setOrder] = useState<string[]>([]);
  const [pendingRemove, setPendingRemove] = useState<string | null>(null);
  const [showValidation, setShowValidation] = useState(false);

  const [tasks, setTasks] = useState<Task[]>([]);
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [followUp, setFollowUp] = useState<FollowUp | null>(null);
  const [openForm, setOpenForm] = useState<OpenForm>(null);

  // Consultation note content (lifted so the review screen can read it)
  const [subjective, setSubjective] = useState("");
  const [bpSys, setBpSys] = useState("");
  const [bpDia, setBpDia] = useState("");
  const [hr, setHr] = useState("");
  const [weight, setWeight] = useState("");
  const [temp, setTemp] = useState("");
  const [labs, setLabs] = useState("");
  const [plan, setPlan] = useState("");

  // Lab inclusion: empty by default (no recent labs to include)
  const [labsIncluded, setLabsIncluded] = useState<Record<string, boolean>>({});
  const [suggestionDismissed, setSuggestionDismissed] = useState(false);
  const labsRef = useRef<HTMLDivElement>(null);

  // View mode + save state
  const [view, setView] = useState<"workspace" | "review">("workspace");
  const [saving, setSaving] = useState(false);

  // Score band confirmation (one per flagged dimension). Initialized when entering review.
  const [scoreBands, setScoreBands] = useState<Record<string, Band>>({});

  const selectedDims = order;
  const flaggedDims = selectedDims.filter((d) => findings[d]?.flagged);
  const flaggedCount = flaggedDims.length;

  // Initialize bands the first time we open review (or when flagged set changes while in review).
  useEffect(() => {
    if (view !== "review") return;
    setScoreBands((prev) => {
      const next: Record<string, Band> = {};
      flaggedDims.forEach((d) => {
        if (prev[d]) {
          next[d] = prev[d];
        } else {
          const cur = findCurrentDimension(d);
          next[d] = cur ? scoreToBand(cur.score) : "MEDIUM";
        }
      });
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, flaggedDims.join("|")]);

  const scoreChanges = flaggedDims
    .map((d) => {
      const cur = findCurrentDimension(d);
      const currentBand: Band | null = cur ? scoreToBand(cur.score) : null;
      const newBand = scoreBands[d];
      if (!newBand || !currentBand || newBand === currentBand) return null;
      return { dim: d, from: currentBand, to: newBand };
    })
    .filter((x): x is { dim: string; from: Band; to: Band } => !!x);

  // Scroll the right column to the form when it opens
  const rightColRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (openForm && rightColRef.current) {
      const target = rightColRef.current.querySelector(`[data-form="${openForm}"]`);
      if (target) target.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [openForm]);

  const toggleDim = (d: string) => {
    if (findings[d]) {
      if (findings[d].text.trim().length > 0) setPendingRemove(d);
      else removeDim(d);
    } else {
      setFindings((prev) => ({ ...prev, [d]: { text: "", flagged: false } }));
      setOrder((prev) => [...prev, d]);
      setShowValidation(false);
    }
  };

  const removeDim = (d: string) => {
    setFindings((prev) => {
      const next = { ...prev };
      delete next[d];
      return next;
    });
    setOrder((prev) => prev.filter((x) => x !== d));
    setPendingRemove(null);
  };

  const updateFinding = (d: string, patch: Partial<Finding>) => {
    setFindings((prev) => ({ ...prev, [d]: { ...prev[d], ...patch } }));
  };

  const onEndConsultation = () => {
    if (selectedDims.length === 0) {
      setShowValidation(true);
      return;
    }
    setView("review");
    window.scrollTo?.({ top: 0 });
  };

  const onSaveAndClose = () => {
    setSaving(true);
    setTimeout(() => {
      const parts: string[] = ["Consultation saved"];
      scoreChanges.forEach((c) => {
        parts.push(`${c.dim} updated to ${BAND_LABEL[c.to]}`);
      });
      if (scoreChanges.length === 0 && flaggedCount > 0) {
        parts.push(`${flaggedCount} dimension${flaggedCount === 1 ? "" : "s"} flagged`);
      }
      if (tasks.length > 0) parts.push(`${tasks.length} task${tasks.length === 1 ? "" : "s"} created`);
      toast.success(parts.join(" · "), {
        duration: 4000,
        style: {
          background: "#E6F4F3",
          color: "#0EA5A0",
          border: "none",
          borderRadius: "8px",
          padding: "12px 16px",
        },
      });
      navigate("/patients");
    }, 700);
  };

  const formatDue = (iso: string) => {
    if (!iso) return "";
    const d = new Date(iso);
    return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  };

  if (view === "review") {
    return (
      <ReviewScreen
        subjective={subjective}
        bpSys={bpSys}
        bpDia={bpDia}
        hr={hr}
        weight={weight}
        temp={temp}
        plan={plan}
        includedLabGroups={LAB_GROUPS.filter((g) => labsIncluded[g.id])}
        selectedDims={selectedDims}
        findings={findings}
        tasks={tasks}
        referrals={referrals}
        followUp={followUp}
        flaggedCount={flaggedCount}
        flaggedDims={flaggedDims}
        scoreBands={scoreBands}
        onChangeBand={(d, b) => setScoreBands((p) => ({ ...p, [d]: b }))}
        scoreChanges={scoreChanges}
        saving={saving}
        onBack={() => setView("workspace")}
        onSave={onSaveAndClose}
        formatDue={formatDue}
      />
    );
  }

  return (
    <div
      className="fixed inset-0 flex flex-col"
      style={{ background: "#F9F7F4", fontFamily: "'Plus Jakarta Sans', sans-serif" }}
    >
      {/* Header */}
      <header
        className="h-14 shrink-0 flex items-center justify-between px-6 bg-white"
        style={{ borderBottom: "1px solid #E7DCCD" }}
      >
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1.5 text-[14px] text-[#6E5A48] hover:text-[#2E1F14] transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> End Consultation
        </button>
        <div className="flex items-baseline gap-2">
          <span className="text-[16px] font-semibold text-[#2E1F14]">Mäkinen, Aino</span>
          <span className="text-[14px] text-[#9B8775]">· Consultation · 11:00–11:30</span>
        </div>
        <div className="flex items-center gap-2">
          <button className="h-8 px-3 rounded-[6px] text-[13px] font-medium text-[#6E5A48] hover:bg-[#F0EBE4] transition-colors">
            Save draft
          </button>
          <button
            onClick={onEndConsultation}
            className="h-8 px-4 rounded-[6px] text-[13px] font-medium text-white transition-opacity hover:opacity-90"
            style={{ background: "#2E1F14" }}
          >
            End Consultation
          </button>
        </div>
      </header>

      <div className="flex-1 min-h-0 flex">
        {/* LEFT — Patient context */}
        <aside
          className="w-[280px] shrink-0 overflow-y-auto p-5 space-y-6"
          style={{ borderRight: "1px solid #E7DCCD" }}
        >
          <SectionLabel>Patient Context</SectionLabel>

          <section>
            <div className="text-[11px] uppercase tracking-[0.08em] text-[#9B8775] mb-2">Health Dimensions</div>
            <div>
              {DIMENSIONS.map((d, i) => (
                <div
                  key={d.label}
                  className="flex items-center justify-between h-7"
                  style={{ borderTop: i === 0 ? "none" : "0.5px solid #F0EBE4" }}
                >
                  <span className="text-[11px] text-[#9B8775]">{d.label}</span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[12px] font-semibold tabular-nums" style={{ color: TONE_COLOR[d.tone] }}>
                      {d.score.toFixed(1)}
                    </span>
                    <span className="text-[10px] font-medium" style={{ color: TONE_COLOR[d.tone] }}>
                      {d.band}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section>
            <button
              onClick={() => setMedsOpen((v) => !v)}
              className="w-full flex items-center justify-between mb-2"
            >
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] uppercase tracking-[0.08em] text-[#9B8775]">Medications</span>
                <span
                  className="inline-flex items-center justify-center min-w-[18px] h-[18px] rounded-full text-[10px] font-medium text-[#6E5A48]"
                  style={{ background: "#F0EBE4", padding: "0 5px" }}
                >
                  {MEDICATIONS.length}
                </span>
              </div>
              {medsOpen ? (
                <ChevronDown className="h-3.5 w-3.5 text-[#9B8775]" />
              ) : (
                <ChevronRight className="h-3.5 w-3.5 text-[#9B8775]" />
              )}
            </button>
            {medsOpen && (
              <div className="space-y-1">
                {MEDICATIONS.map((m) => (
                  <div key={m} className="text-[12px] text-[#2E1F14] flex items-start gap-1.5">
                    <Pill className="h-3 w-3 mt-0.5 text-[#9B8775] shrink-0" />
                    <span>{m}</span>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section>
            <div className="text-[11px] uppercase tracking-[0.08em] text-[#9B8775] mb-2">Allergies</div>
            <div className="flex flex-wrap gap-2">
              {ALLERGIES.map((a) => (
                <div key={a} className="inline-flex items-center gap-1.5 text-[12px] text-[#1F1611]">
                  <span className="h-1.5 w-1.5 rounded-full" style={{ background: "#E8446A" }} />
                  {a}
                </div>
              ))}
            </div>
          </section>

          <section>
            <div className="text-[11px] uppercase tracking-[0.08em] text-[#9B8775] mb-2">Last Labs</div>
            <div className="text-[12px] italic text-[#9B8775]">
              No lab results in the last 90 days.
            </div>
          </section>


          <section>
            <div className="text-[11px] uppercase tracking-[0.08em] text-[#9B8775] mb-2">Last Visit</div>
            <button className="text-[12px] text-[#6E5A48] hover:text-[#2E1F14] text-left transition-colors">
              10 Jun 2026 · Cardiovascular & Liver Review
            </button>
          </section>
        </aside>

        {/* CENTRE */}
        <main className="flex-1 min-w-0 overflow-y-auto px-8 py-6">
          <div className="max-w-[820px] mx-auto">
            <div className="mb-5">
              <div className="text-[11px] uppercase tracking-[0.08em] text-[#9B8775]">Consultation Note</div>
              <div className="text-[12px] text-[#9B8775] mt-0.5">
                Mäkinen, Aino · Tue 17 Jun 2026 · 11:00
              </div>
            </div>

            <div className="space-y-2">
              <Card>
                <SectionLabel>Subjective</SectionLabel>
                <AutoTextarea
                  placeholder="What does the patient report? Symptoms, concerns, changes since last visit..."
                  value={subjective}
                  onChange={setSubjective}
                />
              </Card>

              <Card>
                <SectionLabel>Objective</SectionLabel>
                <div className="flex flex-wrap gap-x-6 gap-y-3 mt-1">
                  <div className="inline-flex items-baseline gap-1.5 text-[13px] text-[#6E5A48]">
                    <span className="uppercase tracking-wide text-[11px] text-[#9B8775]">BP</span>
                    <input
                      value={bpSys}
                      onChange={(e) => setBpSys(e.target.value)}
                      className="w-12 text-center bg-transparent outline-none text-[14px] text-[#1F1611] py-0.5"
                      style={{ borderBottom: "1px solid #E7DCCD" }}
                    />
                    <span className="text-[#9B8775]">/</span>
                    <input
                      value={bpDia}
                      onChange={(e) => setBpDia(e.target.value)}
                      className="w-12 text-center bg-transparent outline-none text-[14px] text-[#1F1611] py-0.5"
                      style={{ borderBottom: "1px solid #E7DCCD" }}
                    />
                    <span className="text-[11px] text-[#9B8775]">mmHg</span>
                  </div>
                  <VitalInput label="HR" suffix="bpm" value={hr} onChange={setHr} />
                  <VitalInput label="Weight" suffix="kg" value={weight} onChange={setWeight} />
                  <VitalInput label="Temp" suffix="°C" value={temp} onChange={setTemp} />
                </div>
                <div className="mt-4 pt-4" style={{ borderTop: "1px solid #F0EBE4" }} ref={labsRef}>
                  <SectionLabel>Recent Lab Results</SectionLabel>
                  {LAB_GROUPS.length === 0 ? (
                    <p className="text-[12px] italic text-[#9B8775] mt-2">
                      No lab results in the last 90 days.
                    </p>
                  ) : (
                    <>
                      <p className="text-[12px] italic text-[#9B8775] mt-0.5 mb-3">
                        From the last 90 days — review and add to findings as needed.
                      </p>
                      <LabResultsBlock
                        groups={LAB_GROUPS}
                        included={labsIncluded}
                        onToggleInclude={(id) =>
                          setLabsIncluded((p) => ({ ...p, [id]: !p[id] }))
                        }
                      />
                    </>
                  )}
                </div>


                <div className="mt-4 pt-4" style={{ borderTop: "1px solid #F0EBE4" }}>
                  <SectionLabel>Doctor's Observations</SectionLabel>
                  <AutoTextarea
                    placeholder="Additional observations, physical findings, vitals noted during visit..."
                    minHeight={60}
                    value={labs}
                    onChange={setLabs}
                  />
                </div>
              </Card>


              <Card>
                <SectionLabel>Assessment</SectionLabel>
                {(() => {
                  // Smart suggestion: flagged labs whose dimension isn't yet selected
                  const missing = Array.from(
                    new Set(
                      LAB_GROUPS[0].rows
                        .filter((r) => r.flagged && r.dimension && !findings[r.dimension!])
                        .map((r) => r.dimension as string),
                    ),
                  );
                  const flaggedMarkers = LAB_GROUPS[0].rows
                    .filter((r) => r.flagged && r.dimension && missing.includes(r.dimension!))
                    .map((r) => r.marker.replace(" Cholesterol", ""));
                  const uniqueMarkers = Array.from(new Set(flaggedMarkers)).slice(0, 3);
                  if (suggestionDismissed || missing.length === 0) return null;
                  return (
                    <div
                      className="flex items-start justify-between gap-3 animate-fade-in"
                      style={{
                        background: "#FEF3C7",
                        borderRadius: 6,
                        padding: "8px 12px",
                        marginBottom: 8,
                      }}
                    >
                      <p className="text-[12px] text-[#6E5A48] leading-snug">
                        <span style={{ color: "#D97706" }}>↑</span>{" "}
                        {uniqueMarkers.join(" and ")}{" "}
                        {uniqueMarkers.length === 1 ? "is" : "are"} flagged — consider tagging{" "}
                        {missing.join(" and ")}.
                      </p>
                      <div className="flex items-center gap-3 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            missing.forEach((d) => {
                              if (!findings[d]) {
                                setFindings((prev) => ({
                                  ...prev,
                                  [d]: { text: "", flagged: false },
                                }));
                                setOrder((prev) => (prev.includes(d) ? prev : [...prev, d]));
                              }
                            });
                          }}
                          className="text-[12px] font-medium text-[#2E1F14] hover:underline"
                        >
                          Add both
                        </button>
                        <button
                          type="button"
                          onClick={() => setSuggestionDismissed(true)}
                          className="text-[12px] text-[#9B8775] hover:text-[#2E1F14] transition-colors"
                        >
                          Dismiss
                        </button>
                      </div>
                    </div>
                  );
                })()}
                <p className="text-[12px] italic text-[#9B8775]">
                  Select the health dimensions relevant to this visit, then add your findings for each.
                </p>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {ALL_DIMENSIONS.map((d) => {
                    const active = !!findings[d];
                    return (
                      <button
                        key={d}
                        onClick={() => toggleDim(d)}
                        className="rounded-full text-[11px] font-medium"
                        style={{
                          padding: "4px 10px",
                          background: active ? "#2E1F14" : "#F5F0EA",
                          color: active ? "#FFFFFF" : "#9B8775",
                          border: active ? "1px solid #2E1F14" : "1px solid #E7DCCD",
                          transition:
                            "background-color 140ms ease-out, color 140ms ease-out, border-color 140ms ease-out",
                        }}
                      >
                        {d}
                      </button>
                    );
                  })}
                </div>

                {selectedDims.length > 0 && (
                  <div className="mt-3 space-y-3">
                    {selectedDims.map((d) => (
                      <FindingBlock
                        key={d}
                        dimension={d}
                        finding={findings[d]}
                        pendingRemoval={pendingRemove === d}
                        onChange={(text) => updateFinding(d, { text })}
                        onFlag={(flagged) => updateFinding(d, { flagged })}
                        onRequestRemove={() => {
                          if (findings[d].text.trim()) setPendingRemove(d);
                          else removeDim(d);
                        }}
                        onConfirmRemove={() => removeDim(d)}
                        onCancelRemove={() => setPendingRemove(null)}
                      />
                    ))}
                  </div>
                )}
              </Card>

              {showValidation && (
                <div
                  className="text-[12px] animate-fade-in px-1"
                  style={{ color: "#D97706" }}
                >
                  No dimensions tagged yet — findings won't be linked to the health overview.
                </div>
              )}

              <Card>
                <SectionLabel>Plan</SectionLabel>
                <AutoTextarea placeholder="Overall plan, patient instructions, follow-up..." value={plan} onChange={setPlan} />
                <div className="flex flex-wrap gap-2 mt-2">
                  <GhostButton onClick={() => setOpenForm("task")}>+ Add task</GhostButton>
                  <GhostButton onClick={() => setOpenForm("referral")}>+ Referral</GhostButton>
                  <GhostButton onClick={() => setOpenForm("task")}>+ Lab order</GhostButton>
                  <GhostButton onClick={() => setOpenForm("followup")}>+ Follow-up</GhostButton>
                </div>
              </Card>
            </div>
          </div>
        </main>

        {/* RIGHT */}
        <aside
          className="w-[320px] shrink-0 flex flex-col"
          style={{ borderLeft: "1px solid #E7DCCD" }}
        >
          <div ref={rightColRef} className="flex-1 min-h-0 overflow-y-auto p-5 space-y-5">
            <div>
              <SectionLabel>Actions</SectionLabel>
              <p className="text-[12px] text-[#9B8775] mt-1">Tasks and actions from this consultation</p>
            </div>

            {/* Dimensions tagged — live */}
            <section className="space-y-2">
              <SectionLabel>Dimensions Tagged</SectionLabel>
              {selectedDims.length === 0 ? (
                <div
                  className="rounded-[8px] flex flex-col items-center justify-center text-center py-6 px-4"
                  style={{ border: "1px dashed #E7DCCD", background: "#FFFFFF" }}
                >
                  <ClipboardList className="h-7 w-7 mb-2" style={{ color: "#E7DCCD" }} />
                  <p className="text-[12px] text-[#9B8775]">
                    Tag dimensions in the Assessment to see them here.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {selectedDims.map((d) => {
                    const f = findings[d];
                    return (
                      <div
                        key={d}
                        className="rounded-[8px] p-3 bg-white animate-fade-in"
                        style={{ border: "1px solid #E7DCCD" }}
                      >
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span
                              className="h-2 w-2 rounded-full shrink-0"
                              style={{ background: f.flagged ? "#E8446A" : "#C9BBA9" }}
                            />
                            <span className="text-[12px] font-medium text-[#2E1F14] truncate">{d}</span>
                          </div>
                          {f.flagged && (
                            <span
                              className="text-[10px] font-medium uppercase tracking-wide shrink-0"
                              style={{ color: "#E8446A" }}
                            >
                              Flagged
                            </span>
                          )}
                        </div>
                        <p className="text-[12px] text-[#6E5A48] truncate">
                          {f.text.trim() ? f.text : <span className="italic text-[#C9BBA9]">No findings yet</span>}
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            {/* TASKS */}
            <section className="space-y-2">
              <SectionLabel>Tasks to Create</SectionLabel>
              {tasks.length > 0 && (
                <div>
                  {tasks.map((t) => (
                    <RowItem key={t.id} onRemove={() => setTasks((p) => p.filter((x) => x.id !== t.id))}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2 min-w-0">
                          <span
                            className="mt-0.5 h-3 w-3 rounded-full shrink-0"
                            style={{ border: "1.5px solid #C9BBA9" }}
                          />
                          <span className="text-[12px] font-medium text-[#2E1F14] truncate">
                            {t.title}
                          </span>
                        </div>
                        <span className="text-[11px] text-[#9B8775] shrink-0">
                          {t.assignee} · {formatDue(t.due)}
                        </span>
                      </div>
                      <div className="mt-1 ml-5">
                        <NeutralChip>{t.type}</NeutralChip>
                      </div>
                    </RowItem>
                  ))}
                </div>
              )}
              {openForm === "task" ? (
                <div data-form="task">
                  <TaskForm
                    onSave={(t) => {
                      setTasks((p) => [...p, t]);
                      setOpenForm(null);
                    }}
                    onCancel={() => setOpenForm(null)}
                  />
                </div>
              ) : (
                <GhostButton className="w-full" onClick={() => setOpenForm("task")}>
                  + Add task manually
                </GhostButton>
              )}
            </section>

            {/* REFERRALS */}
            <section className="space-y-2">
              <SectionLabel>Referrals to Create</SectionLabel>
              {referrals.length > 0 && (
                <div>
                  {referrals.map((r) => (
                    <RowItem
                      key={r.id}
                      onRemove={() => setReferrals((p) => p.filter((x) => x.id !== r.id))}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="text-[12px] font-medium text-[#2E1F14] truncate">
                            {r.specialty}
                            {r.referTo && (
                              <span className="text-[#9B8775] font-normal"> · {r.referTo}</span>
                            )}
                          </div>
                          {r.notes && (
                            <div className="text-[11px] text-[#6E5A48] truncate mt-0.5">
                              "{r.notes}"
                            </div>
                          )}
                        </div>
                        <span className="text-[11px] text-[#9B8775] shrink-0">
                          {r.assignee} · {formatDue(r.due)}
                        </span>
                      </div>
                    </RowItem>
                  ))}
                </div>
              )}
              {openForm === "referral" ? (
                <div data-form="referral">
                  <ReferralForm
                    onSave={(r) => {
                      setReferrals((p) => [...p, r]);
                      setOpenForm(null);
                    }}
                    onCancel={() => setOpenForm(null)}
                  />
                </div>
              ) : (
                <GhostButton className="w-full" onClick={() => setOpenForm("referral")}>
                  + Initiate referral
                </GhostButton>
              )}
            </section>

            {/* FOLLOW-UP */}
            <section className="space-y-2">
              <SectionLabel>Follow-up</SectionLabel>
              {followUp && (
                <RowItem onRemove={() => setFollowUp(null)}>
                  <div className="flex items-start gap-2">
                    <ArrowUpRight
                      className="h-3.5 w-3.5 mt-0.5 shrink-0"
                      style={{ color: "#9B8775" }}
                    />
                    <div className="min-w-0">
                      <div className="text-[12px] font-medium text-[#2E1F14]">
                        Follow-up · {followUp.visitType} · In {followUp.timeframe} · {followUp.with}
                      </div>
                      {followUp.notes && (
                        <div className="text-[11px] text-[#6E5A48] mt-0.5">"{followUp.notes}"</div>
                      )}
                    </div>
                  </div>
                </RowItem>
              )}
              {openForm === "followup" ? (
                <div data-form="followup">
                  <FollowUpForm
                    onSave={(f) => {
                      setFollowUp(f);
                      setOpenForm(null);
                    }}
                    onCancel={() => setOpenForm(null)}
                  />
                </div>
              ) : (
                !followUp && (
                  <GhostButton className="w-full" onClick={() => setOpenForm("followup")}>
                    + Schedule follow-up
                  </GhostButton>
                )
              )}
            </section>
          </div>

          {/* Sticky footer summary */}
          <div
            className="shrink-0 px-5 py-3 bg-white space-y-2"
            style={{ borderTop: "1px solid #E7DCCD" }}
          >
            <div className="text-[12px]" style={{ color: "#9B8775" }}>
              {selectedDims.length} dimension{selectedDims.length === 1 ? "" : "s"} tagged · {tasks.length} task
              {tasks.length === 1 ? "" : "s"} · {referrals.length} referral
              {referrals.length === 1 ? "" : "s"}
              {followUp ? " · 1 follow-up" : ""}
            </div>
            <button
              onClick={onEndConsultation}
              className="w-full h-9 rounded-[6px] text-[13px] font-medium text-white transition-opacity hover:opacity-90"
              style={{ background: "#2E1F14" }}
            >
              End Consultation →
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}

/* ---------- Phase 4: Review screen ---------- */

function ReviewSectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[11px] font-medium uppercase tracking-[0.08em] text-[#9B8775] mb-2">
      {children}
    </div>
  );
}

function EditLink({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-[12px] font-medium text-[#6E5A48] hover:text-[#2E1F14] transition-colors"
    >
      Edit
    </button>
  );
}

function ReviewCard({
  children,
  onEdit,
}: {
  children: React.ReactNode;
  onEdit: () => void;
}) {
  return (
    <div
      className="bg-white rounded-[8px] relative"
      style={{ border: "1px solid #E7DCCD", padding: "16px" }}
    >
      <div className="absolute top-3 right-4">
        <EditLink onClick={onEdit} />
      </div>
      {children}
    </div>
  );
}

function NoteBlock({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[11px] font-medium uppercase tracking-[0.08em] text-[#9B8775] mb-1">
        {label}
      </div>
      <div className="text-[13px] text-[#1F1611] leading-relaxed whitespace-pre-wrap">
        {children}
      </div>
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <span className="text-[13px] italic text-[#9B8775]">{children}</span>;
}

const SEV_COLOR: Record<LabSeverity, string> = {
  rose: "#E8446A",
  amber: "#D97706",
  neutral: "#9B8775",
};

function TrendArrow({ trend, color }: { trend: "up" | "down" | "flat"; color: string }) {
  const ch = trend === "up" ? "↑" : trend === "down" ? "↓" : "→";
  return <span className="text-[12px] font-medium" style={{ color }}>{ch}</span>;
}

function LabResultsBlock({
  groups,
  included,
  onToggleInclude,
}: {
  groups: LabGroup[];
  included: Record<string, boolean>;
  onToggleInclude: (id: string) => void;
}) {
  return (
    <div className="space-y-4">
      {groups.map((g) => (
        <div key={g.id}>
          <div className="text-[12px] text-[#9B8775] mb-1">
            Drawn {g.date} <span className="text-[#C9BBA9]">·</span> {g.label}
          </div>
          <div>
            {g.rows.map((r, i) => (
              <div
                key={r.marker + i}
                className="flex items-center gap-3 h-8"
                style={{ borderTop: i === 0 ? "none" : "0.5px solid #F0EBE4" }}
              >
                <div className="flex-1 min-w-0 text-[14px] font-normal text-[#6E5A48] truncate">
                  {r.marker}
                </div>
                <div className="w-[120px] shrink-0 text-[14px] font-semibold text-[#1F1611] tabular-nums">
                  {r.value} <span className="text-[12px] font-normal text-[#9B8775]">{r.unit}</span>
                </div>
                <div className="w-[140px] shrink-0">
                  <span
                    className="inline-flex items-center rounded-full text-[11px] font-medium"
                    style={{ padding: "2px 8px", background: "#F5F0EA", color: SEV_COLOR[r.severity] }}
                  >
                    {r.status}
                  </span>
                </div>
                <div className="w-[16px] shrink-0 text-right">
                  <TrendArrow trend={r.trend} color={SEV_COLOR[r.severity]} />
                </div>
              </div>
            ))}
          </div>
          <label className="inline-flex items-center gap-2 mt-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={!!included[g.id]}
              onChange={() => onToggleInclude(g.id)}
              className="h-3.5 w-3.5 accent-[#2E1F14]"
            />
            <span className="text-[12px] text-[#6E5A48]">Include in consultation note</span>
          </label>
        </div>
      ))}
    </div>
  );
}



type ScoreChange = { dim: string; from: Band; to: Band };

type ReviewProps = {
  subjective: string;
  bpSys: string;
  bpDia: string;
  hr: string;
  weight: string;
  temp: string;
  plan: string;
  includedLabGroups: LabGroup[];
  selectedDims: string[];
  findings: Record<string, Finding>;
  tasks: Task[];
  referrals: Referral[];
  followUp: FollowUp | null;
  flaggedCount: number;
  flaggedDims: string[];
  scoreBands: Record<string, Band>;
  onChangeBand: (dim: string, band: Band) => void;
  scoreChanges: ScoreChange[];
  saving: boolean;
  onBack: () => void;
  onSave: () => void;
  formatDue: (iso: string) => string;
};

function ReviewScreen(props: ReviewProps) {
  const {
    subjective,
    bpSys,
    bpDia,
    hr,
    weight,
    temp,
    plan,
    includedLabGroups,
    selectedDims,
    findings,
    tasks,
    referrals,
    followUp,
    flaggedCount,
    flaggedDims,
    scoreBands,
    onChangeBand,
    scoreChanges,
    saving,
    onBack,
    onSave,
    formatDue,
  } = props;

  // Footer summary text — varies based on score changes
  const taskPart = `${tasks.length} task${tasks.length === 1 ? "" : "s"}`;
  let summaryText: string;
  if (scoreChanges.length === 0) {
    const parts: string[] = [taskPart];
    if (referrals.length) parts.push(`${referrals.length} referral${referrals.length === 1 ? "" : "s"}`);
    if (followUp) parts.push("1 follow-up");
    summaryText = `This will save the visit note, create ${parts.join(", ")}, and update the health overview.`;
  } else {
    const changesText = scoreChanges
      .map((c) => `${c.dim} from ${BAND_LABEL[c.from]} to ${BAND_LABEL[c.to]}`)
      .join(", ");
    summaryText = `This will save the visit note, create ${taskPart}, update ${changesText}, and flag ${scoreChanges.length === 1 ? "it" : "them"} for review.`;
  }

  return (
    <div
      className="fixed inset-0 flex flex-col"
      style={{ background: "#FDF6EE", fontFamily: "'Plus Jakarta Sans', sans-serif" }}
    >
      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="max-w-[680px] mx-auto px-6 pt-8 pb-32">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-1.5 text-[14px] text-[#6E5A48] hover:text-[#2E1F14] transition-colors mb-6"
          >
            <ArrowLeft className="h-4 w-4" /> Back to consultation
          </button>

          <h1
            className="text-[32px] leading-tight text-[#2E1F14] font-serif-display"
            style={{ fontFamily: "'Belleza', serif" }}
          >
            Review & Save
          </h1>
          <p className="text-[14px] text-[#9B8775] mt-1">
            Mäkinen, Aino · Consultation · Tue 17 Jun 2026 · 11:00–11:30
          </p>

          <div className="mt-8 space-y-6">
            {/* Section 1 — Consultation note */}
            <section>
              <ReviewSectionLabel>Consultation Note</ReviewSectionLabel>
              <ReviewCard onEdit={onBack}>
                <div className="space-y-4">
                  <NoteBlock label="Subjective">
                    {subjective.trim() ? subjective : <Empty>No subjective notes.</Empty>}
                  </NoteBlock>
                  <NoteBlock label="Objective">
                    <div className="text-[13px] text-[#1F1611]">
                      BP {bpSys || "—"}/{bpDia || "—"} mmHg
                      <span className="text-[#9B8775]"> · </span>
                      HR {hr || "—"} bpm
                      <span className="text-[#9B8775]"> · </span>
                      Weight {weight || "—"}
                      {weight && " kg"}
                      <span className="text-[#9B8775]"> · </span>
                      Temp {temp || "—"}
                      {temp && " °C"}
                    </div>
                    {includedLabGroups.map((g) => {
                      const flagged = g.rows.filter((r) => r.flagged);
                      return (
                        <div key={g.id} className="text-[13px] text-[#1F1611] mt-2">
                          <span className="text-[#9B8775]">Labs · {g.date} ({g.label}):</span>{" "}
                          {flagged.length === 0
                            ? "no flagged values"
                            : flagged
                                .map((r) => `${r.marker} ${r.value} ${r.unit}`)
                                .join(", ")}
                        </div>
                      );
                    })}
                  </NoteBlock>
                  <NoteBlock label="Plan">
                    {plan.trim() ? plan : <Empty>No plan notes.</Empty>}
                  </NoteBlock>
                </div>
              </ReviewCard>
            </section>

            {/* Section 2 — Dimensions affected */}
            <section>
              <ReviewSectionLabel>Dimensions Affected</ReviewSectionLabel>
              <ReviewCard onEdit={onBack}>
                {selectedDims.length === 0 ? (
                  <Empty>No dimensions tagged.</Empty>
                ) : (
                  <div>
                    {selectedDims.map((d, i) => {
                      const f = findings[d];
                      return (
                        <div
                          key={d}
                          className="py-2.5"
                          style={{ borderTop: i === 0 ? "none" : "0.5px solid #F0EBE4" }}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2 min-w-0">
                              <span
                                className="h-2 w-2 rounded-full shrink-0"
                                style={{ background: f.flagged ? "#E8446A" : "#C9BBA9" }}
                              />
                              <span className="text-[13px] font-medium text-[#1F1611] truncate">
                                {d}
                              </span>
                            </div>
                            {f.flagged ? (
                              <span
                                className="text-[11px] font-medium shrink-0"
                                style={{ color: "#E8446A" }}
                              >
                                Flagged for review
                              </span>
                            ) : (
                              <span className="text-[11px] text-[#9B8775] shrink-0">Noted</span>
                            )}
                          </div>
                          {f.text.trim() && (
                            <p className="text-[12px] text-[#6E5A48] truncate ml-4 mt-0.5">
                              "{f.text}"
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </ReviewCard>
            </section>

            {/* Section 2b — Dimension scores (only when ≥1 flagged) */}
            {flaggedDims.length > 0 && (
              <section>
                <ReviewSectionLabel>Dimension Scores</ReviewSectionLabel>
                <p className="text-[12px] italic text-[#9B8775] -mt-1 mb-2">
                  Review and confirm risk scores for flagged dimensions. Unflagged dimensions are unchanged.
                </p>
                <ReviewCard onEdit={onBack}>
                  <div>
                    {flaggedDims.map((d, i) => {
                      const cur = findCurrentDimension(d);
                      const currentBand: Band | null = cur ? scoreToBand(cur.score) : null;
                      const selected = scoreBands[d];
                      const changed = !!(currentBand && selected && selected !== currentBand);
                      const direction =
                        currentBand && selected
                          ? BAND_MIDPOINT[selected] > BAND_MIDPOINT[currentBand]
                            ? "up"
                            : "down"
                          : null;
                      return (
                        <div
                          key={d}
                          className="flex items-center gap-4 min-h-[48px] py-2"
                          style={{ borderTop: i === 0 ? "none" : "0.5px solid #F0EBE4" }}
                        >
                          <div className="min-w-0 w-[180px] shrink-0">
                            <div className="text-[14px] font-medium text-[#2E1F14] truncate">{d}</div>
                            <div className="text-[12px] text-[#9B8775]">
                              {cur
                                ? `Currently ${cur.score.toFixed(1)} · ${cur.band}`
                                : "New dimension"}
                            </div>
                          </div>
                          <div className="flex items-center gap-1 flex-1">
                            {(["LOW", "MEDIUM", "HIGH"] as Band[]).map((b) => {
                              const active = selected === b;
                              const sel = {
                                LOW: { bg: "#E6F4F3", fg: "#0EA5A0" },
                                MEDIUM: { bg: "#FEF3C7", fg: "#D97706" },
                                HIGH: { bg: "#FBE4EA", fg: "#E8446A" },
                              }[b];
                              const range = { LOW: "0–4", MEDIUM: "4–7", HIGH: "7–10" }[b];
                              return (
                                <button
                                  key={b}
                                  type="button"
                                  onClick={() => onChangeBand(d, b)}
                                  className="rounded-[6px] text-[12px] font-medium px-2.5 py-1 transition-colors"
                                  style={{
                                    background: active ? sel.bg : "#F5F0EA",
                                    color: active ? sel.fg : "#9B8775",
                                  }}
                                >
                                  {b} {range}
                                </button>
                              );
                            })}
                          </div>
                          <div className="w-[120px] shrink-0 text-right">
                            {changed ? (
                              <span
                                className="text-[11px] font-medium"
                                style={{ color: "#D97706" }}
                              >
                                {direction === "up" ? "↑" : "↓"} Will update to {BAND_LABEL[selected]}
                              </span>
                            ) : (
                              <span className="text-[11px]" style={{ color: "#C9BBA9" }}>
                                No change
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <p
                    className="text-[11px] italic mt-3 pt-3"
                    style={{ color: "#9B8775", borderTop: "0.5px solid #F0EBE4" }}
                  >
                    Scores reflect clinical judgement and are visible in the patient health overview.
                    Lab results update scores automatically when imported.
                  </p>
                </ReviewCard>
              </section>
            )}

            {/* Section 3 — Tasks */}
            <section>
              <ReviewSectionLabel>Tasks to Create</ReviewSectionLabel>
              <ReviewCard onEdit={onBack}>
                {tasks.length === 0 ? (
                  <Empty>No tasks added.</Empty>
                ) : (
                  <div>
                    {tasks.map((t, i) => (
                      <div
                        key={t.id}
                        className="py-2.5"
                        style={{ borderTop: i === 0 ? "none" : "0.5px solid #F0EBE4" }}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-2 min-w-0">
                            <span
                              className="mt-1 h-3 w-3 rounded-full shrink-0"
                              style={{ border: "1.5px solid #C9BBA9" }}
                            />
                            <span className="text-[13px] font-medium text-[#1F1611] truncate">
                              {t.title}
                            </span>
                          </div>
                          <span className="text-[11px] text-[#9B8775] shrink-0">
                            {t.assignee} · {formatDue(t.due)}
                          </span>
                        </div>
                        <div className="mt-1 ml-5">
                          <NeutralChip>{t.type}</NeutralChip>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ReviewCard>
            </section>

            {/* Section 4 — Referrals */}
            <section>
              <ReviewSectionLabel>Referrals</ReviewSectionLabel>
              <ReviewCard onEdit={onBack}>
                {referrals.length === 0 ? (
                  <Empty>No referrals added.</Empty>
                ) : (
                  <div>
                    {referrals.map((r, i) => (
                      <div
                        key={r.id}
                        className="py-2.5"
                        style={{ borderTop: i === 0 ? "none" : "0.5px solid #F0EBE4" }}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-2 min-w-0">
                            <ArrowUpRight
                              className="h-3.5 w-3.5 mt-0.5 shrink-0"
                              style={{ color: "#9B8775" }}
                            />
                            <span className="text-[13px] font-medium text-[#1F1611] truncate">
                              {r.specialty}
                              {r.referTo && (
                                <span className="text-[#9B8775] font-normal"> — {r.referTo}</span>
                              )}
                            </span>
                          </div>
                          <span className="text-[11px] text-[#9B8775] shrink-0">
                            {r.assignee} · {formatDue(r.due)}
                          </span>
                        </div>
                        {r.notes && (
                          <p className="text-[12px] text-[#6E5A48] ml-5 mt-0.5">"{r.notes}"</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </ReviewCard>
            </section>

            {/* Section 5 — Follow-up */}
            <section>
              <ReviewSectionLabel>Follow-up</ReviewSectionLabel>
              <ReviewCard onEdit={onBack}>
                {!followUp ? (
                  <Empty>No follow-up scheduled.</Empty>
                ) : (
                  <div className="flex items-start gap-2">
                    <ArrowUpRight
                      className="h-3.5 w-3.5 mt-0.5 shrink-0"
                      style={{ color: "#9B8775" }}
                    />
                    <div className="min-w-0">
                      <div className="text-[13px] font-medium text-[#1F1611]">
                        {followUp.visitType} · In {followUp.timeframe} · {followUp.with}
                      </div>
                      {followUp.notes && (
                        <p className="text-[12px] text-[#6E5A48] mt-0.5">"{followUp.notes}"</p>
                      )}
                    </div>
                  </div>
                )}
              </ReviewCard>
            </section>
          </div>
        </div>
      </div>

      {/* Sticky bottom bar */}
      <div
        className="shrink-0 bg-white px-6 py-4"
        style={{ borderTop: "1px solid #E7DCCD" }}
      >
        <div className="max-w-[680px] mx-auto flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={onBack}
            disabled={saving}
            className="inline-flex items-center gap-1.5 h-9 px-3 rounded-[6px] text-[13px] font-medium text-[#6E5A48] hover:bg-[#F0EBE4] transition-colors"
            style={{ border: "1px solid #E7DCCD" }}
          >
            <ArrowLeft className="h-4 w-4" /> Back to consultation
          </button>
          <div className="flex flex-col items-end gap-1">
            <button
              type="button"
              onClick={onSave}
              disabled={saving}
              className="h-9 px-5 rounded-[6px] text-[13px] font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-60"
              style={{ background: "#2E1F14" }}
            >
              {saving ? "Saving..." : "Save & Close"}
            </button>
            <span className="text-[11px] text-[#9B8775] text-right max-w-[360px]">
              {summaryText}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
