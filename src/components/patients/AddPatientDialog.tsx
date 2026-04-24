import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus } from "lucide-react";
import { toast } from "sonner";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useQueryClient } from "@tanstack/react-query";

const TIER_OPTIONS = [
  { value: "tier_1", label: "Tier 1" },
  { value: "tier_2", label: "Tier 2" },
  { value: "tier_3", label: "Tier 3" },
  { value: "tier_4", label: "Tier 4" },
];

const LANGUAGE_OPTIONS = ["Finnish", "Swedish", "English", "Russian", "Estonian", "German", "Spanish", "French", "Other"];

const SEX_OPTIONS = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "other", label: "Other" },
];

type FormState = {
  first_name: string;
  last_name: string;
  date_of_birth: string;
  gender: string;
  personal_id: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  post_code: string;
  primary_language: string;
  insurance_provider: string;
  tier: string;
  assigned_doctor_id: string;
};

const blankForm: FormState = {
  first_name: "",
  last_name: "",
  date_of_birth: "",
  gender: "",
  personal_id: "",
  phone: "",
  email: "",
  address: "",
  city: "",
  post_code: "",
  primary_language: "",
  insurance_provider: "",
  tier: "tier_1",
  assigned_doctor_id: "",
};

type DoctorOption = { user_id: string; full_name: string };

export function AddPatientDialog() {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>({ ...blankForm });
  const [saving, setSaving] = useState(false);
  const [doctors, setDoctors] = useState<DoctorOption[]>([]);
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      // Fetch users with the doctor role only
      const { data: roles } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "doctor");
      const ids = (roles ?? []).map((r) => r.user_id);
      if (ids.length === 0) {
        if (!cancelled) setDoctors([]);
        return;
      }
      const { data: profs } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", ids);
      if (!cancelled) setDoctors((profs ?? []).filter((p) => p.full_name?.trim()));
    })();
    return () => {
      cancelled = true;
    };
  }, [open]);

  const update = <K extends keyof FormState>(field: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const reset = () => setForm({ ...blankForm });

  const handleSave = async () => {
    if (!user) {
      toast.error("You must be logged in");
      return;
    }
    if (!form.first_name.trim() || !form.last_name.trim()) {
      toast.error("First and last name are required");
      return;
    }

    setSaving(true);
    try {
      const fullName = `${form.last_name.trim()}, ${form.first_name.trim()}`;
      const { data: patient, error } = await supabase
        .from("patients")
        .insert({
          full_name: fullName,
          gender: form.gender || null,
          date_of_birth: form.date_of_birth || null,
          email: form.email.trim() || null,
          phone: form.phone.trim() || null,
          address: form.address.trim() || null,
          city: form.city.trim() || null,
          post_code: form.post_code.trim() || null,
          primary_language: form.primary_language || null,
          personal_id: form.personal_id.trim() || null,
          insurance_provider: form.insurance_provider.trim() || null,
          tier: (form.tier as any) || "tier_1",
          assigned_doctor_id: form.assigned_doctor_id || null,
          onboarding_status: "pending",
          created_by: user.id,
        } as any)
        .select("id")
        .single();

      if (error) throw error;

      toast.success("Patient profile created");
      queryClient.invalidateQueries({ queryKey: ["patients"] });
      const newId = patient.id;
      reset();
      setOpen(false);
      navigate(`/patients/${newId}`);
    } catch (e: any) {
      toast.error(e.message ?? "Failed to create patient");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button className="gap-1.5">
          <Plus className="h-4 w-4" />
          Add New Patient
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto rounded-xl">
        <DialogHeader>
          <DialogTitle className="text-xl">Create Patient Profile</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5 pt-2">
          {/* LEFT COLUMN — identity */}
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Field label="First name" required>
                <Input
                  value={form.first_name}
                  onChange={(e) => update("first_name", e.target.value)}
                  placeholder="Marcus"
                />
              </Field>
              <Field label="Last name" required>
                <Input
                  value={form.last_name}
                  onChange={(e) => update("last_name", e.target.value)}
                  placeholder="Eriksson"
                />
              </Field>
            </div>

            <Field label="Date of birth">
              <Input
                type="date"
                value={form.date_of_birth}
                onChange={(e) => update("date_of_birth", e.target.value)}
              />
            </Field>

            <Field label="Sex at birth">
              <SegmentedControl
                value={form.gender}
                options={SEX_OPTIONS}
                onChange={(v) => update("gender", v)}
              />
            </Field>

            <Field label="Personal ID (henkilötunnus)">
              <Input
                value={form.personal_id}
                onChange={(e) => update("personal_id", e.target.value)}
                placeholder="010190-123A"
              />
            </Field>
          </div>

          {/* RIGHT COLUMN — contact + assignment */}
          <div className="space-y-4">
            <Field label="Phone number">
              <Input
                value={form.phone}
                onChange={(e) => update("phone", e.target.value)}
                placeholder="+358 40 123 4567"
              />
            </Field>

            <Field label="Email">
              <Input
                type="email"
                value={form.email}
                onChange={(e) => update("email", e.target.value)}
                placeholder="patient@example.com"
              />
            </Field>

            <Field label="Address">
              <Input
                value={form.address}
                onChange={(e) => update("address", e.target.value)}
                placeholder="Mannerheimintie 12 A 4"
              />
              <div className="grid grid-cols-2 gap-3 mt-2">
                <Input
                  value={form.city}
                  onChange={(e) => update("city", e.target.value)}
                  placeholder="City"
                />
                <Input
                  value={form.post_code}
                  onChange={(e) => update("post_code", e.target.value)}
                  placeholder="Postal code"
                />
              </div>
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Primary language">
                <Select
                  value={form.primary_language}
                  onValueChange={(v) => update("primary_language", v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    {LANGUAGE_OPTIONS.map((l) => (
                      <SelectItem key={l} value={l}>
                        {l}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

              <Field label="Insurance / payer">
                <Input
                  value={form.insurance_provider}
                  onChange={(e) => update("insurance_provider", e.target.value)}
                  placeholder="Free text"
                />
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Tier">
                <Select value={form.tier} onValueChange={(v) => update("tier", v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TIER_OPTIONS.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

              <Field label="Assigned doctor">
                <Select
                  value={form.assigned_doctor_id || undefined}
                  onValueChange={(v) => update("assigned_doctor_id", v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={doctors.length ? "Select doctor" : "No doctors found"} />
                  </SelectTrigger>
                  <SelectContent>
                    {doctors.map((d) => (
                      <SelectItem key={d.user_id} value={d.user_id}>
                        {d.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-6 mt-2 border-t">
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ---------- small local UI helpers ---------- */

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium text-muted-foreground">
        {label}
        {required && <span className="text-destructive ml-0.5">*</span>}
      </Label>
      {children}
    </div>
  );
}

function SegmentedControl({
  value,
  options,
  onChange,
}: {
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
}) {
  return (
    <div className="inline-flex h-11 w-full rounded-xl border border-input bg-background p-1">
      {options.map((opt) => {
        const active = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={cn(
              "flex-1 text-sm rounded-lg transition-colors",
              active
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
