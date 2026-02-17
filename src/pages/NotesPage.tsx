import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Plus, StickyNote } from "lucide-react";

const mockNotes = [
  { id: "1", title: "Meeting notes - Dr. Patel", content: "Discussed patient referral workflow and new onboarding procedures...", date: "Feb 17, 2026" },
  { id: "2", title: "Research: New treatment protocols", content: "Review latest guidelines for Tier 2 patients regarding...", date: "Feb 15, 2026" },
  { id: "3", title: "Weekly review checklist", content: "1. Review lab results 2. Update patient records 3. Follow-up calls...", date: "Feb 14, 2026" },
];

const NotesPage = () => {
  const [search, setSearch] = useState("");

  const filtered = mockNotes.filter(
    (n) => n.title.toLowerCase().includes(search.toLowerCase()) || n.content.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Notes</h1>
          <p className="text-muted-foreground">Your personal notes and reminders.</p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          New Note
        </Button>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search notes..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filtered.map((note) => (
          <Card key={note.id} className="cursor-pointer hover:border-primary transition-colors">
            <CardContent className="p-5">
              <div className="flex items-start gap-3">
                <StickyNote className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                <div className="min-w-0">
                  <p className="font-medium truncate">{note.title}</p>
                  <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{note.content}</p>
                  <p className="text-xs text-muted-foreground mt-3">{note.date}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default NotesPage;
