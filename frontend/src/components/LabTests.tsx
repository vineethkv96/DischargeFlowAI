import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LabTest, labTestsApi, timelineApi } from "@/lib/api";
import { Plus, FileText, Upload } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

interface LabTestsProps {
  patientId: string;
  tests: LabTest[];
  onUpdate: () => void;
}

export function LabTests({ patientId, tests, onUpdate }: LabTestsProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    testName: "",
    status: "Pending" as "Pending" | "Completed",
    results: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await labTestsApi.create({
        patientId,
        ...formData,
        orderedDate: new Date().toISOString().split("T")[0],
        documents: [],
      });

      await timelineApi.create({
        patientId,
        timestamp: new Date().toISOString(),
        actor: user?.name || "System",
        actorRole: user?.role || "Doctor",
        activity: `Ordered ${formData.testName}`,
        type: "lab",
      });

      toast({
        title: "Lab Test Added",
        description: `${formData.testName} has been ordered successfully.`,
      });

      setOpen(false);
      setFormData({ testName: "", status: "Pending", results: "" });
      onUpdate();
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to add lab test",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Lab Tests & Results</CardTitle>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <Plus className="h-4 w-4" />
                Add Test
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Lab Test</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="testName">Test Name *</Label>
                  <Input
                    id="testName"
                    required
                    value={formData.testName}
                    onChange={(e) => setFormData({ ...formData, testName: e.target.value })}
                    placeholder="e.g., Complete Blood Count"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="status">Status *</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value: "Pending" | "Completed") =>
                      setFormData({ ...formData, status: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Pending">Pending</SelectItem>
                      <SelectItem value="Completed">Completed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="results">Results</Label>
                  <Textarea
                    id="results"
                    value={formData.results}
                    onChange={(e) => setFormData({ ...formData, results: e.target.value })}
                    placeholder="Enter test results if available"
                    rows={3}
                  />
                </div>
                <div className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={loading}>
                    {loading ? "Adding..." : "Add Test"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {tests.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No lab tests ordered yet</p>
          </div>
        ) : (
          <div className="space-y-4">
            {tests.map((test) => (
              <div key={test.id} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <h4 className="font-semibold">{test.testName}</h4>
                    <p className="text-sm text-muted-foreground">
                      Ordered: {new Date(test.orderedDate).toLocaleDateString()}
                    </p>
                  </div>
                  <Badge variant={test.status === "Completed" ? "default" : "secondary"}>
                    {test.status}
                  </Badge>
                </div>
                {test.results && (
                  <div className="space-y-1">
                    <Label className="text-xs">Results:</Label>
                    <p className="text-sm">{test.results}</p>
                  </div>
                )}
                <div className="flex items-center gap-2 pt-2">
                  <Button variant="outline" size="sm" className="gap-2">
                    <Upload className="h-3 w-3" />
                    Upload Document
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
