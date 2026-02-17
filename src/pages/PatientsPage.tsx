import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Users, ArrowUpDown } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend, ResponsiveContainer } from "recharts";
import { AddPatientDialog } from "@/components/patients/AddPatientDialog";

const HEALTH_CATEGORIES = [
  "Senses", "Nervous System", "Physical Performance", "Respiratory",
  "Hormones", "Skin & Mucous", "Immunity",
  "Nutrition", "Liver", "Mental Health",
  "Kidney", "Substances", "Cardiovascular",
  "Cancer Risk", "Musculoskeletal", "Sleep",
];

// Mock radar data: each category has a latest and earlier score (1-10)
const generateRadarData = () =>
  HEALTH_CATEGORIES.map((cat) => ({
    category: cat,
    latest: Math.floor(Math.random() * 7) + 1,
    earlier: Math.floor(Math.random() * 7) + 2,
  }));

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

const mockPatients = [
  { id: "1", name: "Sarah Johnson", age: 34, gender: "F", lastVisit: "Feb 15, 2026", status: "Active", tier: "tier_1", createdAt: "2025-01-10" },
  { id: "2", name: "Mark Davis", age: 52, gender: "M", lastVisit: "Feb 14, 2026", status: "Active", tier: "tier_2", createdAt: "2024-06-22" },
  { id: "3", name: "Emma Wilson", age: 28, gender: "F", lastVisit: "Feb 10, 2026", status: "Active", tier: "children", createdAt: "2025-11-03" },
  { id: "4", name: "James Brown", age: 67, gender: "M", lastVisit: "Feb 8, 2026", status: "Active", tier: "tier_3", createdAt: "2023-08-15" },
  { id: "5", name: "Lisa Chen", age: 41, gender: "F", lastVisit: "Feb 5, 2026", status: "Inactive", tier: "acute", createdAt: "2025-09-01" },
];

const PatientsPage = () => {
  const [search, setSearch] = useState("");
  const [selectedPatient, setSelectedPatient] = useState<string | null>(null);
  const [tierFilter, setTierFilter] = useState("all");
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const filtered = useMemo(() => {
    let list = mockPatients.filter((p) =>
      p.name.toLowerCase().includes(search.toLowerCase())
    );
    if (tierFilter !== "all") {
      list = list.filter((p) => p.tier === tierFilter);
    }
    list.sort((a, b) => {
      let cmp = 0;
      if (sortField === "name") {
        cmp = a.name.localeCompare(b.name);
      } else {
        cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
    return list;
  }, [search, tierFilter, sortField, sortDir]);

  const patient = mockPatients.find((p) => p.id === selectedPatient);

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

      {selectedPatient && patient ? (
        <div className="space-y-6">
          <button onClick={() => setSelectedPatient(null)} className="text-sm text-primary hover:underline">
            ← Back to patient list
          </button>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4 mb-6">
                <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
                  <Users className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h2 className="text-xl font-bold">{patient.name}</h2>
                  <p className="text-muted-foreground">Age {patient.age} • {patient.gender} • Last visit: {patient.lastVisit}</p>
                </div>
                <Badge className="ml-auto">{patient.status}</Badge>
              </div>

              <h3 className="text-lg font-semibold mb-4">Health Overview</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Scale: 1 (no action needed) → 10 (immediate action needed)
              </p>
              <div className="h-[450px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={generateRadarData()} cx="50%" cy="50%" outerRadius="75%">
                    <PolarGrid stroke="hsl(var(--border))" />
                    <PolarAngleAxis
                      dataKey="category"
                      tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                    />
                    <PolarRadiusAxis
                      angle={90}
                      domain={[0, 10]}
                      tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
                    />
                    <Radar
                      name="Latest"
                      dataKey="latest"
                      stroke="hsl(var(--primary))"
                      fill="hsl(var(--primary))"
                      fillOpacity={0.3}
                    />
                    <Radar
                      name="Earlier"
                      dataKey="earlier"
                      stroke="hsl(var(--warning))"
                      fill="hsl(var(--warning))"
                      fillOpacity={0.15}
                    />
                    <Legend />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((patient) => (
            <Card
              key={patient.id}
              className="cursor-pointer hover:border-primary transition-colors"
              onClick={() => setSelectedPatient(patient.id)}
            >
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-sm font-medium text-primary">{patient.name.split(" ").map((n) => n[0]).join("")}</span>
                  </div>
                  <div>
                    <p className="font-medium">{patient.name}</p>
                    <p className="text-sm text-muted-foreground">Age {patient.age} • {patient.gender} • Last visit: {patient.lastVisit}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">{tierLabel(patient.tier)}</Badge>
                  <Badge variant={patient.status === "Active" ? "default" : "secondary"}>{patient.status}</Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default PatientsPage;
