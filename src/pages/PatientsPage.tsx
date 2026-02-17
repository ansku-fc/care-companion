import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Users } from "lucide-react";

const HEALTH_CATEGORIES = [
  "Senses", "Nervous System", "Physical Performance", "Respiratory System",
  "Hormone Function", "Skin & Mucous Membranes", "Immunity & Allergies",
  "Body Composition & Nutrition", "Liver Function", "Mental Health",
  "Kidney Function", "Alcohol & Other Substances", "Cardiovascular System",
  "Cancer Risk", "Musculoskeletal System", "Sleep",
];

const mockPatients = [
  { id: "1", name: "Sarah Johnson", age: 34, gender: "F", lastVisit: "Feb 15, 2026", status: "Active" },
  { id: "2", name: "Mark Davis", age: 52, gender: "M", lastVisit: "Feb 14, 2026", status: "Active" },
  { id: "3", name: "Emma Wilson", age: 28, gender: "F", lastVisit: "Feb 10, 2026", status: "Active" },
  { id: "4", name: "James Brown", age: 67, gender: "M", lastVisit: "Feb 8, 2026", status: "Active" },
  { id: "5", name: "Lisa Chen", age: 41, gender: "F", lastVisit: "Feb 5, 2026", status: "Inactive" },
];

const PatientsPage = () => {
  const [search, setSearch] = useState("");
  const [selectedPatient, setSelectedPatient] = useState<string | null>(null);

  const filtered = mockPatients.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  const patient = mockPatients.find((p) => p.id === selectedPatient);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Patients</h1>
        <p className="text-muted-foreground">Search and manage patient records.</p>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search patients..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
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
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {HEALTH_CATEGORIES.map((cat) => (
                  <Card key={cat} className="cursor-pointer hover:border-primary transition-colors">
                    <CardContent className="p-4">
                      <p className="text-sm font-medium">{cat}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <div className="h-2 w-2 rounded-full bg-success" />
                        <span className="text-xs text-muted-foreground">Normal</span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
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
                <Badge variant={patient.status === "Active" ? "default" : "secondary"}>{patient.status}</Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default PatientsPage;
