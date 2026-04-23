import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, ArrowUpDown } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { AddPatientDialog } from "@/components/patients/AddPatientDialog";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

const TIER_OPTIONS = [
  { value: "all", label: "All Tiers" },
  { value: "tier_1", label: "Tier 1" },
  { value: "tier_2", label: "Tier 2" },
  { value: "tier_3", label: "Tier 3" },
  { value: "tier_4", label: "Tier 4" },
  { value: "children", label: "Children" },
  { value: "onboarding", label: "Onboarding" },
  { value: "acute", label: "Acute" },
  { value: "case_management", label: "Case Management" },
];

type SortField = "name" | "date";
type SortDir = "asc" | "desc";

const PatientsPage = () => {
  const navigate = useNavigate();
  const [patients, setPatients] = useState<Tables<"patients">[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [tierFilter, setTierFilter] = useState("all");
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const fetchPatients = async () => {
    setLoading(true);
    const { data } = await supabase.from("patients").select("*").order("full_name");
    setPatients(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchPatients();
  }, []);

  const filtered = useMemo(() => {
    let list = patients.filter((p) =>
      p.full_name.toLowerCase().includes(search.toLowerCase())
    );
    if (tierFilter !== "all") {
      list = list.filter((p) => p.tier === tierFilter);
    }
    list.sort((a, b) => {
      let cmp = 0;
      if (sortField === "name") {
        cmp = a.full_name.localeCompare(b.full_name);
      } else {
        cmp = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
    return list;
  }, [patients, search, tierFilter, sortField, sortDir]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  };

  const tierLabel = (tier: string) =>
    TIER_OPTIONS.find((t) => t.value === tier)?.label ?? tier;

  const getAge = (dob: string | null) => {
    if (!dob) return null;
    return Math.floor((Date.now() - new Date(dob).getTime()) / 31557600000);
  };

  const getInitials = (name: string) => {
    // Supports "Surname, First" → "FS" (first-name initial + surname initial)
    // Falls back to "First Last" → "FL" for legacy values.
    if (name.includes(",")) {
      const [surname, rest = ""] = name.split(",").map((s) => s.trim());
      const firstInitial = rest.split(/\s+/)[0]?.[0] ?? "";
      const surnameInitial = surname[0] ?? "";
      return (firstInitial + surnameInitial).toUpperCase();
    }
    return name.split(/\s+/).map((n) => n[0]).join("").toUpperCase();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Patients</h1>
        <p className="text-muted-foreground">Search and manage patient records.</p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <AddPatientDialog />
        <div className="relative max-w-xs flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search patients..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        <Select value={tierFilter} onValueChange={setTierFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Filter by tier" />
          </SelectTrigger>
          <SelectContent>
            {TIER_OPTIONS.map((t) => (
              <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button variant="outline" size="sm" onClick={() => toggleSort("name")} className="gap-1.5">
          <ArrowUpDown className="h-3.5 w-3.5" />
          Name {sortField === "name" ? (sortDir === "asc" ? "A–Z" : "Z–A") : ""}
        </Button>
        <Button variant="outline" size="sm" onClick={() => toggleSort("date")} className="gap-1.5">
          <ArrowUpDown className="h-3.5 w-3.5" />
          Joined {sortField === "date" ? (sortDir === "asc" ? "oldest" : "newest") : ""}
        </Button>
      </div>

      {loading ? (
        <p className="text-muted-foreground">Loading patients...</p>
      ) : filtered.length === 0 ? (
        <p className="text-muted-foreground">No patients found.</p>
      ) : (
        <div className="space-y-2">
          {filtered.map((patient) => {
            const age = getAge(patient.date_of_birth);
            return (
              <Card
                key={patient.id}
                className="cursor-pointer hover:border-primary transition-colors"
                onClick={() => navigate(`/patients/${patient.id}`)}
              >
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-sm font-medium text-primary">{getInitials(patient.full_name)}</span>
                    </div>
                    <div>
                      <p className="font-medium">{patient.full_name}</p>
                      <p className="text-sm text-muted-foreground">
                        {age != null ? `Age ${age}` : ""}{age != null && patient.gender ? " • " : ""}{patient.gender || ""}
                        {(age != null || patient.gender) && patient.created_at ? " • " : ""}
                        {patient.created_at ? `Joined ${new Date(patient.created_at).toLocaleDateString()}` : ""}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {patient.tier && <Badge variant="outline" className="text-xs">{tierLabel(patient.tier)}</Badge>}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default PatientsPage;
