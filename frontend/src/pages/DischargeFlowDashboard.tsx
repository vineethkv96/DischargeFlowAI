import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  dischargeFlowApi,
  DischargeDashboard,
  DischargeTask,
} from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AppHeader } from "@/components/AppHeader";
import {
  ArrowLeft,
  RefreshCw,
  FileText,
  CheckCircle2,
  Clock,
  AlertCircle,
  Activity,
  Beaker,
  Heart,
  Pill,
  FileImage,
  DollarSign,
  User,
  Stethoscope,
  ClipboardList,
  Loader2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function DischargeFlowDashboard() {
  const { patientId } = useParams<{ patientId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [dashboardData, setDashboardData] = useState<DischargeDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (patientId) {
      fetchDashboard();
    }
  }, [patientId]);

  const fetchDashboard = async () => {
    if (!patientId) return;
    try {
      const data = await dischargeFlowApi.getDashboard(patientId);
      setDashboardData(data);
    } catch (error) {
      console.error("Error fetching dashboard:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to load dashboard",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleReExtract = async () => {
    if (!patientId) return;
    try {
      setRefreshing(true);
      await dischargeFlowApi.extract(patientId);
      toast({
        title: "Success",
        description: "Re-extraction started in background",
      });
      setTimeout(() => fetchDashboard(), 3000);
    } catch (error) {
      console.error("Error triggering extraction:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to trigger extraction",
        variant: "destructive",
      });
      setRefreshing(false);
    }
  };

  const handleRegenerateTasks = async () => {
    if (!patientId) return;
    try {
      setRefreshing(true);
      await dischargeFlowApi.generateTasks(patientId);
      toast({
        title: "Success",
        description: "Task generation started",
      });
      setTimeout(() => fetchDashboard(), 3000);
    } catch (error) {
      console.error("Error regenerating tasks:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to regenerate tasks",
        variant: "destructive",
      });
      setRefreshing(false);
    }
  };

  const handleTaskStatusUpdate = async (taskId: string, status: DischargeTask['status']) => {
    try {
      await dischargeFlowApi.updateTaskStatus(taskId, status);
      toast({
        title: "Success",
        description: "Task status updated",
      });
      fetchDashboard();
    } catch (error) {
      console.error("Error updating task:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update task",
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { variant: "secondary" | "default" | "destructive"; icon: typeof Clock; text: string; className?: string }> = {
      pending: { variant: "secondary", icon: Clock, text: "Pending" },
      in_progress: { variant: "default", icon: Activity, text: "In Progress" },
      ready: { variant: "default", icon: CheckCircle2, text: "Ready", className: "bg-green-500" },
      completed: { variant: "default", icon: CheckCircle2, text: "Completed", className: "bg-blue-500" },
      blocked: { variant: "destructive", icon: AlertCircle, text: "Blocked" }
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

  const getPriorityBadge = (priority: string) => {
    const config: Record<string, { className: string; text: string }> = {
      low: { className: "bg-slate-500", text: "Low" },
      medium: { className: "bg-blue-500", text: "Medium" },
      high: { className: "bg-orange-500", text: "High" },
      critical: { className: "bg-red-600", text: "Critical" }
    };

    const { className, text } = config[priority] || config.medium;
    return <Badge className={className}>{text}</Badge>;
  };

  const getCategoryIcon = (category: string) => {
    const icons: Record<string, typeof Stethoscope> = {
      medical: Stethoscope,
      operational: ClipboardList,
      financial: DollarSign
    };
    return icons[category] || FileText;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!dashboardData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Patient not found</h2>
          <Button onClick={() => navigate("/dischargeflow")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Patients
          </Button>
        </div>
      </div>
    );
  }

  const { patient, extracted_data, tasks, agent_logs } = dashboardData;

  return (
    <div className="min-h-screen bg-background">
      <AppHeader
        title={patient.name}
        subtitle={`MRN: ${patient.mrn} • Admission: ${patient.admission_id}${patient.age ? ` • Age: ${patient.age}` : ''}`}
        showBackButton={true}
        backButtonPath="/dischargeflow"
        action={getStatusBadge(patient.discharge_status)}
      />

      <div className="container mx-auto px-6 py-8">
        <div className="max-w-7xl mx-auto">
          {patient.diagnosis && (
            <p className="mb-4 text-foreground">
              <strong>Diagnosis:</strong> {patient.diagnosis}
            </p>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 mb-8">
            <Button
              onClick={handleReExtract}
              disabled={refreshing}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {refreshing ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4 mr-2" />
              )}
              Re-run Extraction
            </Button>
            <Button
              onClick={handleRegenerateTasks}
              disabled={refreshing || !extracted_data}
              variant="outline"
            >
              {refreshing ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4 mr-2" />
              )}
              Regenerate Tasks
            </Button>
          </div>

          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-4 mb-8">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="extracted">Extracted Data</TabsTrigger>
              <TabsTrigger value="tasks">Tasks ({tasks.length})</TabsTrigger>
              <TabsTrigger value="logs">Agent Logs ({agent_logs.length})</TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Extraction Status</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-3">
                      {patient.extraction_completed ? (
                        <CheckCircle2 className="w-8 h-8 text-green-600" />
                      ) : (
                        <Clock className="w-8 h-8 text-blue-600" />
                      )}
                      <span className="text-2xl font-bold">
                        {patient.extraction_completed ? "Complete" : "Pending"}
                      </span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Total Tasks</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-3">
                      <FileText className="w-8 h-8 text-blue-600" />
                      <span className="text-2xl font-bold">{tasks.length}</span>
                    </div>
                    <div className="mt-2 text-sm text-muted-foreground">
                      {tasks.filter(t => t.status === 'completed').length} completed
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Discharge Readiness</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-3">
                      {patient.discharge_status === 'ready' ? (
                        <CheckCircle2 className="w-8 h-8 text-green-600" />
                      ) : patient.discharge_status === 'blocked' ? (
                        <AlertCircle className="w-8 h-8 text-red-600" />
                      ) : (
                        <Activity className="w-8 h-8 text-blue-600" />
                      )}
                      <span className="text-2xl font-bold capitalize">{patient.discharge_status}</span>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Task Summary by Category */}
              <Card>
                <CardHeader>
                  <CardTitle>Task Summary by Category</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-6">
                    {['medical', 'operational', 'financial'].map(category => {
                      const categoryTasks = tasks.filter(t => t.category === category);
                      const completed = categoryTasks.filter(t => t.status === 'completed').length;
                      return (
                        <div key={category} className="space-y-2">
                          <h4 className="font-semibold capitalize">{category}</h4>
                          <div className="text-3xl font-bold">
                            {completed}/{categoryTasks.length}
                          </div>
                          <div className="w-full bg-muted rounded-full h-2">
                            <div
                              className="bg-blue-600 h-2 rounded-full transition-all"
                              style={{ width: `${categoryTasks.length > 0 ? (completed / categoryTasks.length) * 100 : 0}%` }}
                            ></div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Extracted Data Tab */}
            <TabsContent value="extracted" className="space-y-6">
              {!extracted_data ? (
                <Card className="p-12 text-center">
                  <p className="text-muted-foreground text-lg">No extracted data available yet.</p>
                  <Button onClick={handleReExtract} className="mt-4">
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Extract Data
                  </Button>
                </Card>
              ) : (
                <div className="grid gap-6">
                  {/* Labs */}
                  {extracted_data.labs && Object.keys(extracted_data.labs).length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Beaker className="w-5 h-5" />
                          Laboratory Results
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 gap-4">
                          {Object.entries(extracted_data.labs).map(([key, value]) => (
                            <div key={key} className="flex justify-between p-3 bg-muted rounded-lg">
                              <span className="font-medium capitalize">{key.replace(/_/g, ' ')}</span>
                              <span className="text-foreground">{String(value)}</span>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Vitals */}
                  {extracted_data.vitals && Object.keys(extracted_data.vitals).length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Heart className="w-5 h-5" />
                          Vital Signs
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 gap-4">
                          {Object.entries(extracted_data.vitals).map(([key, value]) => (
                            <div key={key} className="flex justify-between p-3 bg-muted rounded-lg">
                              <span className="font-medium capitalize">{key.replace(/_/g, ' ')}</span>
                              <span className="text-foreground">{String(value)}</span>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Pending Items */}
                  <div className="grid md:grid-cols-2 gap-6">
                    {extracted_data.pharmacy_pending && extracted_data.pharmacy_pending.length > 0 && (
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <Pill className="w-5 h-5" />
                            Pharmacy Pending
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <ul className="space-y-2">
                            {extracted_data.pharmacy_pending.map((item, idx) => (
                              <li key={idx} className="flex items-center gap-2">
                                <Clock className="w-4 h-4 text-orange-500" />
                                <span>{item}</span>
                              </li>
                            ))}
                          </ul>
                        </CardContent>
                      </Card>
                    )}

                    {extracted_data.radiology_pending && extracted_data.radiology_pending.length > 0 && (
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <FileImage className="w-5 h-5" />
                            Radiology Pending
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <ul className="space-y-2">
                            {extracted_data.radiology_pending.map((item, idx) => (
                              <li key={idx} className="flex items-center gap-2">
                                <Clock className="w-4 h-4 text-orange-500" />
                                <span>{item}</span>
                              </li>
                            ))}
                          </ul>
                        </CardContent>
                      </Card>
                    )}
                  </div>

                  {/* Notes */}
                  {extracted_data.doctor_notes && extracted_data.doctor_notes.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <User className="w-5 h-5" />
                          Doctor Notes
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ul className="space-y-2">
                          {extracted_data.doctor_notes.map((note, idx) => (
                            <li key={idx} className="p-3 bg-muted rounded-lg">{note}</li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>
                  )}

                  {/* Discharge Blockers */}
                  {extracted_data.discharge_blockers && extracted_data.discharge_blockers.length > 0 && (
                    <Card className="border-red-200">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-red-600">
                          <AlertCircle className="w-5 h-5" />
                          Discharge Blockers
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ul className="space-y-2">
                          {extracted_data.discharge_blockers.map((blocker, idx) => (
                            <li key={idx} className="flex items-center gap-2 text-red-600">
                              <AlertCircle className="w-4 h-4" />
                              <span>{blocker}</span>
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>
                  )}
                </div>
              )}
            </TabsContent>

            {/* Tasks Tab */}
            <TabsContent value="tasks" className="space-y-4">
              {tasks.length === 0 ? (
                <Card className="p-12 text-center">
                  <p className="text-muted-foreground text-lg">No tasks generated yet.</p>
                  <Button onClick={handleRegenerateTasks} className="mt-4" disabled={!extracted_data}>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Generate Tasks
                  </Button>
                </Card>
              ) : (
                <div className="space-y-4">
                  {tasks.map((task) => {
                    const CategoryIcon = getCategoryIcon(task.category);
                    return (
                      <Card key={task.id} className="p-6">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <CategoryIcon className="w-5 h-5 text-blue-600" />
                              <h3 className="text-lg font-semibold">{task.title}</h3>
                            </div>
                            {task.description && (
                              <p className="text-muted-foreground mb-3">{task.description}</p>
                            )}
                            <div className="flex items-center gap-3">
                              <Badge className="capitalize">{task.category}</Badge>
                              {getPriorityBadge(task.priority)}
                              {getStatusBadge(task.status)}
                            </div>
                          </div>
                          <div className="flex gap-2 ml-4">
                            {task.status === 'pending' && (
                              <Button
                                size="sm"
                                onClick={() => handleTaskStatusUpdate(task.id, 'in_progress')}
                              >
                                Start
                              </Button>
                            )}
                            {task.status === 'in_progress' && (
                              <Button
                                size="sm"
                                onClick={() => handleTaskStatusUpdate(task.id, 'completed')}
                                className="bg-green-600 hover:bg-green-700"
                              >
                                Complete
                              </Button>
                            )}
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              )}
            </TabsContent>

            {/* Agent Logs Tab */}
            <TabsContent value="logs" className="space-y-4">
              {agent_logs.length === 0 ? (
                <Card className="p-12 text-center">
                  <p className="text-muted-foreground text-lg">No agent logs available.</p>
                </Card>
              ) : (
                <div className="space-y-3">
                  {agent_logs.map((log, idx) => (
                    <Card key={idx} className="p-4">
                      <div className="flex items-start gap-4">
                        <Activity className="w-5 h-5 text-blue-600 mt-1" />
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-semibold">{log.agent_type}</span>
                            <span className="text-sm text-muted-foreground">
                              {new Date(log.timestamp).toLocaleString()}
                            </span>
                          </div>
                          <div className="text-sm mb-2">
                            <strong>Action:</strong> {log.action}
                          </div>
                          {log.reasoning && (
                            <div className="text-sm text-muted-foreground mb-2">
                              <strong>Reasoning:</strong> {log.reasoning}
                            </div>
                          )}
                          {log.result && (
                            <div className="text-sm bg-muted p-2 rounded">
                              <strong>Result:</strong> <pre className="mt-1 text-xs">{JSON.stringify(log.result, null, 2)}</pre>
                            </div>
                          )}
                          {log.error && (
                            <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
                              <strong>Error:</strong> {log.error}
                            </div>
                          )}
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}

