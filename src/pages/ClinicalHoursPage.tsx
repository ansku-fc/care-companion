import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Clock } from "lucide-react";

const tiers = [
  { name: "Tier 1", hours: 12, target: 20 },
  { name: "Tier 2", hours: 8, target: 15 },
  { name: "Tier 3", hours: 5, target: 10 },
  { name: "Tier 4", hours: 2, target: 5 },
  { name: "Children", hours: 6, target: 10 },
  { name: "Onboarding", hours: 3, target: 8 },
  { name: "Acute", hours: 4, target: 6 },
  { name: "Case Management", hours: 7, target: 12 },
];

const ClinicalHoursPage = () => {
  const totalHours = tiers.reduce((a, b) => a + b.hours, 0);
  const totalTarget = tiers.reduce((a, b) => a + b.target, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Clinical Hours</h1>
        <p className="text-muted-foreground">Track your clinical hours by patient type this week.</p>
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-lg font-semibold">Total Weekly Hours</p>
            <p className="text-2xl font-bold">{totalHours}h <span className="text-muted-foreground text-base font-normal">/ {totalTarget}h</span></p>
          </div>
          <Progress value={(totalHours / totalTarget) * 100} className="h-3" />
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        {tiers.map((tier) => (
          <Card key={tier.name}>
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-primary" />
                  <span className="font-medium">{tier.name}</span>
                </div>
                <span className="text-sm text-muted-foreground">{tier.hours}h / {tier.target}h</span>
              </div>
              <Progress value={(tier.hours / tier.target) * 100} className="h-2" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default ClinicalHoursPage;
