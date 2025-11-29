import { useState, useEffect } from "react";
import { PatientTable } from "@/components/PatientTable";
import { AddPatientDialog } from "@/components/AddPatientDialog";
import { AppHeader } from "@/components/AppHeader";
import { patientsApi, Patient } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

export default function Patients() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
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
            <PatientTable patients={patients} />
          )}
        </div>
      </div>
    </div>
  );
}
