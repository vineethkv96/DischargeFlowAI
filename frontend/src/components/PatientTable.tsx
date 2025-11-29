import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { Patient } from "@/lib/api";
import { Search } from "lucide-react";

interface PatientTableProps {
  patients: Patient[];
  onViewDetails?: (patient: Patient) => void;
}

export function PatientTable({ patients, onViewDetails }: PatientTableProps) {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredPatients = patients.filter(
    (patient) =>
      patient.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      patient.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      patient.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (patient.phone && patient.phone.includes(searchTerm))
  );

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search patients by name, ID, or phone..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="font-semibold">Patient ID</TableHead>
              <TableHead className="font-semibold">Name</TableHead>
              <TableHead className="font-semibold">Gender</TableHead>
              <TableHead className="font-semibold">Age</TableHead>
              <TableHead className="font-semibold">Contact</TableHead>
              <TableHead className="font-semibold">Last Visit</TableHead>
              <TableHead className="font-semibold text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredPatients.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                  No patients found
                </TableCell>
              </TableRow>
            ) : (
              filteredPatients.map((patient) => {
                const fullName = `${patient.firstName || ""} ${patient.lastName || ""}`.trim() || "Unknown";
                const isDischargeFlow = !patient.phone && patient.currentDiagnosis;
                
                return (
                  <TableRow key={patient.id} className="hover:bg-accent/50">
                    <TableCell className="font-medium text-primary">{patient.id}</TableCell>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <span>{fullName}</span>
                        {isDischargeFlow && (
                          <Badge variant="outline" className="text-xs">
                            DischargeFlow
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{patient.gender || "N/A"}</TableCell>
                    <TableCell>{patient.age || "N/A"}</TableCell>
                    <TableCell>{patient.phone || "N/A"}</TableCell>
                    <TableCell>
                      {patient.lastVisit ? new Date(patient.lastVisit).toLocaleDateString() : "N/A"}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          if (onViewDetails) {
                            onViewDetails(patient);
                          }
                        }}
                      >
                        View Details
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
