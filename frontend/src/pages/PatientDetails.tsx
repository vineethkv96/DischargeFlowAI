import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  dashboardApi,
  Patient,
  LabTest,
  TimelineEvent,
  Note,
  BillingItem,
  Medication,
  Insurance as InsuranceType,
} from "@/lib/api";
import { PatientInfo } from "@/components/PatientInfo";
import { LabTests } from "@/components/LabTests";
import { Timeline } from "@/components/Timeline";
import { Notes } from "@/components/Notes";
import { Billing } from "@/components/Billing";
import { Medications } from "@/components/Medications";
import { Insurance } from "@/components/Insurance";
import { AppHeader } from "@/components/AppHeader";
import { useToast } from "@/hooks/use-toast";

export default function PatientDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [labTests, setLabTests] = useState<LabTest[]>([]);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [doctorNotes, setDoctorNotes] = useState<Note[]>([]);
  const [nurseNotes, setNurseNotes] = useState<Note[]>([]);
  const [billing, setBilling] = useState<BillingItem[]>([]);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [insurance, setInsurance] = useState<InsuranceType | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    if (!id) return;
    try {
      setLoading(true);
      const dashboard = await dashboardApi.getByPatient(id);
      setPatient(dashboard.patient);
      setLabTests(dashboard.labTests);
      setTimeline(dashboard.timeline);
      setDoctorNotes(dashboard.doctorNotes);
      setNurseNotes(dashboard.nurseNotes);
      setBilling(dashboard.billing);
      setMedications(dashboard.medications);
      setInsurance(dashboard.insurance);
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to load patient data",
        variant: "destructive",
      });
      navigate("/");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [id]);

  if (loading || !patient) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <AppHeader
        title={`${patient.firstName} ${patient.lastName}`}
        subtitle={`Patient ID: ${patient.id}`}
        showBackButton={true}
        backButtonPath="/"
      />

      <div className="container mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <PatientInfo patient={patient} onUpdate={loadData} />
            <LabTests patientId={patient.id} tests={labTests} onUpdate={loadData} />
            <Medications patientId={patient.id} medications={medications} onUpdate={loadData} />
            <Insurance patientId={patient.id} insurance={insurance || undefined} billingItems={billing} onUpdate={loadData} />
            <Notes
              patientId={patient.id}
              doctorNotes={doctorNotes}
              nurseNotes={nurseNotes}
              onUpdate={loadData}
            />
            <Billing patientId={patient.id} items={billing} insurance={insurance} onUpdate={loadData} />
          </div>
          <div className="lg:col-span-1">
            <Timeline events={timeline} />
          </div>
        </div>
      </div>
    </div>
  );
}
