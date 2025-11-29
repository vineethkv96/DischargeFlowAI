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
from datetime import datetime, timezone
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