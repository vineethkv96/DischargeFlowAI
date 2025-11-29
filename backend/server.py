from fastapi import FastAPI, APIRouter, HTTPException, BackgroundTasks
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta
from enum import Enum

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app
app = FastAPI()
api_router = APIRouter(prefix="/api")

# Enums
class DischargeStatus(str, Enum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    READY = "ready"
    COMPLETED = "completed"
    BLOCKED = "blocked"

class TaskStatus(str, Enum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    FAILED = "failed"

class TaskCategory(str, Enum):
    MEDICAL = "medical"
    OPERATIONAL = "operational"
    FINANCIAL = "financial"

class TaskPriority(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"

# Pydantic Models
class Patient(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    mrn: str
    name: str
    age: Optional[int] = None
    admission_id: str
    diagnosis: Optional[str] = None
    internal_hospital_id: Optional[str] = None
    notes: Optional[str] = None
    # Overview / bed management fields (optional for backwards compatibility)
    ward: Optional[str] = None
    bed: Optional[str] = None
    readiness_score: Optional[float] = None  # 0-100
    readmission_risk: Optional[float] = None  # 0-1
    readmission_risk_level: Optional[str] = None  # "low" | "medium" | "high"
    delay_reason: Optional[str] = None
    expected_discharge_at: Optional[datetime] = None
    discharge_status: DischargeStatus = DischargeStatus.PENDING
    ready_for_discharge_eval: bool = False
    extraction_completed: bool = False
    tasks_generated: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class PatientCreate(BaseModel):
    mrn: str
    name: str
    age: Optional[int] = None
    admission_id: str
    diagnosis: Optional[str] = None
    internal_hospital_id: Optional[str] = None
    notes: Optional[str] = None
    ward: Optional[str] = None
    bed: Optional[str] = None
    readiness_score: Optional[float] = None
    readmission_risk: Optional[float] = None
    readmission_risk_level: Optional[str] = None
    delay_reason: Optional[str] = None
    expected_discharge_at: Optional[datetime] = None

class ExtractedData(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    patient_id: str
    labs: Optional[Dict[str, Any]] = None
    vitals: Optional[Dict[str, Any]] = None
    pharmacy_pending: Optional[List[str]] = None
    radiology_pending: Optional[List[str]] = None
    billing_pending: Optional[Dict[str, Any]] = None
    doctor_notes: Optional[List[str]] = None
    procedures: Optional[List[str]] = None
    nursing_notes: Optional[List[str]] = None
    discharge_blockers: Optional[List[str]] = None
    raw_data: Optional[Dict[str, Any]] = None
    extracted_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class Task(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    patient_id: str
    title: str
    description: Optional[str] = None
    category: TaskCategory
    priority: TaskPriority
    status: TaskStatus = TaskStatus.PENDING
    deadline: Optional[datetime] = None
    assigned_to: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    completed_at: Optional[datetime] = None

class TaskCreate(BaseModel):
    patient_id: str
    title: str
    description: Optional[str] = None
    category: TaskCategory
    priority: TaskPriority
    deadline: Optional[datetime] = None
    assigned_to: Optional[str] = None

class AgentLog(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    patient_id: str
    agent_type: str
    reasoning: Optional[str] = None
    action: str
    result: Optional[Dict[str, Any]] = None
    error: Optional[str] = None
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ExtractionRequest(BaseModel):
    patient_id: str

class ExtractionResponse(BaseModel):
    success: bool
    message: str
    extraction_id: Optional[str] = None

class PatientDashboard(BaseModel):
    patient: Patient
    extracted_data: Optional[ExtractedData] = None
    tasks: List[Task]
    agent_logs: List[AgentLog]

# Agent Output Models
class AgentIssue(BaseModel):
    """Individual issue identified by an agent"""
    model_config = ConfigDict(extra="ignore")
    
    code: str
    title: str
    severity: str  # critical, high, medium, low
    message: str
    suggested_action: str
    evidence: Optional[List[str]] = None
    data: Optional[Dict[str, Any]] = None
    agent: Optional[str] = None

class AgentOutputData(BaseModel):
    """Complete agent output data stored in MongoDB"""
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    patient_id: str
    patient_mrn: str
    discharge_state: Optional[Dict[str, Any]] = None
    final_decision: Optional[Dict[str, Any]] = None
    aggregated_issues: List[AgentIssue] = []
    discharge_decision: str  # APPROVE, HOLD, etc.
    approved_by: List[str] = []
    blocked_by: List[str] = []
    discharge_summary: Optional[Dict[str, str]] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class AgentOutputCreate(BaseModel):
    """Model for creating new agent output"""
    patient_id: str
    patient_mrn: str
    discharge_state: Optional[Dict[str, Any]] = None
    final_decision: Optional[Dict[str, Any]] = None
    aggregated_issues: Optional[List[Dict[str, Any]]] = None
    discharge_decision: str
    approved_by: Optional[List[str]] = None
    blocked_by: Optional[List[str]] = None
    discharge_summary: Optional[Dict[str, str]] = None

class OverviewKpis(BaseModel):
    current_inpatients: int
    pending_discharges: int
    avg_readiness_score: Optional[float] = None
    avg_length_of_stay_days: Optional[float] = None
    expected_discharges_24h: int
    high_readmission_risk: int


class ThroughputPoint(BaseModel):
    date: str
    actual: int
    target: int
    movingAvg: float


class TaskTrendPoint(BaseModel):
    date: str
    completed: int
    outstanding: int


class DelayReasonMetric(BaseModel):
    reason: str
    count: int
    avgDelayHours: float


class WardOccupancy(BaseModel):
    ward: str
    occupancy: float
    nurseRatio: Optional[str] = None
    expected24h: int = 0


class OverviewPatientSummary(BaseModel):
    id: str
    name: str
    age: Optional[int]
    ward: Optional[str]
    bed: Optional[str]
    mrn: str
    diagnosis: Optional[str]
    readinessScore: Optional[float]
    pendingTasks: int
    lastAdmission: datetime
    nextAction: Optional[str] = None
    dischargeStatus: str
    delayReason: Optional[str]
    losDays: float
    insuranceType: Optional[str] = None
    attendingPhysician: Optional[str] = None
    riskLevel: Optional[str] = None


class OverviewResponse(BaseModel):
    kpis: OverviewKpis
    throughput: List[ThroughputPoint]
    taskTrend: List[TaskTrendPoint]
    delayReasons: List[DelayReasonMetric]
    occupancyByWard: List[WardOccupancy]
    patients: List[OverviewPatientSummary]

# Import agent service functions
from agent_service import run_extraction_agent, run_task_generator_agent

# Routes
@api_router.get("/")
async def root():
    return {"message": "DischargeFlow AI Agent System"}


# from test_playwright_agent import play_test_main

# @api_router.get("/play_test_main")
# async def play_test_main_v1():
#     # Directly await your async function
#     return await play_test_main()

@api_router.post("/patients", response_model=Patient)
async def create_patient(patient_data: PatientCreate):
    """Create a new patient"""
    patient = Patient(**patient_data.model_dump())
    doc = patient.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['updated_at'] = doc['updated_at'].isoformat()
    
    await db.patients.insert_one(doc)
    return patient

@api_router.get("/patients", response_model=List[Patient])
async def get_patients():
    """Get all discharge flow patients (filter by mrn field)"""
    # Only get patients that have mrn field (discharge flow patients)
    # This filters out patientcare patients that use firstName/lastName
    patients = await db.patients.find({"mrn": {"$exists": True}}, {"_id": 0}).to_list(1000)
    for p in patients:
        if isinstance(p.get('created_at'), str):
            p['created_at'] = datetime.fromisoformat(p['created_at'])
        if isinstance(p.get('updated_at'), str):
            p['updated_at'] = datetime.fromisoformat(p['updated_at'])
    return patients

@api_router.get("/patients/{patient_id}", response_model=Patient)
async def get_patient(patient_id: str):
    """Get a specific patient"""
    patient = await db.patients.find_one({"id": patient_id}, {"_id": 0})
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    
    if isinstance(patient.get('created_at'), str):
        patient['created_at'] = datetime.fromisoformat(patient['created_at'])
    if isinstance(patient.get('updated_at'), str):
        patient['updated_at'] = datetime.fromisoformat(patient['updated_at'])
    
    return patient


@api_router.get("/overview", response_model=OverviewResponse)
async def get_overview():
    """
    Aggregated overview metrics and patient list for the unified dashboard.
    This endpoint is designed to power the frontend Overview tab.
    """
    try:
        now = datetime.now(timezone.utc)

        # Load discharge flow patients only (those with mrn)
        raw_patients = await db.patients.find({"mrn": {"$exists": True}}, {"_id": 0}).to_list(2000)
        patients: List[Patient] = []
        for p in raw_patients:
            # Normalize datetime fields
            for key in ("created_at", "updated_at", "expected_discharge_at"):
                if isinstance(p.get(key), str):
                    try:
                        # Handle both ISO format and other formats
                        dt_str = p[key]
                        if dt_str.endswith('Z'):
                            dt_str = dt_str[:-1] + '+00:00'
                        p[key] = datetime.fromisoformat(dt_str.replace('Z', '+00:00'))
                    except Exception:
                        p[key] = None
            try:
                patients.append(Patient(**p))
            except Exception as e:
                # Log but continue - skip invalid patients
                import logging
                logging.warning(f"Skipping invalid patient: {e}")
                continue

        patient_ids = [p.id for p in patients]

        # Preload tasks to compute per-patient counts and trends
        # Only query if we have patient IDs to avoid empty $in query
        tasks: List[Task] = []
        if patient_ids:
            tasks_cursor = db.tasks.find({"patient_id": {"$in": patient_ids}}, {"_id": 0})
            raw_tasks = await tasks_cursor.to_list(5000)
            for t in raw_tasks:
                for key in ("created_at", "completed_at", "deadline"):
                    if isinstance(t.get(key), str):
                        try:
                            dt_str = t[key]
                            if dt_str.endswith('Z'):
                                dt_str = dt_str[:-1] + '+00:00'
                            t[key] = datetime.fromisoformat(dt_str.replace('Z', '+00:00'))
                        except Exception:
                            t[key] = None
                try:
                    tasks.append(Task(**t))
                except Exception as e:
                    import logging
                    logging.warning(f"Skipping invalid task: {e}")
                    continue

        # KPIs
        current_inpatients = sum(1 for p in patients if p.discharge_status != DischargeStatus.COMPLETED)
        pending_discharges = sum(
            1
            for p in patients
            if p.discharge_status in (DischargeStatus.IN_PROGRESS, DischargeStatus.READY)
        )
        readiness_values = [p.readiness_score for p in patients if p.readiness_score is not None]
        avg_readiness_score = (
            sum(readiness_values) / len(readiness_values) if readiness_values else None
        )
        los_values: List[float] = []
        for p in patients:
            if isinstance(p.created_at, datetime):
                los_days = (now - p.created_at).total_seconds() / 86400.0
                los_values.append(los_days)
        avg_length_of_stay_days = sum(los_values) / len(los_values) if los_values else None

        expected_discharges_24h = 0
        for p in patients:
            if p.expected_discharge_at and isinstance(p.expected_discharge_at, datetime):
                try:
                    time_diff = (p.expected_discharge_at - now).total_seconds()
                    if 0 <= time_diff <= 86400:
                        expected_discharges_24h += 1
                except Exception:
                    continue

        high_readmission_risk = sum(
            1
            for p in patients
            if (p.readmission_risk is not None and p.readmission_risk >= 0.7)
            or (p.readmission_risk_level and p.readmission_risk_level.lower() == "high")
        )

        kpis = OverviewKpis(
            current_inpatients=current_inpatients,
            pending_discharges=pending_discharges,
            avg_readiness_score=avg_readiness_score,
            avg_length_of_stay_days=avg_length_of_stay_days,
            expected_discharges_24h=expected_discharges_24h,
            high_readmission_risk=high_readmission_risk,
        )

        # Discharge throughput: last 30 days, based on COMPLETED patients by updated_at date
        throughput_map: Dict[str, int] = {}
        for p in patients:
            if p.discharge_status == DischargeStatus.COMPLETED and isinstance(
                p.updated_at, datetime
            ):
                day = p.updated_at.date().isoformat()
                throughput_map[day] = throughput_map.get(day, 0) + 1

        last_30_days = [(now.date() - timedelta(days=i)).isoformat() for i in range(29, -1, -1)]
        throughput: List[ThroughputPoint] = []
        moving_window: List[int] = []
        for d in last_30_days:
            count = throughput_map.get(d, 0)
            moving_window.append(count)
            if len(moving_window) > 7:
                moving_window.pop(0)
            moving_avg = sum(moving_window) / len(moving_window) if moving_window else 0
            throughput.append(
                ThroughputPoint(
                    date=d,
                    actual=count,
                    target=10,
                    movingAvg=moving_avg,
                )
            )

        # Task completion trend: last 14 days
        task_trend_map: Dict[str, Dict[str, int]] = {}
        for t in tasks:
            if not isinstance(t.created_at, datetime):
                continue
            day = t.created_at.date().isoformat()
            if day not in task_trend_map:
                task_trend_map[day] = {"completed": 0, "outstanding": 0}
            if t.status == TaskStatus.COMPLETED:
                task_trend_map[day]["completed"] += 1
            else:
                task_trend_map[day]["outstanding"] += 1

        last_14_days = [(now.date() - timedelta(days=i)).isoformat() for i in range(13, -1, -1)]
        task_trend: List[TaskTrendPoint] = []
        for d in last_14_days:
            entry = task_trend_map.get(d, {"completed": 0, "outstanding": 0})
            task_trend.append(
                TaskTrendPoint(
                    date=d,
                    completed=entry["completed"],
                    outstanding=entry["outstanding"],
                )
            )

        # Delay reasons based on patient.delay_reason
        delay_counts: Dict[str, List[float]] = {}
        for p in patients:
            if not p.delay_reason:
                continue
            key = p.delay_reason
            if key not in delay_counts:
                delay_counts[key] = []
            if isinstance(p.created_at, datetime):
                delay_hours = (now - p.created_at).total_seconds() / 3600.0
                delay_counts[key].append(delay_hours)

        delay_reasons: List[DelayReasonMetric] = []
        for reason, delays in delay_counts.items():
            avg_delay = sum(delays) / len(delays) if delays else 0.0
            delay_reasons.append(
                DelayReasonMetric(reason=reason, count=len(delays), avgDelayHours=avg_delay)
            )

        # Ward occupancy: simple count by ward; occupancy is relative count
        ward_counts: Dict[str, int] = {}
        for p in patients:
            if not p.ward:
                continue
            ward_counts[p.ward] = ward_counts.get(p.ward, 0) + 1
        max_count = max(ward_counts.values()) if ward_counts else 0
        occupancy_by_ward: List[WardOccupancy] = []
        for ward, count in ward_counts.items():
            occupancy_pct = float(count) / max_count * 100 if max_count > 0 else 0.0
            expected_24 = 0
            for p in patients:
                if p.ward == ward and p.expected_discharge_at and isinstance(p.expected_discharge_at, datetime):
                    try:
                        time_diff = (p.expected_discharge_at - now).total_seconds()
                        if 0 <= time_diff <= 86400:
                            expected_24 += 1
                    except Exception:
                        continue
            occupancy_by_ward.append(
                WardOccupancy(
                    ward=ward,
                    occupancy=occupancy_pct,
                    nurseRatio=None,
                    expected24h=expected_24,
                )
            )

        # Build per-patient summaries
        tasks_by_patient: Dict[str, List[Task]] = {}
        for t in tasks:
            tasks_by_patient.setdefault(t.patient_id, []).append(t)

        patient_summaries: List[OverviewPatientSummary] = []
        for p in patients:
            patient_tasks = tasks_by_patient.get(p.id, [])
            pending_tasks = sum(1 for t in patient_tasks if t.status != TaskStatus.COMPLETED)
            los_days = 0.0
            if isinstance(p.created_at, datetime):
                los_days = (now - p.created_at).total_seconds() / 86400.0
            summary = OverviewPatientSummary(
                id=p.id,
                name=p.name,
                age=p.age,
                ward=p.ward,
                bed=p.bed,
                mrn=p.mrn,
                diagnosis=p.diagnosis,
                readinessScore=p.readiness_score,
                pendingTasks=pending_tasks,
                lastAdmission=p.created_at if isinstance(p.created_at, datetime) else now,
                nextAction=None,
                dischargeStatus=p.discharge_status.value,
                delayReason=p.delay_reason,
                losDays=los_days,
                insuranceType=None,
                attendingPhysician=None,
                riskLevel=p.readmission_risk_level,
            )
            patient_summaries.append(summary)

        return OverviewResponse(
            kpis=kpis,
            throughput=throughput,
            taskTrend=task_trend,
            delayReasons=delay_reasons,
            occupancyByWard=occupancy_by_ward,
            patients=patient_summaries,
        )
    except Exception as e:
        import logging
        logging.error(f"Error in get_overview: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error generating overview: {str(e)}")

@api_router.post("/patients/{patient_id}/mark-ready")
async def mark_patient_ready(patient_id: str, background_tasks: BackgroundTasks):
    """Mark patient as ready for discharge evaluation and trigger extraction"""
    patient = await db.patients.find_one({"id": patient_id}, {"_id": 0})
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    
    # Update patient status
    await db.patients.update_one(
        {"id": patient_id},
        {"$set": {
            "ready_for_discharge_eval": True,
            "discharge_status": DischargeStatus.IN_PROGRESS,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    # Trigger extraction in background
    background_tasks.add_task(run_extraction_agent, patient_id)
    
    return {"success": True, "message": "Patient marked ready. Extraction started."}

@api_router.post("/patients/{patient_id}/extract", response_model=ExtractionResponse)
async def trigger_extraction(patient_id: str, background_tasks: BackgroundTasks):
    """Manually trigger data extraction for a patient"""
    patient = await db.patients.find_one({"id": patient_id}, {"_id": 0})
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    
    # Run extraction in background
    background_tasks.add_task(run_extraction_agent, patient_id)
    
    return ExtractionResponse(
        success=True,
        message="Extraction started in background"
    )

@api_router.post("/patients/{patient_id}/generate-tasks")
async def generate_tasks(patient_id: str, background_tasks: BackgroundTasks):
    """Generate tasks for a patient based on extracted data"""
    patient = await db.patients.find_one({"id": patient_id}, {"_id": 0})
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    
    # Run task generator in background
    background_tasks.add_task(run_task_generator_agent, patient_id)
    
    return {"success": True, "message": "Task generation started"}

@api_router.get("/patients/{patient_id}/dashboard", response_model=PatientDashboard)
async def get_patient_dashboard(patient_id: str):
    """Get complete dashboard data for a patient"""
    # Get patient
    patient = await db.patients.find_one({"id": patient_id}, {"_id": 0})
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    
    if isinstance(patient.get('created_at'), str):
        patient['created_at'] = datetime.fromisoformat(patient['created_at'])
    if isinstance(patient.get('updated_at'), str):
        patient['updated_at'] = datetime.fromisoformat(patient['updated_at'])
    
    # Get extracted data
    extracted_data = await db.extracted_data.find_one({"patient_id": patient_id}, {"_id": 0})
    if extracted_data and isinstance(extracted_data.get('extracted_at'), str):
        extracted_data['extracted_at'] = datetime.fromisoformat(extracted_data['extracted_at'])
    
    # Get tasks
    tasks = await db.tasks.find({"patient_id": patient_id}, {"_id": 0}).to_list(1000)
    for task in tasks:
        if isinstance(task.get('created_at'), str):
            task['created_at'] = datetime.fromisoformat(task['created_at'])
        if task.get('completed_at') and isinstance(task['completed_at'], str):
            task['completed_at'] = datetime.fromisoformat(task['completed_at'])
        if task.get('deadline') and isinstance(task['deadline'], str):
            task['deadline'] = datetime.fromisoformat(task['deadline'])
    
    # Get agent logs
    agent_logs = await db.agent_logs.find({"patient_id": patient_id}, {"_id": 0}).sort("timestamp", -1).to_list(100)
    for log in agent_logs:
        if isinstance(log.get('timestamp'), str):
            log['timestamp'] = datetime.fromisoformat(log['timestamp'])
    
    return PatientDashboard(
        patient=Patient(**patient),
        extracted_data=ExtractedData(**extracted_data) if extracted_data else None,
        tasks=[Task(**t) for t in tasks],
        agent_logs=[AgentLog(**log) for log in agent_logs]
    )

@api_router.get("/tasks/{patient_id}", response_model=List[Task])
async def get_patient_tasks(patient_id: str):
    """Get all tasks for a patient"""
    tasks = await db.tasks.find({"patient_id": patient_id}, {"_id": 0}).to_list(1000)
    for task in tasks:
        if isinstance(task.get('created_at'), str):
            task['created_at'] = datetime.fromisoformat(task['created_at'])
        if task.get('completed_at') and isinstance(task['completed_at'], str):
            task['completed_at'] = datetime.fromisoformat(task['completed_at'])
        if task.get('deadline') and isinstance(task['deadline'], str):
            task['deadline'] = datetime.fromisoformat(task['deadline'])
    return tasks

@api_router.patch("/tasks/{task_id}/status")
async def update_task_status(task_id: str, status: TaskStatus):
    """Update task status"""
    result = await db.tasks.update_one(
        {"id": task_id},
        {"$set": {
            "status": status,
            "completed_at": datetime.now(timezone.utc).isoformat() if status == TaskStatus.COMPLETED else None
        }}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Task not found")
    
    return {"success": True, "message": "Task updated"}

app.include_router(api_router)

# Include PatientCare Hub API router under /api prefix
from patientcare_api import patientcare_router
app.include_router(patientcare_router, prefix="/api")

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()