import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Note, notesApi, timelineApi } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { Plus, Stethoscope, Heart } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface NotesProps {
  patientId: string;
  doctorNotes: Note[];
  nurseNotes: Note[];
  onUpdate: () => void;
}

export function Notes({ patientId, doctorNotes, nurseNotes, onUpdate }: NotesProps) {
  const [open, setOpen] = useState(false);
  const [noteType, setNoteType] = useState<"doctor" | "nurse">("doctor");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();
  const [content, setContent] = useState("");

  const handleSubmit = async (type: "doctor" | "nurse") => {
    if (!content.trim()) return;
    setLoading(true);

    try {
      await notesApi.create({
        patientId,
        type,
        author: user?.name || "Unknown",
        timestamp: new Date().toISOString(),
        content,
      });

      await timelineApi.create({
        patientId,
        timestamp: new Date().toISOString(),
        actor: user?.name || "Unknown",
        actorRole: user?.role || type,
        activity: `Added ${type}'s note`,
        type: "note",
      });

      toast({
        title: "Note Added",
        description: `${type === "doctor" ? "Doctor's" : "Nurse"} note has been saved successfully.`,
      });

      setContent("");
      setOpen(false);
      onUpdate();
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to add note",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const NoteList = ({ notes, type }: { notes: Note[]; type: "doctor" | "nurse" }) => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {type === "doctor" ? (
            <Stethoscope className="h-5 w-5 text-primary" />
          ) : (
            <Heart className="h-5 w-5 text-primary" />
          )}
          <h3 className="font-semibold">
            {type === "doctor" ? "Doctor's Notes" : "Nurse Notes"}
          </h3>
        </div>
        <Dialog
          open={open && noteType === type}
          onOpenChange={(isOpen) => {
            setOpen(isOpen);
            setNoteType(type);
          }}
        >
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2" onClick={() => setNoteType(type)}>
              <Plus className="h-4 w-4" />
              Add Note
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add {type === "doctor" ? "Doctor's" : "Nurse"} Note</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Author</Label>
                <input
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={user?.name || "Unknown"}
                  disabled
                />
              </div>
              <div className="space-y-2">
                <Label>Note Content *</Label>
                <Textarea
                  placeholder="Enter note details..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  rows={5}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setOpen(false);
                    setContent("");
                  }}
                  disabled={loading}
                >
                  Cancel
                </Button>
                <Button onClick={() => handleSubmit(type)} disabled={loading}>
                  {loading ? "Saving..." : "Save Note"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {notes.length === 0 ? (
        <div className="text-center py-6 text-muted-foreground text-sm">
          No {type === "doctor" ? "doctor's" : "nurse"} notes yet
        </div>
      ) : (
        <div className="space-y-3">
          {notes.map((note) => (
            <div key={note.id} className="border rounded-lg p-4 space-y-2 bg-accent/30">
              <div className="flex items-center justify-between">
                <p className="font-medium text-sm">{note.author}</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(note.timestamp).toLocaleString()}
                </p>
              </div>
              <p className="text-sm whitespace-pre-wrap">{note.content}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Clinical Notes</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="doctor" className="space-y-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="doctor">Doctor's Notes</TabsTrigger>
            <TabsTrigger value="nurse">Nurse Notes</TabsTrigger>
          </TabsList>
          <TabsContent value="doctor">
            <NoteList notes={doctorNotes} type="doctor" />
          </TabsContent>
          <TabsContent value="nurse">
            <NoteList notes={nurseNotes} type="nurse" />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
