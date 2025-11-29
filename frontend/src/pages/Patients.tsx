import { useState, useEffect } from "react";
import { PatientTable } from "@/components/PatientTable";
import { AddPatientDialog } from "@/components/AddPatientDialog";
import { AppHeader } from "@/components/AppHeader";
import { patientsApi, Patient, dashboardApi, LabTest, TimelineEvent, Note, BillingItem, Medication, Insurance as InsuranceType, dischargeFlowApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { PatientInfo } from "@/components/PatientInfo";
import { LabTests } from "@/components/LabTests";
import { Timeline } from "@/components/Timeline";
import { Notes } from "@/components/Notes";
import { Billing } from "@/components/Billing";
import { Medications } from "@/components/Medications";
import { Insurance } from "@/components/Insurance";
import { Loader2, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Patients() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [patientDetails, setPatientDetails] = useState<{
    patient: Patient;
    labTests: LabTest[];
    timeline: TimelineEvent[];
    doctorNotes: Note[];
    nurseNotes: Note[];
    billing: BillingItem[];
    medications: Medication[];
    insurance: InsuranceType | null;
  } | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [discharging, setDischarging] = useState(false);
  const { toast } = useToast();

  const loadPatients = async () => {
    try {
      setLoading(true);
      const data = await patientsApi.getAll();
      setPatients(data);
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to load patients",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadPatientDetails = async (patientId: string) => {
    try {
      setLoadingDetails(true);
      // Try to load PatientCare Hub dashboard data
      try {
        const dashboard = await dashboardApi.getByPatient(patientId);
        setPatientDetails(dashboard);
      } catch (dashboardError) {
        // If PatientCare Hub dashboard fails, it might be a DischargeFlow-only patient
        // Load basic patient info and show a message
        const patient = await patientsApi.getById(patientId);
        setPatientDetails({
          patient,
          labTests: [],
          timeline: [],
          doctorNotes: [],
          nurseNotes: [],
          billing: [],
          medications: [],
          insurance: null,
        });
        toast({
          title: "Limited Data",
          description: "This patient has limited data in PatientCare Hub. For full details, use DischargeFlow AI.",
          variant: "default",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to load patient details",
        variant: "destructive",
      });
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleViewDetails = (patient: Patient) => {
    setSelectedPatient(patient);
    loadPatientDetails(patient.id);
  };

  const handleCloseDetails = () => {
    setSelectedPatient(null);
    setPatientDetails(null);
  };

  const handleDetailsUpdate = () => {
    if (selectedPatient) {
      loadPatientDetails(selectedPatient.id);
      loadPatients(); // Refresh the list
    }
  };

  const handleDischarge = async () => {
    if (!selectedPatient || !patientDetails) return;

    try {
      setDischarging(true);
      
      // Convert PatientCare Hub patient to DischargeFlow format
      const fullName = `${patientDetails.patient.firstName} ${patientDetails.patient.lastName}`.trim();
      const mrn = `PC-${selectedPatient.id}`; // Generate MRN from PatientCare ID
      const admissionId = `ADM-${selectedPatient.id}`;

      // Create patient in DischargeFlow AI system
      const dischargePatient = await dischargeFlowApi.createPatient({
        mrn: mrn,
        name: fullName,
        age: patientDetails.patient.age || undefined,
        admission_id: admissionId,
        diagnosis: patientDetails.patient.currentDiagnosis || undefined,
        notes: patientDetails.patient.medicalHistory || undefined,
      });

      // Trigger extraction agent to start processing
      await dischargeFlowApi.markReady(dischargePatient.id);

      toast({
        title: "Success",
        description: `Patient ${fullName} has been added to DischargeFlow AI. Extraction started.`,
      });

      // Refresh patient list to show the new DischargeFlow patient
      loadPatients();
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to add patient to DischargeFlow AI",
        variant: "destructive",
      });
    } finally {
      setDischarging(false);
    }
  };

  useEffect(() => {
    loadPatients();
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <AppHeader
        title="Patient Management"
        subtitle="View and manage all patients"
        action={<AddPatientDialog onPatientAdded={loadPatients} />}
      />

      <div className="container mx-auto px-6 py-8">
        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-foreground">All Patients</h2>
            <p className="text-sm text-muted-foreground mt-1">
              {loading ? "Loading..." : `Total: ${patients.length} patient${patients.length !== 1 ? "s" : ""}`}
            </p>
          </div>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Loading patients...</div>
          ) : (
            <PatientTable patients={patients} onViewDetails={handleViewDetails} />
          )}
        </div>
      </div>

      {/* Patient Details Sheet */}
      <Sheet open={!!selectedPatient} onOpenChange={handleCloseDetails}>
        <SheetContent side="right" className="w-full sm:max-w-4xl overflow-y-auto">
          {loadingDetails ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : patientDetails ? (
            <>
              <SheetHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <SheetTitle>
                      {patientDetails.patient.firstName} {patientDetails.patient.lastName}
                    </SheetTitle>
                    <p className="text-sm text-muted-foreground">Patient ID: {patientDetails.patient.id}</p>
                  </div>
                  <Button
                    onClick={handleDischarge}
                    disabled={discharging}
                    className="gap-2"
                    variant="default"
                  >
                    {discharging ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <LogOut className="h-4 w-4" />
                        Discharge
                      </>
                    )}
                  </Button>
                </div>
              </SheetHeader>
              
              <ScrollArea className="h-[calc(100vh-120px)] mt-6">
                <Tabs defaultValue="overview" className="w-full">
                  <TabsList className="grid w-full grid-cols-6 mb-6">
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="lab-tests">Lab Tests</TabsTrigger>
                    <TabsTrigger value="medications">Medications</TabsTrigger>
                    <TabsTrigger value="insurance">Insurance</TabsTrigger>
                    <TabsTrigger value="notes">Notes</TabsTrigger>
                    <TabsTrigger value="billing">Billing</TabsTrigger>
                  </TabsList>

                  <TabsContent value="overview" className="space-y-6">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                      <div className="lg:col-span-2">
                        <PatientInfo patient={patientDetails.patient} onUpdate={handleDetailsUpdate} />
                      </div>
                      <div className="lg:col-span-1">
                        <Timeline events={patientDetails.timeline} />
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="lab-tests" className="space-y-6">
                    <Card>
                      <CardContent className="pt-6">
                        <LabTests patientId={patientDetails.patient.id} tests={patientDetails.labTests} onUpdate={handleDetailsUpdate} />
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="medications" className="space-y-6">
                    <Card>
                      <CardContent className="pt-6">
                        <Medications patientId={patientDetails.patient.id} medications={patientDetails.medications} onUpdate={handleDetailsUpdate} />
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="insurance" className="space-y-6">
                    <Card>
                      <CardContent className="pt-6">
                        <Insurance 
                          patientId={patientDetails.patient.id} 
                          insurance={patientDetails.insurance || undefined} 
                          billingItems={patientDetails.billing} 
                          onUpdate={handleDetailsUpdate} 
                        />
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="notes" className="space-y-6">
                    <Card>
                      <CardContent className="pt-6">
                        <Notes
                          patientId={patientDetails.patient.id}
                          doctorNotes={patientDetails.doctorNotes}
                          nurseNotes={patientDetails.nurseNotes}
                          onUpdate={handleDetailsUpdate}
                        />
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="billing" className="space-y-6">
                    <Card>
                      <CardContent className="pt-6">
                        <Billing patientId={patientDetails.patient.id} items={patientDetails.billing} insurance={patientDetails.insurance} onUpdate={handleDetailsUpdate} />
                      </CardContent>
                    </Card>
                  </TabsContent>
                </Tabs>
              </ScrollArea>
            </>
          ) : null}
        </SheetContent>
      </Sheet>
    </div>
  );
}
