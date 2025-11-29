import { useState } from "react";
import { Medication, medicationsApi, timelineApi } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Pill, Plus, Calendar } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface MedicationsProps {
  patientId: string;
  medications: Medication[];
  onUpdate: () => void;
}

export function Medications({ patientId, medications, onUpdate }: MedicationsProps) {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isRefillDialogOpen, setIsRefillDialogOpen] = useState(false);
  const [selectedMedication, setSelectedMedication] = useState<Medication | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  const handleAddMedication = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    
    try {
      await medicationsApi.create({
        patientId,
        medicationName: formData.get("medicationName") as string,
        dosage: formData.get("dosage") as string,
        frequency: formData.get("frequency") as string,
        prescribedDate: new Date().toISOString().split("T")[0],
        prescribedBy: formData.get("prescribedBy") as string,
        status: "Active",
        instructions: formData.get("instructions") as string,
        refills: [
          {
            date: new Date().toISOString().split("T")[0],
            pharmacist: formData.get("pharmacist") as string,
          },
        ],
      });

      await timelineApi.create({
        patientId,
        timestamp: new Date().toISOString(),
        actor: formData.get("prescribedBy") as string,
        actorRole: user?.role || "Doctor",
        activity: `Prescribed ${formData.get("medicationName")} - ${formData.get("dosage")} ${formData.get("frequency")}`,
        type: "medication",
      });

      toast({
        title: "Medication Added",
        description: "New prescription has been recorded successfully.",
      });
      
      setIsAddDialogOpen(false);
      onUpdate();
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to add medication",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddRefill = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedMedication) return;
    setLoading(true);
    
    const formData = new FormData(e.currentTarget);
    const updatedRefills = [
      ...selectedMedication.refills,
      {
        date: new Date().toISOString().split("T")[0],
        pharmacist: formData.get("pharmacist") as string,
      },
    ];

    try {
      await medicationsApi.update(selectedMedication.id, {
        refills: updatedRefills,
      });

      await timelineApi.create({
        patientId,
        timestamp: new Date().toISOString(),
        actor: formData.get("pharmacist") as string,
        actorRole: "Pharmacist",
        activity: `Refilled ${selectedMedication.medicationName}`,
        type: "medication",
      });

      toast({
        title: "Refill Recorded",
        description: "Medication refill has been added to history.",
      });
      
      setIsRefillDialogOpen(false);
      setSelectedMedication(null);
      onUpdate();
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to add refill",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDiscontinue = async (medication: Medication) => {
    try {
      await medicationsApi.update(medication.id, { status: "Discontinued" });
      
      await timelineApi.create({
        patientId,
        timestamp: new Date().toISOString(),
        actor: user?.name || "System",
        actorRole: user?.role || "System",
        activity: `Discontinued ${medication.medicationName}`,
        type: "medication",
      });

      toast({
        title: "Medication Discontinued",
        description: `${medication.medicationName} has been marked as discontinued.`,
      });
      
      onUpdate();
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to discontinue medication",
        variant: "destructive",
      });
    }
  };

  const activeMedications = medications.filter((m) => m.status === "Active");
  const discontinuedMedications = medications.filter((m) => m.status === "Discontinued");

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <Pill className="h-5 w-5 text-primary" />
          <CardTitle>Medications</CardTitle>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Medication
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Prescribe New Medication</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAddMedication} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="medicationName">Medication Name</Label>
                  <Input id="medicationName" name="medicationName" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dosage">Dosage</Label>
                  <Input id="dosage" name="dosage" placeholder="e.g., 500mg" required />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="frequency">Frequency</Label>
                  <Input id="frequency" name="frequency" placeholder="e.g., 3 times daily" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="prescribedBy">Prescribed By</Label>
                  <Input id="prescribedBy" name="prescribedBy" required />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="instructions">Instructions</Label>
                <Textarea id="instructions" name="instructions" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pharmacist">Pharmacist/Pharmacy</Label>
                <Input id="pharmacist" name="pharmacist" placeholder="Initial fill location" required />
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">Add Prescription</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent className="space-y-6">
        {activeMedications.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground">Active Medications</h3>
            {activeMedications.map((medication) => (
              <div key={medication.id} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold text-foreground">{medication.medicationName}</h4>
                      <Badge variant="default">Active</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {medication.dosage} • {medication.frequency}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setSelectedMedication(medication);
                        setIsRefillDialogOpen(true);
                      }}
                    >
                      <Calendar className="h-4 w-4 mr-2" />
                      Add Refill
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleDiscontinue(medication)}
                    >
                      Discontinue
                    </Button>
                  </div>
                </div>
                <div className="space-y-2 text-sm">
                  <p className="text-muted-foreground">{medication.instructions}</p>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span>Prescribed by {medication.prescribedBy}</span>
                    <span>•</span>
                    <span>{format(new Date(medication.prescribedDate), "MMM d, yyyy")}</span>
                  </div>
                </div>
                <div className="border-t pt-3">
                  <p className="text-xs font-semibold text-muted-foreground mb-2">
                    Refill History ({medication.refills.length})
                  </p>
                  <div className="space-y-1">
                    {medication.refills.map((refill, index) => (
                      <div key={index} className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        <span>{format(new Date(refill.date), "MMM d, yyyy")}</span>
                        <span>•</span>
                        <span>{refill.pharmacist}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {discontinuedMedications.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground">Discontinued Medications</h3>
            {discontinuedMedications.map((medication) => (
              <div key={medication.id} className="border rounded-lg p-4 space-y-2 opacity-60">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold text-foreground">{medication.medicationName}</h4>
                      <Badge variant="secondary">Discontinued</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {medication.dosage} • {medication.frequency}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {medications.length === 0 && (
          <p className="text-center text-muted-foreground py-8">
            No medications prescribed yet.
          </p>
        )}
      </CardContent>

      <Dialog open={isRefillDialogOpen} onOpenChange={setIsRefillDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Refill</DialogTitle>
          </DialogHeader>
          {selectedMedication && (
            <form onSubmit={handleAddRefill} className="space-y-4">
              <div className="space-y-2">
                <Label>Medication</Label>
                <p className="text-sm text-muted-foreground">
                  {selectedMedication.medicationName} - {selectedMedication.dosage}
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="refillPharmacist">Pharmacist/Pharmacy</Label>
                <Input id="refillPharmacist" name="pharmacist" required />
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsRefillDialogOpen(false);
                    setSelectedMedication(null);
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit">Add Refill</Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}
