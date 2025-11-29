import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Patient, patientsApi } from "@/lib/api";
import { Edit, Save, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface PatientInfoProps {
  patient: Patient;
  onUpdate: () => void;
}

export function PatientInfo({ patient, onUpdate }: PatientInfoProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState(patient);
  const { toast } = useToast();

  const handleSave = async () => {
    try {
      await patientsApi.update(patient.id, formData);
      toast({
      title: "Information Updated",
      description: "Patient information has been saved successfully.",
    });
      setIsEditing(false);
      onUpdate();
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update patient",
        variant: "destructive",
      });
    }
  };

  const handleCancel = () => {
    setFormData(patient);
    setIsEditing(false);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Patient Information</CardTitle>
          {!isEditing ? (
            <Button variant="outline" size="sm" onClick={() => setIsEditing(true)} className="gap-2">
              <Edit className="h-4 w-4" />
              Edit
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleCancel} className="gap-2">
                <X className="h-4 w-4" />
                Cancel
              </Button>
              <Button size="sm" onClick={handleSave} className="gap-2">
                <Save className="h-4 w-4" />
                Save
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>First Name</Label>
            {isEditing ? (
              <Input
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
              />
            ) : (
              <p className="text-sm font-medium">{patient.firstName}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label>Last Name</Label>
            {isEditing ? (
              <Input
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
              />
            ) : (
              <p className="text-sm font-medium">{patient.lastName}</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>Age</Label>
            {isEditing ? (
              <Input
                type="number"
                value={formData.age}
                onChange={(e) => setFormData({ ...formData, age: parseInt(e.target.value) })}
              />
            ) : (
              <p className="text-sm font-medium">{patient.age}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label>Gender</Label>
            <p className="text-sm font-medium">{patient.gender}</p>
          </div>
          <div className="space-y-2">
            <Label>Patient ID</Label>
            <p className="text-sm font-medium text-primary">{patient.id}</p>
          </div>
        </div>

        <div className="space-y-2">
          <Label>Address</Label>
          {isEditing ? (
            <Input
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            />
          ) : (
            <p className="text-sm">{patient.address}</p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Phone</Label>
            {isEditing ? (
              <Input
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            ) : (
              <p className="text-sm">{patient.phone}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label>Emergency Contact</Label>
            {isEditing ? (
              <Input
                value={formData.emergencyContact}
                onChange={(e) => setFormData({ ...formData, emergencyContact: e.target.value })}
              />
            ) : (
              <p className="text-sm">{patient.emergencyContact}</p>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <Label>Allergies</Label>
          {isEditing ? (
            <Textarea
              value={formData.allergies}
              onChange={(e) => setFormData({ ...formData, allergies: e.target.value })}
            />
          ) : (
            <p className="text-sm">{patient.allergies || "None reported"}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label>Current Diagnosis</Label>
          {isEditing ? (
            <Textarea
              value={formData.currentDiagnosis}
              onChange={(e) => setFormData({ ...formData, currentDiagnosis: e.target.value })}
            />
          ) : (
            <p className="text-sm">{patient.currentDiagnosis || "Not specified"}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label>Existing Conditions</Label>
          {isEditing ? (
            <Textarea
              value={formData.existingConditions}
              onChange={(e) => setFormData({ ...formData, existingConditions: e.target.value })}
            />
          ) : (
            <p className="text-sm">{patient.existingConditions || "None reported"}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
