import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { dischargeFlowApi, DischargePatient, DischargePatientCreate } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AppHeader } from "@/components/AppHeader";
import { Plus, CheckCircle, Clock, AlertCircle, Activity } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function DischargeFlowPatients() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [patients, setPatients] = useState<DischargePatient[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState<DischargePatientCreate>({
    mrn: "",
    name: "",
    age: undefined,
    admission_id: "",
    diagnosis: "",
    notes: ""
  });

  useEffect(() => {
    fetchPatients();
  }, []);

  const fetchPatients = async () => {
    try {
      const data = await dischargeFlowApi.getPatients();
      // Filter to only show discharge flow patients (those with mrn field)
      const dischargePatients = data.filter(p => p.mrn);
      setPatients(dischargePatients);
    } catch (error) {
      console.error("Error fetching patients:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to load patients",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'age' ? (value ? parseInt(value) : undefined) : value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await dischargeFlowApi.createPatient(formData);
      toast({
        title: "Success",
        description: "Patient added successfully",
      });
      setIsDialogOpen(false);
      setFormData({ mrn: "", name: "", age: undefined, admission_id: "", diagnosis: "", notes: "" });
      fetchPatients();
    } catch (error) {
      console.error("Error creating patient:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to add patient",
        variant: "destructive",
      });
    }
  };

  const handleMarkReady = async (patientId: string) => {
    try {
      await dischargeFlowApi.markReady(patientId);
      toast({
        title: "Success",
        description: "Patient marked ready. AI extraction started!",
      });
      fetchPatients();
    } catch (error) {
      console.error("Error marking patient ready:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to mark patient ready",
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status: DischargePatient['discharge_status']) => {
    const statusConfig = {
      pending: { variant: "secondary" as const, icon: Clock, text: "Pending" },
      in_progress: { variant: "default" as const, icon: Activity, text: "In Progress" },
      ready: { variant: "default" as const, icon: CheckCircle, text: "Ready", className: "bg-green-500" },
      completed: { variant: "default" as const, icon: CheckCircle, text: "Completed", className: "bg-blue-500" },
      blocked: { variant: "destructive" as const, icon: AlertCircle, text: "Blocked" }
    };

    const config = statusConfig[status] || statusConfig.pending;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className={config.className}>
        <Icon className="w-3 h-3 mr-1" />
        {config.text}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <AppHeader
        title="DischargeFlow AI"
        subtitle="Autonomous Hospital Discharge Management"
        action={
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button size="lg" className="bg-blue-600 hover:bg-blue-700">
                <Plus className="w-5 h-5 mr-2" />
                Add Patient
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Add New Patient</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="mrn">MRN *</Label>
                    <Input
                      id="mrn"
                      name="mrn"
                      value={formData.mrn}
                      onChange={handleInputChange}
                      required
                      placeholder="Medical Record Number"
                    />
                  </div>
                  <div>
                    <Label htmlFor="admission_id">Admission ID *</Label>
                    <Input
                      id="admission_id"
                      name="admission_id"
                      value={formData.admission_id}
                      onChange={handleInputChange}
                      required
                      placeholder="Admission ID"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">Patient Name *</Label>
                    <Input
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      required
                      placeholder="Full Name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="age">Age</Label>
                    <Input
                      id="age"
                      name="age"
                      type="number"
                      value={formData.age || ""}
                      onChange={handleInputChange}
                      placeholder="Age"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="diagnosis">Diagnosis</Label>
                  <Input
                    id="diagnosis"
                    name="diagnosis"
                    value={formData.diagnosis}
                    onChange={handleInputChange}
                    placeholder="Primary diagnosis"
                  />
                </div>
                <div>
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    name="notes"
                    value={formData.notes}
                    onChange={handleInputChange}
                    placeholder="Additional notes"
                    rows={3}
                  />
                </div>
                <div className="flex justify-end gap-3">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                    Add Patient
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="container mx-auto px-6 py-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid gap-6">
            {patients.length === 0 ? (
              <Card className="p-12 text-center">
                <p className="text-slate-500 text-lg">No patients yet. Add your first patient to get started.</p>
              </Card>
            ) : (
              patients.map((patient) => (
                <Card
                  key={patient.id}
                  className="p-6 hover:shadow-lg transition-all duration-300 cursor-pointer"
                  onClick={() => navigate(`/dischargeflow/patient/${patient.id}`)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-4 mb-3">
                        <h3 className="text-2xl font-semibold text-foreground">{patient.name}</h3>
                        {getStatusBadge(patient.discharge_status)}
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">MRN:</span>
                          <span className="ml-2 font-medium">{patient.mrn}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Admission:</span>
                          <span className="ml-2 font-medium">{patient.admission_id}</span>
                        </div>
                        {patient.age && (
                          <div>
                            <span className="text-muted-foreground">Age:</span>
                            <span className="ml-2 font-medium">{patient.age}</span>
                          </div>
                        )}
                        {patient.diagnosis && (
                          <div>
                            <span className="text-muted-foreground">Diagnosis:</span>
                            <span className="ml-2 font-medium">{patient.diagnosis}</span>
                          </div>
                        )}
                      </div>
                      {patient.notes && (
                        <p className="mt-3 text-sm text-muted-foreground">{patient.notes}</p>
                      )}
                    </div>
                    <div className="ml-6 flex flex-col gap-2">
                      {!patient.ready_for_discharge_eval ? (
                        <Button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMarkReady(patient.id);
                          }}
                          className="bg-green-600 hover:bg-green-700 whitespace-nowrap"
                        >
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Mark Ready for Discharge
                        </Button>
                      ) : (
                        <div className="flex flex-col gap-1 text-sm">
                          <div className="flex items-center gap-2">
                            {patient.extraction_completed ? (
                              <CheckCircle className="w-4 h-4 text-green-600" />
                            ) : (
                              <Clock className="w-4 h-4 text-blue-600 animate-spin" />
                            )}
                            <span className={patient.extraction_completed ? "text-green-600" : "text-blue-600"}>
                              {patient.extraction_completed ? "Data Extracted" : "Extracting Data..."}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            {patient.tasks_generated ? (
                              <CheckCircle className="w-4 h-4 text-green-600" />
                            ) : (
                              <Clock className="w-4 h-4 text-blue-600" />
                            )}
                            <span className={patient.tasks_generated ? "text-green-600" : "text-muted-foreground"}>
                              {patient.tasks_generated ? "Tasks Generated" : "Awaiting Tasks"}
                            </span>
                          </div>
                        </div>
                      )}
                      <Button
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/dischargeflow/patient/${patient.id}`);
                        }}
                      >
                        View Dashboard
                      </Button>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

