import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, ChevronDown, ChevronRight, Users } from "lucide-react";

export type FamilyCondition = {
  condition: string;
  ageAtOnset: number | null;
  notes: string;
};

export type FamilyMember = {
  relation: string;
  age: number | null;
  status: "alive" | "deceased";
  conditions: FamilyCondition[];
};

const DEFAULT_RELATIONS = [
  "Father",
  "Mother",
  "Brother",
  "Sister",
  "Paternal Grandfather",
  "Paternal Grandmother",
  "Maternal Grandfather",
  "Maternal Grandmother",
];

function ConditionRow({
  condition,
  onChange,
  onRemove,
}: {
  condition: FamilyCondition;
  onChange: (c: FamilyCondition) => void;
  onRemove: () => void;
}) {
  return (
    <div className="flex items-start gap-2">
      <div className="flex-1 space-y-1">
        <Input
          placeholder="Condition (e.g. Hypertension)"
          value={condition.condition}
          onChange={(e) => onChange({ ...condition, condition: e.target.value })}
        />
      </div>
      <div className="w-24 space-y-1">
        <Input
          type="number"
          placeholder="Age"
          value={condition.ageAtOnset ?? ""}
          onChange={(e) =>
            onChange({ ...condition, ageAtOnset: e.target.value === "" ? null : Number(e.target.value) })
          }
          min={0}
          max={150}
        />
      </div>
      <div className="flex-1 space-y-1">
        <Input
          placeholder="Notes"
          value={condition.notes}
          onChange={(e) => onChange({ ...condition, notes: e.target.value })}
        />
      </div>
      <Button type="button" variant="ghost" size="icon" className="shrink-0 mt-0.5 text-muted-foreground hover:text-destructive" onClick={onRemove}>
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}

function MemberCard({
  member,
  index,
  onChange,
  onRemove,
}: {
  member: FamilyMember;
  index: number;
  onChange: (m: FamilyMember) => void;
  onRemove: () => void;
}) {
  const [expanded, setExpanded] = useState(true);

  const addCondition = () => {
    onChange({
      ...member,
      conditions: [...member.conditions, { condition: "", ageAtOnset: null, notes: "" }],
    });
  };

  const updateCondition = (ci: number, c: FamilyCondition) => {
    const updated = [...member.conditions];
    updated[ci] = c;
    onChange({ ...member, conditions: updated });
  };

  const removeCondition = (ci: number) => {
    onChange({ ...member, conditions: member.conditions.filter((_, i) => i !== ci) });
  };

  return (
    <div className="rounded-lg border border-border bg-card p-3 space-y-3">
      <div className="flex items-center gap-2">
        <button type="button" onClick={() => setExpanded(!expanded)} className="text-muted-foreground hover:text-foreground">
          {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </button>
        <span className="font-medium text-sm flex-1">{member.relation || `Family Member ${index + 1}`}</span>
        <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={onRemove}>
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>

      {expanded && (
        <div className="space-y-3 pl-6">
          <div className="grid grid-cols-3 gap-2">
            <div className="space-y-1">
              <Label className="text-xs">Relation</Label>
              <Input
                value={member.relation}
                onChange={(e) => onChange({ ...member, relation: e.target.value })}
                placeholder="e.g. Father"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Age</Label>
              <Input
                type="number"
                value={member.age ?? ""}
                onChange={(e) => onChange({ ...member, age: e.target.value === "" ? null : Number(e.target.value) })}
                min={0}
                max={150}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Status</Label>
              <Select value={member.status} onValueChange={(v) => onChange({ ...member, status: v as "alive" | "deceased" })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="alive">Alive</SelectItem>
                  <SelectItem value="deceased">Deceased</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Label className="text-xs text-muted-foreground">Conditions</Label>
              {member.conditions.length > 0 && (
                <div className="grid grid-cols-[1fr_96px_1fr_32px] gap-2 text-[10px] text-muted-foreground uppercase tracking-wider flex-1 pl-0">
                  <span>Condition</span>
                  <span>Onset Age</span>
                  <span>Notes</span>
                  <span />
                </div>
              )}
            </div>
            {member.conditions.map((c, ci) => (
              <ConditionRow
                key={ci}
                condition={c}
                onChange={(updated) => updateCondition(ci, updated)}
                onRemove={() => removeCondition(ci)}
              />
            ))}
            <Button type="button" variant="outline" size="sm" className="gap-1.5 text-xs" onClick={addCondition}>
              <Plus className="h-3 w-3" /> Add Condition
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

interface Props {
  members: FamilyMember[];
  onChange: (members: FamilyMember[]) => void;
}

export function FamilyMemberHistoryEditor({ members, onChange }: Props) {
  const addMember = (relation?: string) => {
    onChange([
      ...members,
      { relation: relation || "", age: null, status: "alive", conditions: [] },
    ]);
  };

  const updateMember = (i: number, m: FamilyMember) => {
    const updated = [...members];
    updated[i] = m;
    onChange(updated);
  };

  const removeMember = (i: number) => {
    onChange(members.filter((_, idx) => idx !== i));
  };

  const usedRelations = members.map((m) => m.relation);
  const availableDefaults = DEFAULT_RELATIONS.filter((r) => !usedRelations.includes(r));

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-1">
        <Users className="h-4 w-4 text-muted-foreground" />
        <h4 className="font-medium">Family Medical History</h4>
      </div>

      {members.map((m, i) => (
        <MemberCard
          key={i}
          member={m}
          index={i}
          onChange={(updated) => updateMember(i, updated)}
          onRemove={() => removeMember(i)}
        />
      ))}

      <div className="flex flex-wrap gap-2">
        {availableDefaults.slice(0, 4).map((rel) => (
          <Button key={rel} type="button" variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => addMember(rel)}>
            <Plus className="h-3 w-3" /> {rel}
          </Button>
        ))}
        <Button type="button" variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => addMember()}>
          <Plus className="h-3 w-3" /> Other
        </Button>
      </div>
    </div>
  );
}
