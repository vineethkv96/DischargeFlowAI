import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Insurance as InsuranceType, BillingItem, insuranceApi, timelineApi } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { 
  Shield, 
  Plus, 
  FileText, 
  AlertCircle, 
  CheckCircle, 
  Clock,
  Edit,
  Trash2,
  Upload,
  DollarSign
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Switch } from "@/components/ui/switch";

interface InsuranceProps {
  patientId: string;
  insurance?: InsuranceType;
  billingItems: BillingItem[];
  onUpdate: () => void;
}

export function Insurance({ patientId, insurance, billingItems, onUpdate }: InsuranceProps) {
  const [editOpen, setEditOpen] = useState(false);
  const [claimOpen, setClaimOpen] = useState(false);
  const [noteOpen, setNoteOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  const [formData, setFormData] = useState<Partial<InsuranceType>>(
    insurance || {
      patientId,
      providerName: "",
      policyName: "",
      policyType: "Individual",
      policyNumber: "",
      providerContact: "",
      coverageType: "Cashless",
      coveragePercentage: 80,
      coverageLimit: 0,
      deductible: 0,
      copay: 0,
      preAuthRequired: false,
      policyStartDate: "",
      policyEndDate: "",
      status: "Active",
      documents: [],
      claims: [],
      notes: [],
    }
  );

  const [claimForm, setClaimForm] = useState({
    billingItemId: "",
    notes: "",
  });

  const [noteForm, setNoteForm] = useState({
    content: "",
    author: "",
  });

  const handleSaveInsurance = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      if (insurance) {
        await insuranceApi.update(insurance.id, formData);
        toast({
          title: "Insurance Updated",
          description: "Insurance details have been updated successfully.",
        });
      } else {
        await insuranceApi.create(formData as Omit<InsuranceType, "id">);
        toast({
          title: "Insurance Added",
          description: "Insurance policy has been added successfully.",
        });
        
        await timelineApi.create({
          patientId,
          timestamp: new Date().toISOString(),
          actor: user?.name || "Insurance Desk",
          actorRole: user?.role || "Insurance",
          activity: `Insurance policy added: ${formData.providerName}`,
          type: "note",
        });
      }
      
      setEditOpen(false);
      onUpdate();
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save insurance",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleInitiateClaim = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!insurance) return;
    
    const billingItem = billingItems.find(item => item.id === claimForm.billingItemId);
    if (!billingItem) return;

    const claimedAmount = billingItem.cost;
    const approvedAmount = Math.min(
      claimedAmount * (insurance.coveragePercentage / 100),
      insurance.coverageLimit
    );

    const newClaim = {
      id: `CL${String((insurance.claims?.length || 0) + 1).padStart(3, "0")}`,
      billingItemId: claimForm.billingItemId,
      claimDate: new Date().toISOString().split("T")[0],
      status: "Initiated" as const,
      claimedAmount,
      approvedAmount: 0,
      notes: claimForm.notes,
    };

    const updatedClaims = [...(insurance.claims || []), newClaim];
    try {
      await insuranceApi.update(insurance.id, { claims: updatedClaims });

      await timelineApi.create({
        patientId,
        timestamp: new Date().toISOString(),
        actor: user?.name || "Insurance Desk",
        actorRole: user?.role || "Insurance",
        activity: `Insurance claim initiated for ${billingItem.description} - ₹${claimedAmount.toFixed(2)}`,
        type: "billing",
      });

      toast({
        title: "Claim Initiated",
        description: `Claim for ${billingItem.description} has been initiated.`,
      });

      setClaimOpen(false);
      setClaimForm({ billingItemId: "", notes: "" });
      onUpdate();
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to initiate claim",
        variant: "destructive",
      });
    }
  };

  const handleUpdateClaimStatus = async (claimId: string, status: InsuranceType["claims"][0]["status"], approvedAmount?: number) => {
    if (!insurance) return;

    const updatedClaims = insurance.claims.map(claim => {
      if (claim.id === claimId) {
        const updates: any = { status };
        if (approvedAmount !== undefined) {
          updates.approvedAmount = approvedAmount;
        }
        if (status === "Settled") {
          updates.settlementDate = new Date().toISOString().split("T")[0];
        }
        return { ...claim, ...updates };
      }
      return claim;
    });

    try {
      await insuranceApi.update(insurance.id, { claims: updatedClaims });
      
      toast({
        title: "Claim Updated",
        description: `Claim status updated to ${status}.`,
      });
      
      onUpdate();
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update claim",
        variant: "destructive",
      });
    }
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!insurance) return;

    const newNote = {
      timestamp: new Date().toISOString(),
      author: user?.name || noteForm.author,
      content: noteForm.content,
    };

    const updatedNotes = [...(insurance.notes || []), newNote];
    try {
      await insuranceApi.update(insurance.id, { notes: updatedNotes });

      await timelineApi.create({
        patientId,
        timestamp: new Date().toISOString(),
        actor: user?.name || noteForm.author,
        actorRole: user?.role || "Insurance",
        activity: `Insurance note added: ${noteForm.content.substring(0, 50)}...`,
        type: "note",
      });

      toast({
        title: "Note Added",
        description: "Insurance note has been added.",
      });

      setNoteOpen(false);
      setNoteForm({ content: "", author: "" });
      onUpdate();
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to add note",
        variant: "destructive",
      });
    }
  };

  const handleDeleteInsurance = async () => {
    if (!insurance) return;
    
    if (confirm("Are you sure you want to delete this insurance policy?")) {
      try {
        await insuranceApi.delete(insurance.id);
        toast({
          title: "Insurance Deleted",
          description: "Insurance policy has been removed.",
        });
        onUpdate();
      } catch (error) {
        toast({
          title: "Error",
          description: error instanceof Error ? error.message : "Failed to delete insurance",
          variant: "destructive",
        });
      }
    }
  };

  // Calculate billing integration data
  const totalBilling = billingItems.reduce((sum, item) => sum + item.cost, 0);
  const totalClaimed = insurance?.claims.reduce((sum, claim) => sum + claim.claimedAmount, 0) || 0;
  const totalApproved = insurance?.claims.reduce((sum, claim) => sum + claim.approvedAmount, 0) || 0;
  const patientPayable = totalBilling - totalApproved;

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Active": return "bg-green-500";
      case "Expired": return "bg-red-500";
      case "Suspended": return "bg-yellow-500";
      default: return "bg-gray-500";
    }
  };

  const getClaimStatusColor = (status: string) => {
    switch (status) {
      case "Initiated": return "default";
      case "Pending": return "secondary";
      case "Approved": return "default";
      case "Rejected": return "destructive";
      case "Settled": return "default";
      default: return "default";
    }
  };

  if (!insurance) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Insurance Details
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <Shield className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground mb-4">No insurance policy on file</p>
            <Dialog open={editOpen} onOpenChange={setEditOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="h-4 w-4" />
                  Add Insurance Policy
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Add Insurance Policy</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSaveInsurance} className="space-y-6">
                  {/* Form content - same as edit form */}
                  <InsuranceForm formData={formData} setFormData={setFormData} />
                  <div className="flex justify-end gap-2 pt-4">
                    <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit">Add Policy</Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Insurance Details
          </CardTitle>
          <div className="flex gap-2">
            <Dialog open={editOpen} onOpenChange={setEditOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <Edit className="h-4 w-4" />
                  Edit
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Edit Insurance Policy</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSaveInsurance} className="space-y-6">
                  <InsuranceForm formData={formData} setFormData={setFormData} />
                  <div className="flex justify-end gap-2 pt-4">
                    <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit">Save Changes</Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
            <Button variant="outline" size="sm" className="gap-2 text-destructive" onClick={handleDeleteInsurance}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="details">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="claims">Claims</TabsTrigger>
            <TabsTrigger value="documents">Documents</TabsTrigger>
            <TabsTrigger value="billing">Billing</TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="space-y-6">
            {/* Provider Information */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Provider Information</h3>
                <Badge className={getStatusColor(insurance.status)}>
                  {insurance.status}
                </Badge>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Provider</Label>
                  <p className="font-medium">{insurance.providerName}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Policy Name</Label>
                  <p className="font-medium">{insurance.policyName}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Policy Number</Label>
                  <p className="font-medium">{insurance.policyNumber}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Policy Type</Label>
                  <p className="font-medium">{insurance.policyType}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Contact</Label>
                  <p className="font-medium">{insurance.providerContact}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Policy Period</Label>
                  <p className="font-medium">
                    {new Date(insurance.policyStartDate).toLocaleDateString()} - {new Date(insurance.policyEndDate).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>

            {/* Coverage Details */}
            <div className="space-y-4 border-t pt-6">
              <h3 className="font-semibold">Coverage Details</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Coverage Type</Label>
                  <p className="font-medium">{insurance.coverageType}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Coverage Percentage</Label>
                  <p className="font-medium">{insurance.coveragePercentage}%</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Coverage Limit</Label>
                  <p className="font-medium">₹{insurance.coverageLimit.toLocaleString()}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Deductible</Label>
                  <p className="font-medium">₹{insurance.deductible.toLocaleString()}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Co-pay</Label>
                  <p className="font-medium">₹{insurance.copay}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Pre-authorization</Label>
                  <p className="font-medium">{insurance.preAuthRequired ? "Required" : "Not Required"}</p>
                </div>
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-4 border-t pt-6">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Notes & Audit Trail</h3>
                <Dialog open={noteOpen} onOpenChange={setNoteOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-2">
                      <Plus className="h-4 w-4" />
                      Add Note
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add Insurance Note</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleAddNote} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="author">Author *</Label>
                        <Input
                          id="author"
                          required
                          value={noteForm.author}
                          onChange={(e) => setNoteForm({ ...noteForm, author: e.target.value })}
                          placeholder="Your name"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="content">Note *</Label>
                        <Textarea
                          id="content"
                          required
                          value={noteForm.content}
                          onChange={(e) => setNoteForm({ ...noteForm, content: e.target.value })}
                          placeholder="Enter note details..."
                          rows={4}
                        />
                      </div>
                      <div className="flex justify-end gap-2 pt-4">
                        <Button type="button" variant="outline" onClick={() => setNoteOpen(false)}>
                          Cancel
                        </Button>
                        <Button type="submit">Add Note</Button>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
              <div className="space-y-3">
                {insurance.notes.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No notes yet</p>
                ) : (
                  insurance.notes.map((note, index) => (
                    <div key={index} className="border rounded-lg p-4 bg-muted/30">
                      <div className="flex items-center justify-between mb-2">
                        <p className="font-medium text-sm">{note.author}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(note.timestamp).toLocaleString()}
                        </p>
                      </div>
                      <p className="text-sm">{note.content}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="claims" className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Claim Management</h3>
              <Dialog open={claimOpen} onOpenChange={setClaimOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2">
                    <Plus className="h-4 w-4" />
                    Initiate Claim
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Initiate Insurance Claim</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleInitiateClaim} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="billingItem">Billing Item *</Label>
                      <Select
                        value={claimForm.billingItemId}
                        onValueChange={(value) => setClaimForm({ ...claimForm, billingItemId: value })}
                        required
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select billing item" />
                        </SelectTrigger>
                        <SelectContent>
                          {billingItems
                            .filter(item => !insurance.claims.some(claim => claim.billingItemId === item.id))
                            .map((item) => (
                              <SelectItem key={item.id} value={item.id}>
                                {item.description} - ₹{item.cost.toFixed(2)}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="claimNotes">Notes</Label>
                      <Textarea
                        id="claimNotes"
                        value={claimForm.notes}
                        onChange={(e) => setClaimForm({ ...claimForm, notes: e.target.value })}
                        placeholder="Additional claim information..."
                        rows={3}
                      />
                    </div>
                    <div className="flex justify-end gap-2 pt-4">
                      <Button type="button" variant="outline" onClick={() => setClaimOpen(false)}>
                        Cancel
                      </Button>
                      <Button type="submit">Initiate Claim</Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            <div className="space-y-3">
              {insurance.claims.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No claims yet</p>
                </div>
              ) : (
                insurance.claims.map((claim) => {
                  const billingItem = billingItems.find(item => item.id === claim.billingItemId);
                  return (
                    <div key={claim.id} className="border rounded-lg p-4 bg-card space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <p className="font-medium">{billingItem?.description || "Unknown Item"}</p>
                          <p className="text-sm text-muted-foreground">
                            Claim ID: {claim.id} | Filed: {new Date(claim.claimDate).toLocaleDateString()}
                          </p>
                        </div>
                        <Badge variant={getClaimStatusColor(claim.status)}>
                          {claim.status === "Initiated" && <Clock className="h-3 w-3 mr-1" />}
                          {claim.status === "Approved" && <CheckCircle className="h-3 w-3 mr-1" />}
                          {claim.status === "Rejected" && <AlertCircle className="h-3 w-3 mr-1" />}
                          {claim.status}
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <Label className="text-muted-foreground">Claimed</Label>
                          <p className="font-medium">₹{claim.claimedAmount.toFixed(2)}</p>
                        </div>
                        <div>
                          <Label className="text-muted-foreground">Approved</Label>
                          <p className="font-medium">₹{claim.approvedAmount.toFixed(2)}</p>
                        </div>
                        <div>
                          <Label className="text-muted-foreground">Settlement</Label>
                          <p className="font-medium">
                            {claim.settlementDate ? new Date(claim.settlementDate).toLocaleDateString() : "Pending"}
                          </p>
                        </div>
                      </div>

                      {claim.notes && (
                        <div className="text-sm bg-muted/30 p-3 rounded">
                          <Label className="text-muted-foreground">Notes:</Label>
                          <p>{claim.notes}</p>
                        </div>
                      )}

                      {claim.status !== "Settled" && claim.status !== "Rejected" && (
                        <div className="flex gap-2 pt-2">
                          {claim.status === "Initiated" && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleUpdateClaimStatus(claim.id, "Pending")}
                            >
                              Mark Pending
                            </Button>
                          )}
                          {claim.status === "Pending" && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  const amount = prompt("Enter approved amount:", claim.claimedAmount.toString());
                                  if (amount) {
                                    handleUpdateClaimStatus(claim.id, "Approved", parseFloat(amount));
                                  }
                                }}
                              >
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleUpdateClaimStatus(claim.id, "Rejected")}
                              >
                                Reject
                              </Button>
                            </>
                          )}
                          {claim.status === "Approved" && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleUpdateClaimStatus(claim.id, "Settled")}
                            >
                              Mark Settled
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </TabsContent>

          <TabsContent value="documents" className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Insurance Documents</h3>
              <Button variant="outline" size="sm" className="gap-2">
                <Upload className="h-4 w-4" />
                Upload Document
              </Button>
            </div>
            <div className="space-y-3">
              {insurance.documents.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No documents uploaded</p>
                </div>
              ) : (
                insurance.documents.map((doc, index) => (
                  <div key={index} className="flex items-center justify-between border rounded-lg p-4 bg-card">
                    <div className="flex items-center gap-3">
                      <FileText className="h-8 w-8 text-muted-foreground" />
                      <div>
                        <p className="font-medium">{doc.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {doc.type} | Uploaded: {new Date(doc.uploadDate).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <Button variant="outline" size="sm">
                      Download
                    </Button>
                  </div>
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="billing" className="space-y-4">
            <h3 className="font-semibold">Billing Integration</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1 rounded-lg border p-4 bg-muted/30">
                <p className="text-xs text-muted-foreground">Total Billing</p>
                <p className="text-2xl font-bold">₹{totalBilling.toFixed(2)}</p>
              </div>
              <div className="space-y-1 rounded-lg border p-4 bg-blue-50">
                <p className="text-xs text-muted-foreground">Insurance Claimed</p>
                <p className="text-2xl font-bold text-blue-600">₹{totalClaimed.toFixed(2)}</p>
              </div>
              <div className="space-y-1 rounded-lg border p-4 bg-green-50">
                <p className="text-xs text-muted-foreground">Insurance Approved</p>
                <p className="text-2xl font-bold text-green-600">₹{totalApproved.toFixed(2)}</p>
              </div>
              <div className="space-y-1 rounded-lg border p-4 bg-orange-50">
                <p className="text-xs text-muted-foreground">Patient Payable</p>
                <p className="text-2xl font-bold text-orange-600">₹{patientPayable.toFixed(2)}</p>
              </div>
            </div>

            <div className="space-y-3 border-t pt-4">
              <h4 className="font-medium">Billing Items Breakdown</h4>
              {billingItems.map((item) => {
                const claim = insurance.claims.find(c => c.billingItemId === item.id);
                const insuranceCovered = claim?.approvedAmount || 0;
                const patientOwes = item.cost - insuranceCovered;

                return (
                  <div key={item.id} className="border rounded-lg p-4 bg-card space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="font-medium">{item.description}</p>
                      <Badge>{item.status}</Badge>
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <Label className="text-muted-foreground">Total Cost</Label>
                        <p className="font-medium">₹{item.cost.toFixed(2)}</p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground">Insurance Covers</Label>
                        <p className="font-medium text-green-600">₹{insuranceCovered.toFixed(2)}</p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground">Patient Pays</Label>
                        <p className="font-medium text-orange-600">₹{patientOwes.toFixed(2)}</p>
                      </div>
                    </div>
                    {claim && (
                      <p className="text-xs text-muted-foreground">
                        Claim {claim.id}: {claim.status}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

// Insurance form component
function InsuranceForm({ formData, setFormData }: { 
  formData: Partial<InsuranceType>; 
  setFormData: (data: Partial<InsuranceType>) => void;
}) {
  return (
    <>
      <div className="space-y-4">
        <h3 className="font-semibold">Provider Information</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="providerName">Provider Name *</Label>
            <Input
              id="providerName"
              required
              value={formData.providerName || ""}
              onChange={(e) => setFormData({ ...formData, providerName: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="policyName">Policy Name *</Label>
            <Input
              id="policyName"
              required
              value={formData.policyName || ""}
              onChange={(e) => setFormData({ ...formData, policyName: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="policyNumber">Policy Number *</Label>
            <Input
              id="policyNumber"
              required
              value={formData.policyNumber || ""}
              onChange={(e) => setFormData({ ...formData, policyNumber: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="policyType">Policy Type *</Label>
            <Select
              value={formData.policyType}
              onValueChange={(value: any) => setFormData({ ...formData, policyType: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Individual">Individual</SelectItem>
                <SelectItem value="Family">Family</SelectItem>
                <SelectItem value="Group">Group</SelectItem>
                <SelectItem value="Government">Government</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2 col-span-2">
            <Label htmlFor="providerContact">Provider Contact *</Label>
            <Input
              id="providerContact"
              required
              value={formData.providerContact || ""}
              onChange={(e) => setFormData({ ...formData, providerContact: e.target.value })}
              placeholder="Phone or email"
            />
          </div>
        </div>
      </div>

      <div className="space-y-4 border-t pt-6">
        <h3 className="font-semibold">Coverage Details</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="coverageType">Coverage Type *</Label>
            <Select
              value={formData.coverageType}
              onValueChange={(value: any) => setFormData({ ...formData, coverageType: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Cashless">Cashless</SelectItem>
                <SelectItem value="Reimbursement">Reimbursement</SelectItem>
                <SelectItem value="Both">Both</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="coveragePercentage">Coverage Percentage (%) *</Label>
            <Input
              id="coveragePercentage"
              type="number"
              min="0"
              max="100"
              required
              value={formData.coveragePercentage || 0}
              onChange={(e) => setFormData({ ...formData, coveragePercentage: parseFloat(e.target.value) })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="coverageLimit">Coverage Limit (₹) *</Label>
            <Input
              id="coverageLimit"
              type="number"
              min="0"
              required
              value={formData.coverageLimit || 0}
              onChange={(e) => setFormData({ ...formData, coverageLimit: parseFloat(e.target.value) })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="deductible">Deductible (₹) *</Label>
            <Input
              id="deductible"
              type="number"
              min="0"
              required
              value={formData.deductible || 0}
              onChange={(e) => setFormData({ ...formData, deductible: parseFloat(e.target.value) })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="copay">Co-pay (₹) *</Label>
            <Input
              id="copay"
              type="number"
              min="0"
              required
              value={formData.copay || 0}
              onChange={(e) => setFormData({ ...formData, copay: parseFloat(e.target.value) })}
            />
          </div>
          <div className="space-y-2 flex items-center gap-3 pt-6">
            <Switch
              id="preAuthRequired"
              checked={formData.preAuthRequired || false}
              onCheckedChange={(checked) => setFormData({ ...formData, preAuthRequired: checked })}
            />
            <Label htmlFor="preAuthRequired">Pre-authorization Required</Label>
          </div>
        </div>
      </div>

      <div className="space-y-4 border-t pt-6">
        <h3 className="font-semibold">Policy Period</h3>
        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="policyStartDate">Start Date *</Label>
            <Input
              id="policyStartDate"
              type="date"
              required
              value={formData.policyStartDate || ""}
              onChange={(e) => setFormData({ ...formData, policyStartDate: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="policyEndDate">End Date *</Label>
            <Input
              id="policyEndDate"
              type="date"
              required
              value={formData.policyEndDate || ""}
              onChange={(e) => setFormData({ ...formData, policyEndDate: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="status">Status *</Label>
            <Select
              value={formData.status}
              onValueChange={(value: any) => setFormData({ ...formData, status: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Active">Active</SelectItem>
                <SelectItem value="Expired">Expired</SelectItem>
                <SelectItem value="Suspended">Suspended</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
    </>
  );
}
