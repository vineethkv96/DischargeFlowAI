import { useEffect, useState } from "react";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  CalendarRange,
  Download,
  Filter,
  Loader2,
  Pill,
  ShieldAlert,
  Users,
} from "lucide-react";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from "@/components/ui/chart";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Line, LineChart, ReferenceLine, Tooltip, XAxis, YAxis } from "recharts";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { dischargeFlowApi, OverviewResponse, OverviewPatientSummary } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

const formatDate = (iso: string) => new Date(iso).toLocaleDateString();

export default function OverviewDashboard() {
  const [overview, setOverview] = useState<OverviewResponse | null>(null);
  const [selectedPatient, setSelectedPatient] = useState<OverviewPatientSummary | null>(null);
  const [selectedKpi, setSelectedKpi] = useState<string | null>(null);
  const [selectedDelay, setSelectedDelay] = useState<string | null>(null);
  const [selectedWard, setSelectedWard] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const load = async () => {
      try {
        const data = await dischargeFlowApi.getOverview();
        setOverview(data);
      } catch (error) {
        console.error(error);
        toast({
          title: "Error loading overview",
          description: error instanceof Error ? error.message : "Failed to load overview data",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [toast]);

  const handleKpiClick = (key: string) => {
    setSelectedKpi((prev) => (prev === key ? null : key));
  };

  const patients = overview?.patients ?? [];

  const filteredPatients = patients.filter((p) => {
    if (search) {
      const s = search.toLowerCase();
      if (
        !(
          p.name.toLowerCase().includes(s) ||
          p.id.toLowerCase().includes(s) ||
          p.mrn.toLowerCase().includes(s) ||
          (p.diagnosis || "").toLowerCase().includes(s)
        )
      ) {
        return false;
      }
    }
    if (selectedWard && p.ward !== selectedWard) return false;
    if (selectedDelay && p.delayReason !== selectedDelay) return false;
    if (
      selectedKpi === "pending-discharges" &&
      !["in_progress", "ready"].includes(p.dischargeStatus)
    ) {
      return false;
    }
    if (selectedKpi === "high-risk" && (p.riskLevel || "").toLowerCase() !== "high") return false;
    return true;
  });

  const kpis = overview?.kpis;
  const currentInpatients = kpis?.current_inpatients ?? 0;
  const pendingDischarges = kpis?.pending_discharges ?? 0;
  const avgReadiness = kpis?.avg_readiness_score ?? 0;
  const avgLos = kpis?.avg_length_of_stay_days ?? 0;
  const expected24h = kpis?.expected_discharges_24h ?? 0;
  const highRiskCount = kpis?.high_readmission_risk ?? 0;

  const readinessColor =
    avgReadiness < 50 ? "bg-red-50 border-red-200" : avgReadiness < 75 ? "bg-amber-50 border-amber-200" : "bg-emerald-50 border-emerald-200";

  const losTrendPositive = true;

  return (
    <div className="min-h-screen bg-background">
      <AppHeader
        title="Overview"
        subtitle="Unified view across PatientCare Hub & DischargeFlow AI"
        action={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" aria-label="Automation rules">
              <Pill className="mr-2 h-4 w-4" />
              Rules &amp; Automations
            </Button>
            <Button size="sm" aria-label="Export reports">
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
          </div>
        }
      />

      <div className="container mx-auto px-4 lg:px-6 py-6 lg:py-8 space-y-6 lg:space-y-8">
        {/* Alert bar */}
        <Card
          className="border-amber-200 bg-amber-50/80"
          role="region"
          aria-label="Urgent discharge alerts"
        >
          <CardContent className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 py-3">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
              <div>
                <p className="text-sm font-semibold text-amber-900">
                  5 patients blocked &gt;24 hrs — view and resolve blockers
                </p>
                <p className="text-xs text-amber-800">
                  Most common reasons: Transport, Pending labs, Social work coordination.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 self-stretch md:self-auto">
              <Button
                variant="outline"
                size="sm"
                className="w-full md:w-auto"
                onClick={() => setSelectedDelay("Transport")}
              >
                View blocked list
              </Button>
              <Button variant="ghost" size="sm" className="w-full md:w-auto">
                <Filter className="mr-2 h-4 w-4" />
                Alert filters
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* KPI row */}
        <div
          className="grid gap-4 md:gap-5 lg:gap-6"
          role="region"
          aria-label="Key discharge metrics"
        >
          <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-6 gap-4 md:gap-5 lg:gap-6">
            <button
              type="button"
              onClick={() => handleKpiClick("inpatients")}
              className={cn(
                "group rounded-xl border bg-card p-4 text-left shadow-sm transition hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                selectedKpi === "inpatients" && "ring-2 ring-primary border-primary",
              )}
              aria-pressed={selectedKpi === "inpatients"}
            >
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Current Inpatients
                </p>
                <Badge variant="outline" className="text-emerald-800 border-emerald-200 bg-emerald-50">
                  Stable
                </Badge>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-2xl font-semibold">{currentInpatients}</span>
                <span className="text-xs text-muted-foreground">+6 vs last 7 days</span>
              </div>
              <div
                className="mt-3 h-8 rounded-full bg-gradient-to-r from-sky-200 via-sky-400 to-sky-200 opacity-60"
                aria-hidden="true"
              />
            </button>

            <button
              type="button"
              onClick={() => handleKpiClick("pending-discharges")}
              className={cn(
                "group rounded-xl border bg-card p-4 text-left shadow-sm transition hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                selectedKpi === "pending-discharges" && "ring-2 ring-primary border-primary",
              )}
              aria-pressed={selectedKpi === "pending-discharges"}
            >
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Pending Discharges
                </p>
                <Badge
                  variant="outline"
                  className="text-amber-800 border-amber-200 bg-amber-50"
                >
                  Attention
                </Badge>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-2xl font-semibold">{pendingDischarges}</span>
                <span className="text-xs text-muted-foreground">
                  12 blocked &gt;24 hrs
                </span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => handleKpiClick("readiness")}
              className={cn(
                "group rounded-xl border p-4 text-left shadow-sm transition hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                readinessColor,
                selectedKpi === "readiness" && "ring-2 ring-primary border-primary",
              )}
              aria-pressed={selectedKpi === "readiness"}
            >
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Discharge Readiness Score
                </p>
              </div>
              <div className="mt-3 flex items-center gap-4">
                <div className="relative h-14 w-14 rounded-full border-4 border-primary/20">
                  <div
                    className={cn(
                      "absolute inset-1 rounded-full border-4",
                      avgReadiness < 50
                        ? "border-red-500"
                        : avgReadiness < 75
                        ? "border-amber-500"
                        : "border-emerald-500",
                    )}
                    aria-hidden="true"
                  />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-lg font-semibold">
                      {Math.round(avgReadiness)}
                    </span>
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">
                    Avg score across current inpatients
                  </p>
                  <p className="flex items-center gap-1 text-xs text-emerald-700">
                    <ArrowUpRight className="h-3 w-3" />
                    +3 vs last week
                  </p>
                </div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => handleKpiClick("los")}
              className={cn(
                "group rounded-xl border bg-card p-4 text-left shadow-sm transition hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                selectedKpi === "los" && "ring-2 ring-primary border-primary",
              )}
              aria-pressed={selectedKpi === "los"}
            >
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Avg Length of Stay
                </p>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-2xl font-semibold">
                  {avgLos.toFixed(1)} <span className="text-base text-muted-foreground">days</span>
                </span>
              </div>
              <p
                className={cn(
                  "mt-1 flex items-center gap-1 text-xs",
                  losTrendPositive ? "text-emerald-700" : "text-red-700",
                )}
              >
                {losTrendPositive ? (
                  <ArrowDownRight className="h-3 w-3" />
                ) : (
                  <ArrowUpRight className="h-3 w-3" />
                )}
                {losTrendPositive ? "-0.4 days vs last month" : "+0.4 days vs last month"}
              </p>
            </button>

            <button
              type="button"
              onClick={() => handleKpiClick("expected24")}
              className={cn(
                "group rounded-xl border bg-card p-4 text-left shadow-sm transition hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                selectedKpi === "expected24" && "ring-2 ring-primary border-primary",
              )}
              aria-pressed={selectedKpi === "expected24"}
            >
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  24-hr Expected Discharges
                </p>
                <Badge variant="outline" className="text-sky-800 border-sky-200 bg-sky-50">
                  On track
                </Badge>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-2xl font-semibold">{expected24h}</span>
                <span className="text-xs text-muted-foreground">82% on track</span>
              </div>
              <div
                className="mt-2 h-1.5 w-full rounded-full bg-muted"
                aria-hidden="true"
              >
                <div className="h-1.5 w-4/5 rounded-full bg-primary" />
              </div>
            </button>

            <button
              type="button"
              onClick={() => handleKpiClick("high-risk")}
              className={cn(
                "group rounded-xl border bg-card p-4 text-left shadow-sm transition hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                selectedKpi === "high-risk" && "ring-2 ring-primary border-primary",
              )}
              aria-pressed={selectedKpi === "high-risk"}
            >
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  High Readmission Risk
                </p>
                <Badge
                  variant="outline"
                  className="flex items-center gap-1 border-red-200 bg-red-50 text-red-800"
                >
                  <ShieldAlert className="h-3 w-3" />
                  High
                </Badge>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-2xl font-semibold">{highRiskCount}</span>
                <span className="text-xs text-muted-foreground">patients flagged</span>
              </div>
            </button>
          </div>
        </div>

        {/* Main content grid: charts + table */}
        <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1.2fr)]">
          <div className="space-y-6">
            {/* Discharge throughput */}
            <Card role="region" aria-label="Discharge throughput over time">
              <CardHeader className="flex flex-row items-center justify-between gap-2">
                <div>
                  <CardTitle className="flex items-center gap-2 text-base md:text-lg">
                    <Users className="h-4 w-4 text-primary" />
                    Discharge Throughput
                  </CardTitle>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Actual vs target discharges per day with 7-day moving average.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="icon" aria-label="Previous range">
                    &lt;
                  </Button>
                  <Button variant="outline" size="icon" aria-label="Next range">
                    &gt;
                  </Button>
                  <Button variant="outline" size="sm" className="hidden sm:inline-flex">
                    <CalendarRange className="mr-2 h-4 w-4" />
                    Last 30 days
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <ChartContainer
                  config={{
                    actual: { label: "Actual", color: "hsl(var(--primary))" },
                    target: { label: "Target", color: "hsl(var(--muted-foreground))" },
                    movingAvg: { label: "7-day avg", color: "hsl(var(--sky-500))" },
                  }}
                  className="mt-4 h-64"
                >
                  <LineChart data={(overview?.throughput || []).map((p) => ({
                    day: p.date,
                    actual: p.actual,
                    target: p.target,
                    movingAvg: p.movingAvg,
                  }))}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="day" tickLine={false} />
                    <YAxis tickLine={false} />
                    <Tooltip
                      content={<ChartTooltipContent />}
                      wrapperClassName="!outline-none"
                    />
                    <Line
                      type="monotone"
                      dataKey="actual"
                      stroke="var(--color-actual)"
                      strokeWidth={2}
                      dot={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="target"
                      stroke="var(--color-target)"
                      strokeDasharray="4 4"
                      strokeWidth={2}
                      dot={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="movingAvg"
                      stroke="var(--color-movingAvg)"
                      strokeWidth={2}
                      dot={false}
                    />
                    <ChartLegend content={<ChartLegendContent />} />
                  </LineChart>
                </ChartContainer>
              </CardContent>
            </Card>

            {/* Tasks completion trend */}
            <Card role="region" aria-label="Task completion trend">
              <CardHeader className="flex flex-row items-center justify-between gap-2">
                <div>
                  <CardTitle className="text-base md:text-lg">
                    Tasks Completion Trend
                  </CardTitle>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Completed vs outstanding discharge-related tasks per day.
                  </p>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <ChartContainer
                  config={{
                    completed: { label: "Completed", color: "hsl(var(--primary))" },
                    outstanding: { label: "Outstanding", color: "hsl(var(--destructive))" },
                  }}
                  className="mt-4 h-52"
                >
                  <AreaChart data={(overview?.taskTrend || []).map((p) => ({
                    day: p.date,
                    completed: p.completed,
                    outstanding: p.outstanding,
                  }))}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="day" tickLine={false} />
                    <YAxis tickLine={false} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Area
                      type="monotone"
                      dataKey="completed"
                      stackId="1"
                      stroke="var(--color-completed)"
                      fill="var(--color-completed)"
                      fillOpacity={0.4}
                    />
                    <Area
                      type="monotone"
                      dataKey="outstanding"
                      stackId="1"
                      stroke="var(--color-outstanding)"
                      fill="var(--color-outstanding)"
                      fillOpacity={0.2}
                    />
                    <ChartLegend content={<ChartLegendContent />} />
                  </AreaChart>
                </ChartContainer>
              </CardContent>
            </Card>
          </div>

          {/* Right-hand analytics column */}
          <div className="space-y-6">
            {/* Bed occupancy */}
            <Card role="region" aria-label="Bed occupancy by ward">
              <CardHeader className="flex flex-row items-center justify-between gap-2">
                <div>
                  <CardTitle className="text-base md:text-lg">
                    Bed Occupancy by Ward
                  </CardTitle>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Tap a ward to filter patients and view nurse-to-patient ratios.
                  </p>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-2">
                  {(overview?.occupancyByWard || []).map((ward) => (
                    <button
                      key={ward.ward}
                      type="button"
                      onClick={() =>
                        setSelectedWard((prev) =>
                          prev === ward.ward ? null : ward.ward,
                        )
                      }
                      className={cn(
                        "flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left text-sm transition hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                        selectedWard === ward.ward &&
                          "border-primary bg-primary/5 ring-1 ring-primary",
                      )}
                      aria-pressed={selectedWard === ward.ward}
                    >
                      <div>
                        <p className="font-medium">{ward.ward}</p>
                        <p className="text-xs text-muted-foreground">
                          Nurse ratio {ward.nurseRatio} • {ward.expected24h} expected discharges
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <p className="text-sm font-semibold">
                            {ward.occupancy}
                            <span className="text-xs text-muted-foreground">%</span>
                          </p>
                          <p className="text-[11px] text-muted-foreground">occupied</p>
                        </div>
                        <div
                          className="h-2 w-20 rounded-full bg-muted"
                          aria-hidden="true"
                        >
                          <div
                            className={cn(
                              "h-2 rounded-full",
                              ward.occupancy >= 95
                                ? "bg-red-500"
                                : ward.occupancy >= 85
                                ? "bg-amber-500"
                                : "bg-emerald-500",
                            )}
                            style={{ width: `${Math.min(ward.occupancy, 100)}%` }}
                          />
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Delay reasons */}
            <Card role="region" aria-label="Top discharge delay reasons">
              <CardHeader className="flex flex-row items-center justify-between gap-2">
                <div>
                  <CardTitle className="text-base md:text-lg">
                    Discharge Delay Reasons
                  </CardTitle>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Count of patients delayed and average delay hours.
                  </p>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <ChartContainer
                  config={{
                    count: { label: "Patients", color: "hsl(var(--primary))" },
                  }}
                  className="mt-4 h-52"
                >
                  <BarChart
                    data={(overview?.delayReasons || []).map((d) => ({
                      reason: d.reason,
                      count: d.count,
                      avgDelay: d.avgDelayHours,
                    }))}
                    layout="vertical"
                    margin={{ left: 60 }}
                    barCategoryGap={8}
                  >
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" tickLine={false} />
                    <YAxis
                      type="category"
                      dataKey="reason"
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip
                      content={
                        <ChartTooltipContent
                          labelKey="reason"
                          formatter={(value, name, item: any) => (
                            <div className="flex w-full flex-col gap-0.5">
                              <div className="flex items-center justify-between">
                                <span className="text-muted-foreground text-xs">
                                  {item?.payload?.reason}
                                </span>
                                <span className="font-mono text-xs font-medium">
                                  {value} patients
                                </span>
                              </div>
                              <span className="text-[11px] text-muted-foreground">
                                Avg delay {item?.payload?.avgDelay} hrs
                              </span>
                            </div>
                          )}
                        />
                      }
                    />
                    <Bar
                      dataKey="count"
                      fill="var(--color-count)"
                      radius={[0, 4, 4, 0]}
                      onClick={(data) =>
                        setSelectedDelay(
                          selectedDelay === data.reason ? null : (data.reason as string),
                        )
                      }
                    />
                    <ReferenceLine x={20} stroke="hsl(var(--muted-foreground))" strokeDasharray="3 3" />
                  </BarChart>
                </ChartContainer>
              </CardContent>
            </Card>

            {/* AI next steps summary */}
            <Card role="region" aria-label="DischargeFlow AI suggested next steps">
              <CardHeader>
                <CardTitle className="text-base md:text-lg">
                  DischargeFlow AI · Suggested Next Steps
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-start justify-between gap-3 rounded-lg bg-primary/5 px-3 py-2">
                  <div>
                    <p className="text-sm font-medium">
                      Complete medication reconciliation for 38 patients
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Estimated impact: reduce LOS by 0.6 days on average (confidence 0.92).
                    </p>
                  </div>
                  <Button size="sm" variant="outline">
                    Review
                  </Button>
                </div>
                <div className="flex items-start justify-between gap-3 rounded-lg bg-primary/5 px-3 py-2">
                  <div>
                    <p className="text-sm font-medium">
                      Schedule transport before 3pm for 21 patients
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Estimated impact: reduce blocked &gt;24h by 30% (confidence 0.84).
                    </p>
                  </div>
                  <Button size="sm" variant="outline">
                    Review
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Patient list + filters */}
        <Card role="region" aria-label="Patients ready for discharge overview">
          <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle className="text-base md:text-lg">
                Patients &amp; Discharge Readiness
              </CardTitle>
              <p className="mt-1 text-xs text-muted-foreground">
                Sort, filter, and drill into individual patients. Use bulk actions for cohort
                operations.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative w-full sm:w-64">
                <Input
                  aria-label="Search patients"
                  placeholder="Search by name, ID, MRN, diagnosis..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-3 pr-3 text-sm"
                />
              </div>
              <Button variant="outline" size="sm">
                <Filter className="mr-2 h-4 w-4" />
                Filters
              </Button>
              <Button variant="outline" size="sm">
                <Download className="mr-2 h-4 w-4" />
                Export CSV
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-10 text-muted-foreground">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Loading patients…
              </div>
            ) : filteredPatients.length === 0 ? (
              <div className="py-10 text-center">
                <p className="text-sm font-medium text-foreground">
                  No patients match the current filters.
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Try clearing filters or expanding the date range.
                </p>
              </div>
            ) : (
              <>
                <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
                  <span>
                    Showing {filteredPatients.length} of {patients.length} inpatients
                  </span>
                  <span>Multi-select rows to perform bulk actions.</span>
                </div>
                <ScrollArea className="max-h-[420px] rounded-md border">
                  <Table aria-label="Patient discharge readiness table">
                    <TableHeader className="bg-muted/60">
                      <TableRow>
                        <TableHead className="w-10">
                          <Checkbox aria-label="Select all patients" />
                        </TableHead>
                        <TableHead>Patient</TableHead>
                        <TableHead>Ward / Bed</TableHead>
                        <TableHead>MRN</TableHead>
                        <TableHead>Diagnosis</TableHead>
                        <TableHead>Readiness</TableHead>
                        <TableHead>Pending Tasks</TableHead>
                        <TableHead>Last Admission</TableHead>
                        <TableHead>Next Action</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredPatients.map((p) => (
                        <TableRow
                          key={p.id}
                          className="cursor-pointer hover:bg-muted/40"
                          tabIndex={0}
                          onClick={() => setSelectedPatient(p)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              setSelectedPatient(p);
                            }
                          }}
                        >
                          <TableCell onClick={(e) => e.stopPropagation()}>
                            <Checkbox aria-label={`Select ${p.name}`} />
                          </TableCell>
                          <TableCell>
                            <div className="space-y-0.5">
                              <p className="text-sm font-medium">{p.name}</p>
                              {p.age !== undefined && (
                                <p className="text-xs text-muted-foreground">
                                  {p.age}
                                </p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-0.5 text-sm">
                              <p className="font-medium">{p.ward || "—"}</p>
                              <p className="text-xs text-muted-foreground">{p.bed || "—"}</p>
                            </div>
                          </TableCell>
                          <TableCell className="text-sm">{p.mrn}</TableCell>
                          <TableCell className="max-w-xs text-sm">
                            <span className="line-clamp-2">{p.diagnosis}</span>
                          </TableCell>
                          <TableCell>
                            {p.readinessScore != null && (
                              <Badge
                                variant="outline"
                                className="text-xs font-semibold border-emerald-300 bg-emerald-50 text-emerald-800"
                              >
                                {p.readinessScore}
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-sm">{p.pendingTasks}</TableCell>
                          <TableCell className="text-sm">
                            {formatDate(p.lastAdmission)}
                          </TableCell>
                          <TableCell className="max-w-xs text-xs text-muted-foreground">
                            <span className="line-clamp-2">{p.nextAction}</span>
                          </TableCell>
                          <TableCell
                            className="text-right text-xs"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className="flex justify-end gap-1">
                              <Button size="xs" variant="outline">
                                Timeline
                              </Button>
                              <Button size="xs" variant="outline">
                                Summary PDF
                              </Button>
                              <Button size="xs" variant="outline">
                                Message
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">Bulk actions:</span>
                    <Button size="xs" variant="outline">
                      Notify care team
                    </Button>
                    <Button size="xs" variant="outline">
                      Set priority
                    </Button>
                    <Button size="xs" variant="outline">
                      Export selected
                    </Button>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <span>Role views:</span>
                    <Badge variant="outline" className="cursor-pointer">
                      Clinical
                    </Badge>
                    <Badge variant="outline" className="cursor-pointer">
                      Ops
                    </Badge>
                    <Badge variant="outline" className="cursor-pointer">
                      Admin
                    </Badge>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Patient detail sheet / right rail */}
      <Sheet open={!!selectedPatient} onOpenChange={() => setSelectedPatient(null)}>
        <SheetContent
          side="right"
          className="flex w-full max-w-md flex-col p-0"
          aria-label="Patient detail and discharge readiness"
        >
          {selectedPatient && (
            <>
              <SheetHeader className="border-b bg-card px-6 py-4">
                <SheetTitle className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-base font-semibold">{selectedPatient.name}</p>
                    <p className="text-xs text-muted-foreground">
                      MRN {selectedPatient.mrn} • {selectedPatient.age} ·{" "}
                      {selectedPatient.gender} • {selectedPatient.ward} {selectedPatient.bed}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-xs",
                        selectedPatient.riskLevel === "High" &&
                          "border-red-300 bg-red-50 text-red-800",
                        selectedPatient.riskLevel === "Medium" &&
                          "border-amber-300 bg-amber-50 text-amber-800",
                        selectedPatient.riskLevel === "Low" &&
                          "border-emerald-300 bg-emerald-50 text-emerald-800",
                      )}
                    >
                      {selectedPatient.riskLevel} readmission risk
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {selectedPatient.dischargeStatus}
                    </Badge>
                  </div>
                </SheetTitle>
              </SheetHeader>

              <ScrollArea className="flex-1 px-6 py-4">
                <section className="space-y-4">
                  <div>
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      DischargeFlow AI Summary
                    </h3>
                    <p className="mt-1 text-sm">
                      Likely ready for discharge within the next{" "}
                      <span className="font-semibold">24–36 hours</span>. Top blockers:{" "}
                      <span className="font-semibold">
                        {selectedPatient.delayReason || "no critical blockers identified"}
                      </span>
                      .
                    </p>
                  </div>

                  <div>
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Task Checklist
                    </h3>
                    <div className="mt-2 space-y-2">
                      {["Discharge plan documented", "Orders signed", "Med reconciliation", "Education completed", "Follow-up scheduled"].map(
                        (task, idx) => (
                          <label
                            key={task}
                            className="flex cursor-pointer items-start gap-2 rounded-lg border px-3 py-2 text-xs hover:bg-muted/60"
                          >
                            <Checkbox
                              className="mt-0.5"
                              checked={idx < 2}
                              aria-label={task}
                            />
                            <div className="space-y-0.5">
                              <p className="font-medium">{task}</p>
                              <p className="text-[11px] text-muted-foreground">
                                Owner: {idx % 2 === 0 ? "Primary team" : "Case manager"}
                              </p>
                            </div>
                          </label>
                        ),
                      )}
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-lg border bg-muted/40 p-3">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                        Med reconciliation
                      </p>
                      <p className="mt-1 text-sm font-medium">
                        {selectedPatient.pendingTasks === 0
                          ? "Completed"
                          : "In progress"}
                      </p>
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        Last updated 2h ago by Dr. Rivera
                      </p>
                    </div>
                    <div className="rounded-lg border bg-muted/40 p-3">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                        Next scheduled events
                      </p>
                      <ul className="mt-1 space-y-1 text-xs text-muted-foreground">
                        <li>PT evaluation – Today 14:00</li>
                        <li>Family meeting – Tomorrow 10:30</li>
                      </ul>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Contact &amp; family
                    </h3>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Primary contact: Spouse • Preferred language: English • Interpreter
                      not required.
                    </p>
                  </div>

                  <div>
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Suggested Next Steps (AI)
                    </h3>
                    <div className="mt-2 space-y-2">
                      {[
                        {
                          text: "Confirm completion of med reconciliation before 3pm.",
                          confidence: 0.92,
                        },
                        {
                          text: "Schedule transport to home within the next 24 hours.",
                          confidence: 0.84,
                        },
                        {
                          text: "Arrange follow-up with primary care within 7 days.",
                          confidence: 0.78,
                        },
                      ].map((s) => (
                        <div
                          key={s.text}
                          className="flex items-start justify-between gap-3 rounded-lg border bg-primary/5 px-3 py-2 text-xs"
                        >
                          <div>
                            <p className="text-xs">{s.text}</p>
                            <p className="mt-1 text-[11px] text-muted-foreground">
                              Confidence {Math.round(s.confidence * 100)}%
                            </p>
                          </div>
                          <div className="flex flex-col gap-1">
                            <Button size="xs" variant="outline">
                              Accept
                            </Button>
                            <Button size="xs" variant="ghost">
                              Snooze
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </section>
              </ScrollArea>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}


