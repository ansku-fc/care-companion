import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Search, Plus, StickyNote, Trash2, Pencil, X, Check } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";

export interface DoctorNote {
  id: string;
  title: string;
  content: string;
  date: string;
}

const INITIAL_NOTES: DoctorNote[] = [
  { id: "n1", title: "Meeting notes - Dr. Patel", content: "Discussed patient referral workflow and new onboarding procedures. Need to follow up on digital forms integration. Key action items:\n- Set up shared referral template\n- Schedule follow-up for next Tuesday\n- Review onboarding checklist with nursing team", date: "2026-03-07" },
  { id: "n2", title: "Research: New treatment protocols", content: "Review latest guidelines for Tier 2 patients regarding cardiovascular risk reduction. Update care plans accordingly.\n\nKey points:\n- LDL target < 1.4 mmol/L for high-risk patients\n- Consider PCSK9 inhibitors when statins insufficient\n- New SGLT2 data for heart failure prevention", date: "2026-03-05" },
  { id: "n3", title: "Weekly review checklist", content: "1. Review lab results for all Tier 1 patients\n2. Update patient records and care plans\n3. Follow-up calls for post-procedure patients\n4. Prepare reports for Friday clinical meeting\n5. Check medication refill requests\n6. Update clinical hours log", date: "2026-03-04" },
  { id: "n4", title: "Case discussion prep", content: "Prepare presentation on complex metabolic syndrome case for team case discussion on Thursday.\n\nPatient overview: 52M, BMI 34, T2DM, HTN, dyslipidemia. Recent HbA1c 58 mmol/mol despite dual therapy. Consider adding GLP-1 RA.\n\nDiscuss multidisciplinary approach with endocrinology and nutrition teams.", date: "2026-03-03" },
  { id: "n5", title: "Clinic workflow improvements", content: "Ideas discussed during team standup:\n- Implement pre-visit questionnaire for onboarding patients\n- Standardize acute visit triage protocol\n- Set up automated lab result notifications\n- Create template for specialist referral letters", date: "2026-03-01" },
  { id: "n6", title: "Conference notes – Preventive Medicine 2026", content: "Highlights from the Nordic Preventive Medicine Conference:\n- Emerging biomarkers for early cardiovascular risk detection\n- AI-assisted skin screening validation studies\n- New exercise prescription guidelines for metabolic syndrome\n- Gut microbiome and immune function – latest evidence", date: "2026-02-27" },
];

const NotesPage = () => {
  const [notes, setNotes] = useState<DoctorNote[]>(INITIAL_NOTES);
  const [search, setSearch] = useState("");
  const [editingNote, setEditingNote] = useState<DoctorNote | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const filtered = notes.filter(
    (n) => n.title.toLowerCase().includes(search.toLowerCase()) || n.content.toLowerCase().includes(search.toLowerCase())
  );

  const handleSave = () => {
    if (!editingNote?.title.trim()) {
      toast({ title: "Title required", variant: "destructive" });
      return;
    }
    if (isNew) {
      setNotes((prev) => [{ ...editingNote!, id: `n-${Date.now()}`, date: new Date().toISOString().slice(0, 10) }, ...prev]);
      toast({ title: "Note created" });
    } else {
      setNotes((prev) => prev.map((n) => (n.id === editingNote!.id ? editingNote! : n)));
      toast({ title: "Note updated" });
    }
    setDialogOpen(false);
    setEditingNote(null);
  };

  const handleDelete = (id: string) => {
    setNotes((prev) => prev.filter((n) => n.id !== id));
    setDeleteId(null);
    toast({ title: "Note deleted" });
  };

  const openNew = () => {
    setEditingNote({ id: "", title: "", content: "", date: "" });
    setIsNew(true);
    setDialogOpen(true);
  };

  const openEdit = (note: DoctorNote) => {
    setEditingNote({ ...note });
    setIsNew(false);
    setDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Doctor Notes</h1>
          <p className="text-muted-foreground">Your personal clinical notes and reminders.</p>
        </div>
        <Button onClick={openNew}>
          <Plus className="h-4 w-4 mr-2" />
          New Note
        </Button>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search notes..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground py-12 text-center">No notes found.</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((note) => (
            <Card key={note.id} className="group cursor-pointer hover:border-primary transition-colors relative">
              <CardContent className="p-5" onClick={() => openEdit(note)}>
                <div className="flex items-start gap-3">
                  <StickyNote className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium truncate">{note.title}</p>
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-3 whitespace-pre-line">{note.content}</p>
                    <p className="text-xs text-muted-foreground mt-3">{note.date}</p>
                  </div>
                </div>
                {/* Hover actions */}
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={(e) => { e.stopPropagation(); openEdit(note); }}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive"
                    onClick={(e) => { e.stopPropagation(); handleDelete(note.id); }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit / Create Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) { setDialogOpen(false); setEditingNote(null); } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{isNew ? "New Note" : "Edit Note"}</DialogTitle>
          </DialogHeader>
          {editingNote && (
            <div className="space-y-4">
              <Input
                placeholder="Note title..."
                value={editingNote.title}
                onChange={(e) => setEditingNote({ ...editingNote, title: e.target.value })}
              />
              <Textarea
                placeholder="Write your note..."
                className="min-h-[200px]"
                value={editingNote.content}
                onChange={(e) => setEditingNote({ ...editingNote, content: e.target.value })}
              />
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave}>
              <Check className="h-4 w-4 mr-1" />
              {isNew ? "Create" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default NotesPage;
