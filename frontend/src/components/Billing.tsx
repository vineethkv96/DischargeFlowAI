import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BillingItem, billingApi, timelineApi, Insurance } from "@/lib/api";
import { Plus, DollarSign, CheckCircle, Shield } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

interface BillingProps {
  patientId: string;
  items: BillingItem[];
  insurance?: Insurance;
  onUpdate: () => void;
}

export function Billing({ patientId, items, insurance, onUpdate }: BillingProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    description: "",
    cost: "",
    status: "Pending" as "Pending" | "Paid",
  });

  const totalCost = items.reduce((sum, item) => sum + item.cost, 0);
  const paidAmount = items.filter((item) => item.status === "Paid").reduce((sum, item) => sum + item.cost, 0);
  const insuranceCovered = insurance?.claims?.reduce((sum, claim) => sum + claim.approvedAmount, 0) || 0;
  const remainingBalance = totalCost - paidAmount - insuranceCovered;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await billingApi.create({
        patientId,
        description: formData.description,
        cost: parseFloat(formData.cost),
        status: formData.status,
        date: new Date().toISOString().split("T")[0],
      });

      await timelineApi.create({
        patientId,
        timestamp: new Date().toISOString(),
        actor: user?.name || "System",
        actorRole: user?.role || "Billing",
        activity: `Billing item added: ${formData.description} - $${formData.cost}`,
        type: "billing",
      });

      toast({
        title: "Billing Item Added",
        description: `${formData.description} has been added to billing.`,
      });

      setOpen(false);
      setFormData({ description: "", cost: "", status: "Pending" });
      onUpdate();
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to add billing item",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleMarkPaid = async (itemId: string) => {
    try {
      await billingApi.update(itemId, { status: "Paid" });
      toast({
        title: "Payment Recorded",
        description: "Billing item marked as paid.",
      });
      onUpdate();
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update billing item",
        variant: "destructive",
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Billing</CardTitle>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <Plus className="h-4 w-4" />
                Add Item
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Billing Item</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="description">Description *</Label>
                  <Input
                    id="description"
                    required
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="e.g., Consultation Fee"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cost">Cost (₹) *</Label>
                  <Input
                    id="cost"
                    type="number"
                    step="0.01"
                    required
                    value={formData.cost}
                    onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
                    placeholder="0.00"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="status">Status *</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value: "Pending" | "Paid") =>
                      setFormData({ ...formData, status: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Pending">Pending</SelectItem>
                      <SelectItem value="Paid">Paid</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">Add Item</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-4 gap-4">
          <div className="space-y-1 rounded-lg border p-4 bg-muted/30">
            <p className="text-xs text-muted-foreground">Total Cost</p>
            <p className="text-2xl font-bold">₹{totalCost.toFixed(2)}</p>
          </div>
          <div className="space-y-1 rounded-lg border p-4 bg-success/10">
            <p className="text-xs text-muted-foreground">Paid</p>
            <p className="text-2xl font-bold text-success">₹{paidAmount.toFixed(2)}</p>
          </div>
          {insurance && (
            <div className="space-y-1 rounded-lg border p-4 bg-blue-50">
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Shield className="h-3 w-3" />
                Insurance Covered
              </p>
              <p className="text-2xl font-bold text-blue-600">₹{insuranceCovered.toFixed(2)}</p>
            </div>
          )}
          <div className="space-y-1 rounded-lg border p-4 bg-warning/10">
            <p className="text-xs text-muted-foreground">Patient Balance</p>
            <p className="text-2xl font-bold text-warning">₹{remainingBalance.toFixed(2)}</p>
          </div>
        </div>

        {items.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <DollarSign className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No billing items yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((item) => {
              const claim = insurance?.claims.find(c => c.billingItemId === item.id);
              const insuranceAmount = claim?.approvedAmount || 0;
              const patientOwes = item.cost - insuranceAmount;

              return (
                <div
                  key={item.id}
                  className="border rounded-lg p-4 bg-card space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="font-medium">{item.description}</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(item.date).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <p className="text-lg font-bold">₹{item.cost.toFixed(2)}</p>
                      {item.status === "Paid" ? (
                        <Badge className="bg-success text-success-foreground">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Paid
                        </Badge>
                      ) : (
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary">Pending</Badge>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleMarkPaid(item.id)}
                          >
                            Mark Paid
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                  {insurance && (
                    <div className="flex items-center gap-4 text-sm pt-2 border-t">
                      <div className="flex items-center gap-1 text-blue-600">
                        <Shield className="h-3 w-3" />
                        <span>Insurance: ₹{insuranceAmount.toFixed(2)}</span>
                      </div>
                      <div className="text-orange-600 font-medium">
                        Patient owes: ₹{patientOwes.toFixed(2)}
                      </div>
                      {claim && (
                        <Badge variant="outline" className="text-xs">
                          Claim: {claim.status}
                        </Badge>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
