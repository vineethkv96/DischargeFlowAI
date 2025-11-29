"""
PatientCare Hub API - Backend routes for the patient management system
"""
from fastapi import APIRouter, HTTPException, Depends, status
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone, timedelta
from enum import Enum
import uuid
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv
from pathlib import Path

# Import auth functions
from auth import (
    get_password_hash,
    verify_password,
    create_access_token,
    get_current_user,
    require_staff,
    require_doctor,
    require_admin,
    TokenData
)

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
db_name = os.environ.get('DB_NAME', 'dischargeflow_db')  # Use same DB as discharge flow
client = AsyncIOMotorClient(mongo_url)
db = client[db_name]

# Router for patientcare endpoints
patientcare_router = APIRouter(prefix="/patientcare", tags=["PatientCare Hub"])


# ==================== ENUMS ====================

class Gender(str, Enum):
    MALE = "Male"
    FEMALE = "Female"
    OTHER = "Other"


class LabTestStatus(str, Enum):
    PENDING = "Pending"
    COMPLETED = "Completed"


class TimelineEventType(str, Enum):
    ADMISSION = "admission"
    LAB = "lab"
    MEDICATION = "medication"
    NOTE = "note"
    BILLING = "billing"
    DISCHARGE = "discharge"


class NoteType(str, Enum):
    DOCTOR = "doctor"
    NURSE = "nurse"


class BillingStatus(str, Enum):
    PENDING = "Pending"
    PAID = "Paid"


class MedicationStatus(str, Enum):
    ACTIVE = "Active"
    DISCONTINUED = "Discontinued"


class PolicyType(str, Enum):
    INDIVIDUAL = "Individual"
    FAMILY = "Family"
    GROUP = "Group"
    GOVERNMENT = "Government"


class CoverageType(str, Enum):
    CASHLESS = "Cashless"
    REIMBURSEMENT = "Reimbursement"
    BOTH = "Both"


class InsuranceStatus(str, Enum):
    ACTIVE = "Active"
    EXPIRED = "Expired"
    SUSPENDED = "Suspended"


class ClaimStatus(str, Enum):
    INITIATED = "Initiated"
    PENDING = "Pending"
    APPROVED = "Approved"
    REJECTED = "Rejected"
    SETTLED = "Settled"


class DocumentType(str, Enum):
    POLICY = "Policy"
    CLAIM = "Claim"
    PRE_AUTHORIZATION = "PreAuthorization"
    OTHER = "Other"


class UserRole(str, Enum):
    ADMIN = "admin"
    DOCTOR = "doctor"
    NURSE = "nurse"
    RECEPTIONIST = "receptionist"
    BILLING = "billing"


# ==================== PYDANTIC MODELS ====================

# Patient Models
class PatientBase(BaseModel):
    firstName: str
    lastName: str
    age: int
    gender: Gender
    address: str
    phone: str
    emergencyContact: str
    medicalHistory: Optional[str] = ""
    lastVisit: str
    allergies: Optional[str] = ""
    currentDiagnosis: Optional[str] = ""
    existingConditions: Optional[str] = ""


class PatientCreate(PatientBase):
    pass


class PatientUpdate(BaseModel):
    firstName: Optional[str] = None
    lastName: Optional[str] = None
    age: Optional[int] = None
    gender: Optional[Gender] = None
    address: Optional[str] = None
    phone: Optional[str] = None
    emergencyContact: Optional[str] = None
    medicalHistory: Optional[str] = None
    lastVisit: Optional[str] = None
    allergies: Optional[str] = None
    currentDiagnosis: Optional[str] = None
    existingConditions: Optional[str] = None


class Patient(PatientBase):
    id: str = Field(default_factory=lambda: f"P{str(uuid.uuid4())[:8].upper()}")
    createdAt: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updatedAt: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


# Lab Test Models
class LabTestBase(BaseModel):
    patientId: str
    testName: str
    orderedDate: str
    status: LabTestStatus = LabTestStatus.PENDING
    results: Optional[str] = ""
    documents: List[str] = []


class LabTestCreate(LabTestBase):
    pass


class LabTestUpdate(BaseModel):
    testName: Optional[str] = None
    orderedDate: Optional[str] = None
    status: Optional[LabTestStatus] = None
    results: Optional[str] = None
    documents: Optional[List[str]] = None


class LabTest(LabTestBase):
    id: str = Field(default_factory=lambda: f"L{str(uuid.uuid4())[:8].upper()}")


# Timeline Event Models
class TimelineEventBase(BaseModel):
    patientId: str
    timestamp: str
    actor: str
    actorRole: str
    activity: str
    type: TimelineEventType


class TimelineEventCreate(TimelineEventBase):
    pass


class TimelineEvent(TimelineEventBase):
    id: str = Field(default_factory=lambda: f"T{str(uuid.uuid4())[:8].upper()}")


# Note Models
class NoteBase(BaseModel):
    patientId: str
    type: NoteType
    author: str
    timestamp: str
    content: str


class NoteCreate(NoteBase):
    pass


class Note(NoteBase):
    id: str = Field(default_factory=lambda: f"N{str(uuid.uuid4())[:8].upper()}")


# Billing Models
class BillingItemBase(BaseModel):
    patientId: str
    description: str
    cost: float
    status: BillingStatus = BillingStatus.PENDING
    date: str


class BillingItemCreate(BillingItemBase):
    pass


class BillingItemUpdate(BaseModel):
    description: Optional[str] = None
    cost: Optional[float] = None
    status: Optional[BillingStatus] = None
    date: Optional[str] = None


class BillingItem(BillingItemBase):
    id: str = Field(default_factory=lambda: f"B{str(uuid.uuid4())[:8].upper()}")


# Medication Models
class MedicationRefill(BaseModel):
    date: str
    pharmacist: str


class MedicationBase(BaseModel):
    patientId: str
    medicationName: str
    dosage: str
    frequency: str
    prescribedDate: str
    prescribedBy: str
    status: MedicationStatus = MedicationStatus.ACTIVE
    instructions: Optional[str] = ""
    refills: List[MedicationRefill] = []


class MedicationCreate(MedicationBase):
    pass


class MedicationUpdate(BaseModel):
    medicationName: Optional[str] = None
    dosage: Optional[str] = None
    frequency: Optional[str] = None
    prescribedDate: Optional[str] = None
    prescribedBy: Optional[str] = None
    status: Optional[MedicationStatus] = None
    instructions: Optional[str] = None
    refills: Optional[List[MedicationRefill]] = None


class Medication(MedicationBase):
    id: str = Field(default_factory=lambda: f"M{str(uuid.uuid4())[:8].upper()}")


# Insurance Models
class InsuranceDocument(BaseModel):
    type: DocumentType
    name: str
    uploadDate: str


class InsuranceClaim(BaseModel):
    id: str = Field(default_factory=lambda: f"C{str(uuid.uuid4())[:8].upper()}")
    billingItemId: str
    claimDate: str
    status: ClaimStatus = ClaimStatus.INITIATED
    claimedAmount: float
    approvedAmount: float = 0
    settlementDate: Optional[str] = None
    notes: str = ""


class InsuranceNote(BaseModel):
    timestamp: str
    author: str
    content: str


class InsuranceBase(BaseModel):
    patientId: str
    providerName: str
    policyName: str
    policyType: PolicyType
    policyNumber: str
    providerContact: str
    coverageType: CoverageType
    coveragePercentage: float
    coverageLimit: float
    deductible: float
    copay: float
    preAuthRequired: bool
    policyStartDate: str
    policyEndDate: str
    status: InsuranceStatus = InsuranceStatus.ACTIVE
    documents: List[InsuranceDocument] = []
    claims: List[InsuranceClaim] = []
    notes: List[InsuranceNote] = []


class InsuranceCreate(InsuranceBase):
    pass


class InsuranceUpdate(BaseModel):
    providerName: Optional[str] = None
    policyName: Optional[str] = None
    policyType: Optional[PolicyType] = None
    policyNumber: Optional[str] = None
    providerContact: Optional[str] = None
    coverageType: Optional[CoverageType] = None
    coveragePercentage: Optional[float] = None
    coverageLimit: Optional[float] = None
    deductible: Optional[float] = None
    copay: Optional[float] = None
    preAuthRequired: Optional[bool] = None
    policyStartDate: Optional[str] = None
    policyEndDate: Optional[str] = None
    status: Optional[InsuranceStatus] = None
    documents: Optional[List[InsuranceDocument]] = None
    claims: Optional[List[InsuranceClaim]] = None
    notes: Optional[List[InsuranceNote]] = None


class Insurance(InsuranceBase):
    id: str = Field(default_factory=lambda: f"I{str(uuid.uuid4())[:8].upper()}")


# User Models for Authentication
class UserBase(BaseModel):
    email: str
    name: str
    role: UserRole


class UserCreate(UserBase):
    password: str


class User(UserBase):
    id: str = Field(default_factory=lambda: f"U{str(uuid.uuid4())[:8].upper()}")
    createdAt: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    isActive: bool = True


class UserInDB(User):
    hashedPassword: str


# Auth Models
class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class TokenData(BaseModel):
    user_id: Optional[str] = None
    email: Optional[str] = None
    role: Optional[str] = None


class LoginRequest(BaseModel):
    email: str
    password: str


# Response Models
class PatientDashboardResponse(BaseModel):
    patient: Patient
    labTests: List[LabTest]
    timeline: List[TimelineEvent]
    doctorNotes: List[Note]
    nurseNotes: List[Note]
    billing: List[BillingItem]
    medications: List[Medication]
    insurance: Optional[Insurance] = None


# ==================== AUTHENTICATION ROUTES ====================

@patientcare_router.post("/auth/register", response_model=User, status_code=status.HTTP_201_CREATED)
async def register(user_data: UserCreate, current_user: TokenData = Depends(require_admin)):
    """Register a new user (admin only)"""
    # Check if user already exists
    existing = await db.users.find_one({"email": user_data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Create user
    user = User(**user_data.model_dump(exclude={"password"}))
    user_dict = user.model_dump()
    user_dict["hashedPassword"] = get_password_hash(user_data.password)
    user_dict["createdAt"] = datetime.now(timezone.utc).isoformat()
    
    await db.users.insert_one(user_dict)
    return user


@patientcare_router.post("/auth/login", response_model=Token)
async def login(login_data: LoginRequest):
    """Login and get access token"""
    user = await db.users.find_one({"email": login_data.email})
    if not user:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    if not verify_password(login_data.password, user.get("hashedPassword")):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    if not user.get("isActive", True):
        raise HTTPException(status_code=403, detail="User account is inactive")
    
    # Create token
    access_token = create_access_token({
        "sub": user["id"],
        "email": user["email"],
        "role": user["role"],
        "name": user["name"]
    })
    
    return Token(access_token=access_token, token_type="bearer")


@patientcare_router.get("/auth/me", response_model=User)
async def get_current_user_info(current_user: TokenData = Depends(get_current_user)):
    """Get current user information"""
    user = await db.users.find_one({"id": current_user.user_id}, {"_id": 0, "hashedPassword": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


# ==================== PATIENT ROUTES ====================

@patientcare_router.get("/patients", response_model=List[Patient])
async def get_patients(current_user: TokenData = Depends(require_staff)):
    """Get all patients (both PatientCare Hub and DischargeFlow patients)"""
    # Get all patients regardless of schema
    all_patients_raw = await db.patients.find({}, {"_id": 0}).to_list(2000)
    
    valid_patients = []
    for p in all_patients_raw:
        try:
            # If it has firstName/lastName, it's a PatientCare Hub patient
            if p.get("firstName") and p.get("lastName"):
                valid_patients.append(Patient(**p))
            # If it has mrn but no firstName, it's a DischargeFlow patient - convert it
            elif p.get("mrn") and not p.get("firstName"):
                # Convert DischargeFlow patient to PatientCare Hub format for display
                name_parts = p.get("name", "Unknown Patient").split()
                discharge_patient = {
                    "id": p.get("id", ""),
                    "firstName": name_parts[0] if name_parts else "Unknown",
                    "lastName": " ".join(name_parts[1:]) if len(name_parts) > 1 else "",
                    "age": p.get("age"),
                    "gender": "Other",  # DischargeFlow doesn't have gender
                    "address": "",
                    "phone": "",
                    "emergencyContact": "",
                    "medicalHistory": "",
                    "lastVisit": p.get("created_at", "").split("T")[0] if isinstance(p.get("created_at"), str) else (p.get("created_at").isoformat().split("T")[0] if p.get("created_at") else ""),
                    "allergies": "",
                    "currentDiagnosis": p.get("diagnosis", ""),
                    "existingConditions": "",
                    "createdAt": p.get("created_at", ""),
                    "updatedAt": p.get("updated_at", ""),
                }
                # Only add if we have at least a name
                if p.get("name"):
                    try:
                        valid_patients.append(Patient(**discharge_patient))
                    except Exception as e:
                        import logging
                        logging.warning(f"Failed to convert DischargeFlow patient {p.get('id')}: {e}")
                        continue
        except Exception as e:
            # Skip patients that can't be converted
            import logging
            logging.warning(f"Skipping patient {p.get('id', 'unknown')}: {e}")
            continue
    
    return valid_patients


@patientcare_router.get("/patients/{patient_id}", response_model=Patient)
async def get_patient(patient_id: str, current_user: TokenData = Depends(require_staff)):
    """Get a specific patient"""
    patient = await db.patients.find_one({"id": patient_id}, {"_id": 0})
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    return Patient(**patient)


@patientcare_router.post("/patients", response_model=Patient, status_code=status.HTTP_201_CREATED)
async def create_patient(patient_data: PatientCreate, current_user: TokenData = Depends(require_staff)):
    """Create a new patient"""
    # Generate ID
    count = await db.patients.count_documents({})
    patient_id = f"P{str(count + 1).zfill(3)}"
    
    patient = Patient(id=patient_id, **patient_data.model_dump())
    patient_dict = patient.model_dump()
    patient_dict["createdAt"] = datetime.now(timezone.utc).isoformat()
    patient_dict["updatedAt"] = datetime.now(timezone.utc).isoformat()
    
    await db.patients.insert_one(patient_dict)
    
    # Create timeline event
    await db.timeline.insert_one({
        "id": f"T{str(await db.timeline.count_documents({}) + 1).zfill(3)}",
        "patientId": patient_id,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "actor": current_user.name or current_user.email,
        "actorRole": current_user.role,
        "activity": f"Patient {patient.firstName} {patient.lastName} registered",
        "type": "admission"
    })
    
    return patient


@patientcare_router.patch("/patients/{patient_id}", response_model=Patient)
async def update_patient(
    patient_id: str,
    patient_data: PatientUpdate,
    current_user: TokenData = Depends(require_staff)
):
    """Update a patient"""
    patient = await db.patients.find_one({"id": patient_id}, {"_id": 0})
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    
    # Update only provided fields
    update_data = patient_data.model_dump(exclude_unset=True)
    update_data["updatedAt"] = datetime.now(timezone.utc).isoformat()
    
    await db.patients.update_one({"id": patient_id}, {"$set": update_data})
    
    # Create timeline event
    await db.timeline.insert_one({
        "id": f"T{str(await db.timeline.count_documents({}) + 1).zfill(3)}",
        "patientId": patient_id,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "actor": current_user.name or current_user.email,
        "actorRole": current_user.role,
        "activity": "Patient information updated",
        "type": "note"
    })
    
    updated = await db.patients.find_one({"id": patient_id}, {"_id": 0})
    return Patient(**updated)


# ==================== LAB TESTS ROUTES ====================

@patientcare_router.get("/patients/{patient_id}/lab-tests", response_model=List[LabTest])
async def get_lab_tests(patient_id: str, current_user: TokenData = Depends(require_staff)):
    """Get all lab tests for a patient"""
    tests = await db.lab_tests.find({"patientId": patient_id}, {"_id": 0}).to_list(1000)
    return [LabTest(**t) for t in tests]


@patientcare_router.post("/patients/{patient_id}/lab-tests", response_model=LabTest, status_code=status.HTTP_201_CREATED)
async def create_lab_test(
    patient_id: str,
    test_data: LabTestCreate,
    current_user: TokenData = Depends(require_doctor)
):
    """Create a new lab test"""
    count = await db.lab_tests.count_documents({})
    test_id = f"L{str(count + 1).zfill(3)}"
    
    test = LabTest(id=test_id, **test_data.model_dump())
    test_dict = test.model_dump()
    
    await db.lab_tests.insert_one(test_dict)
    
    # Create timeline event
    await db.timeline.insert_one({
        "id": f"T{str(await db.timeline.count_documents({}) + 1).zfill(3)}",
        "patientId": patient_id,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "actor": current_user.name or current_user.email,
        "actorRole": current_user.role,
        "activity": f"Ordered {test_data.testName}",
        "type": "lab"
    })
    
    return test


@patientcare_router.patch("/lab-tests/{test_id}", response_model=LabTest)
async def update_lab_test(
    test_id: str,
    test_data: LabTestUpdate,
    current_user: TokenData = Depends(require_staff)
):
    """Update a lab test"""
    test = await db.lab_tests.find_one({"id": test_id}, {"_id": 0})
    if not test:
        raise HTTPException(status_code=404, detail="Lab test not found")
    
    update_data = test_data.model_dump(exclude_unset=True)
    await db.lab_tests.update_one({"id": test_id}, {"$set": update_data})
    
    updated = await db.lab_tests.find_one({"id": test_id}, {"_id": 0})
    return LabTest(**updated)


# ==================== TIMELINE ROUTES ====================

@patientcare_router.get("/patients/{patient_id}/timeline", response_model=List[TimelineEvent])
async def get_timeline(patient_id: str, current_user: TokenData = Depends(require_staff)):
    """Get timeline events for a patient"""
    events = await db.timeline.find({"patientId": patient_id}, {"_id": 0}).sort("timestamp", -1).to_list(1000)
    return [TimelineEvent(**e) for e in events]


@patientcare_router.post("/patients/{patient_id}/timeline", response_model=TimelineEvent, status_code=status.HTTP_201_CREATED)
async def create_timeline_event(
    patient_id: str,
    event_data: TimelineEventCreate,
    current_user: TokenData = Depends(require_staff)
):
    """Create a timeline event"""
    count = await db.timeline.count_documents({})
    event_id = f"T{str(count + 1).zfill(3)}"
    
    event = TimelineEvent(id=event_id, **event_data.model_dump())
    event_dict = event.model_dump()
    
    await db.timeline.insert_one(event_dict)
    return event


# ==================== NOTES ROUTES ====================

@patientcare_router.get("/patients/{patient_id}/notes", response_model=Dict[str, List[Note]])
async def get_notes(patient_id: str, current_user: TokenData = Depends(require_staff)):
    """Get all notes for a patient, grouped by type"""
    notes = await db.notes.find({"patientId": patient_id}, {"_id": 0}).sort("timestamp", -1).to_list(1000)
    note_list = [Note(**n) for n in notes]
    
    return {
        "doctor": [n for n in note_list if n.type == "doctor"],
        "nurse": [n for n in note_list if n.type == "nurse"]
    }


@patientcare_router.post("/patients/{patient_id}/notes", response_model=Note, status_code=status.HTTP_201_CREATED)
async def create_note(
    patient_id: str,
    note_data: NoteCreate,
    current_user: TokenData = Depends(require_staff)
):
    """Create a new note"""
    count = await db.notes.count_documents({})
    note_id = f"N{str(count + 1).zfill(3)}"
    
    note = Note(id=note_id, **note_data.model_dump())
    note_dict = note.model_dump()
    
    await db.notes.insert_one(note_dict)
    
    # Create timeline event
    await db.timeline.insert_one({
        "id": f"T{str(await db.timeline.count_documents({}) + 1).zfill(3)}",
        "patientId": patient_id,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "actor": current_user.name or current_user.email,
        "actorRole": current_user.role,
        "activity": f"Added {note_data.type} note",
        "type": "note"
    })
    
    return note


# ==================== BILLING ROUTES ====================

@patientcare_router.get("/patients/{patient_id}/billing", response_model=List[BillingItem])
async def get_billing(patient_id: str, current_user: TokenData = Depends(require_staff)):
    """Get all billing items for a patient"""
    items = await db.billing.find({"patientId": patient_id}, {"_id": 0}).to_list(1000)
    return [BillingItem(**i) for i in items]


@patientcare_router.post("/patients/{patient_id}/billing", response_model=BillingItem, status_code=status.HTTP_201_CREATED)
async def create_billing_item(
    patient_id: str,
    item_data: BillingItemCreate,
    current_user: TokenData = Depends(require_staff)
):
    """Create a new billing item"""
    count = await db.billing.count_documents({})
    item_id = f"B{str(count + 1).zfill(3)}"
    
    item = BillingItem(id=item_id, **item_data.model_dump())
    item_dict = item.model_dump()
    
    await db.billing.insert_one(item_dict)
    
    # Create timeline event
    await db.timeline.insert_one({
        "id": f"T{str(await db.timeline.count_documents({}) + 1).zfill(3)}",
        "patientId": patient_id,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "actor": current_user.name or current_user.email,
        "actorRole": current_user.role,
        "activity": f"Added billing item: {item_data.description}",
        "type": "billing"
    })
    
    return item


@patientcare_router.patch("/billing/{item_id}", response_model=BillingItem)
async def update_billing_item(
    item_id: str,
    item_data: BillingItemUpdate,
    current_user: TokenData = Depends(require_staff)
):
    """Update a billing item"""
    item = await db.billing.find_one({"id": item_id}, {"_id": 0})
    if not item:
        raise HTTPException(status_code=404, detail="Billing item not found")
    
    update_data = item_data.model_dump(exclude_unset=True)
    await db.billing.update_one({"id": item_id}, {"$set": update_data})
    
    updated = await db.billing.find_one({"id": item_id}, {"_id": 0})
    return BillingItem(**updated)


# ==================== MEDICATIONS ROUTES ====================

@patientcare_router.get("/patients/{patient_id}/medications", response_model=List[Medication])
async def get_medications(patient_id: str, current_user: TokenData = Depends(require_staff)):
    """Get all medications for a patient"""
    medications = await db.medications.find({"patientId": patient_id}, {"_id": 0}).to_list(1000)
    return [Medication(**m) for m in medications]


@patientcare_router.post("/patients/{patient_id}/medications", response_model=Medication, status_code=status.HTTP_201_CREATED)
async def create_medication(
    patient_id: str,
    medication_data: MedicationCreate,
    current_user: TokenData = Depends(require_doctor)
):
    """Create a new medication"""
    count = await db.medications.count_documents({})
    med_id = f"M{str(count + 1).zfill(3)}"
    
    medication = Medication(id=med_id, **medication_data.model_dump())
    med_dict = medication.model_dump()
    
    await db.medications.insert_one(med_dict)
    
    # Create timeline event
    await db.timeline.insert_one({
        "id": f"T{str(await db.timeline.count_documents({}) + 1).zfill(3)}",
        "patientId": patient_id,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "actor": current_user.name or current_user.email,
        "actorRole": current_user.role,
        "activity": f"Prescribed {medication_data.medicationName}",
        "type": "medication"
    })
    
    return medication


@patientcare_router.patch("/medications/{medication_id}", response_model=Medication)
async def update_medication(
    medication_id: str,
    medication_data: MedicationUpdate,
    current_user: TokenData = Depends(require_staff)
):
    """Update a medication"""
    medication = await db.medications.find_one({"id": medication_id}, {"_id": 0})
    if not medication:
        raise HTTPException(status_code=404, detail="Medication not found")
    
    update_data = medication_data.model_dump(exclude_unset=True)
    await db.medications.update_one({"id": medication_id}, {"$set": update_data})
    
    updated = await db.medications.find_one({"id": medication_id}, {"_id": 0})
    return Medication(**updated)


# ==================== INSURANCE ROUTES ====================

@patientcare_router.get("/patients/{patient_id}/insurance", response_model=Optional[Insurance])
async def get_insurance(patient_id: str, current_user: TokenData = Depends(require_staff)):
    """Get insurance information for a patient"""
    insurance = await db.insurance.find_one({"patientId": patient_id}, {"_id": 0})
    if not insurance:
        return None
    return Insurance(**insurance)


@patientcare_router.post("/patients/{patient_id}/insurance", response_model=Insurance, status_code=status.HTTP_201_CREATED)
async def create_insurance(
    patient_id: str,
    insurance_data: InsuranceCreate,
    current_user: TokenData = Depends(require_staff)
):
    """Create insurance information for a patient"""
    # Check if insurance already exists
    existing = await db.insurance.find_one({"patientId": patient_id})
    if existing:
        raise HTTPException(status_code=400, detail="Insurance already exists for this patient")
    
    count = await db.insurance.count_documents({})
    insurance_id = f"I{str(count + 1).zfill(3)}"
    
    insurance = Insurance(id=insurance_id, **insurance_data.model_dump())
    ins_dict = insurance.model_dump()
    
    await db.insurance.insert_one(ins_dict)
    return insurance


@patientcare_router.patch("/insurance/{insurance_id}", response_model=Insurance)
async def update_insurance(
    insurance_id: str,
    insurance_data: InsuranceUpdate,
    current_user: TokenData = Depends(require_staff)
):
    """Update insurance information"""
    insurance = await db.insurance.find_one({"id": insurance_id}, {"_id": 0})
    if not insurance:
        raise HTTPException(status_code=404, detail="Insurance not found")
    
    update_data = insurance_data.model_dump(exclude_unset=True)
    await db.insurance.update_one({"id": insurance_id}, {"$set": update_data})
    
    updated = await db.insurance.find_one({"id": insurance_id}, {"_id": 0})
    return Insurance(**updated)


@patientcare_router.delete("/insurance/{insurance_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_insurance(insurance_id: str, current_user: TokenData = Depends(require_staff)):
    """Delete insurance information"""
    result = await db.insurance.delete_one({"id": insurance_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Insurance not found")


# ==================== DASHBOARD ROUTE ====================

@patientcare_router.get("/patients/{patient_id}/dashboard", response_model=PatientDashboardResponse)
async def get_patient_dashboard(patient_id: str, current_user: TokenData = Depends(require_staff)):
    """Get complete dashboard data for a patient"""
    # Get patient
    patient = await db.patients.find_one({"id": patient_id}, {"_id": 0})
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    
    # Check if this is a PatientCare Hub patient (has firstName) or DischargeFlow patient (has mrn but no firstName)
    if not patient.get("firstName") and patient.get("mrn"):
        # This is a DischargeFlow patient - convert it to PatientCare Hub format
        name_parts = patient.get("name", "Unknown Patient").split()
        patient_converted = {
            "id": patient.get("id", ""),
            "firstName": name_parts[0] if name_parts else "Unknown",
            "lastName": " ".join(name_parts[1:]) if len(name_parts) > 1 else "",
            "age": patient.get("age"),
            "gender": "Other",
            "address": "",
            "phone": "",
            "emergencyContact": "",
            "medicalHistory": "",
            "lastVisit": patient.get("created_at", "").split("T")[0] if isinstance(patient.get("created_at"), str) else (patient.get("created_at").isoformat().split("T")[0] if patient.get("created_at") else ""),
            "allergies": "",
            "currentDiagnosis": patient.get("diagnosis", ""),
            "existingConditions": "",
            "createdAt": patient.get("created_at", ""),
            "updatedAt": patient.get("updated_at", ""),
        }
        try:
            patient_obj = Patient(**patient_converted)
        except Exception as e:
            raise HTTPException(
                status_code=400, 
                detail=f"Failed to convert DischargeFlow patient to PatientCare Hub format: {str(e)}"
            )
    else:
        # This is a PatientCare Hub patient
        try:
            patient_obj = Patient(**patient)
        except Exception as e:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid patient data format: {str(e)}"
            )
    
    # Get all related data
    lab_tests = await db.lab_tests.find({"patientId": patient_id}, {"_id": 0}).to_list(1000)
    timeline = await db.timeline.find({"patientId": patient_id}, {"_id": 0}).sort("timestamp", -1).to_list(1000)
    notes = await db.notes.find({"patientId": patient_id}, {"_id": 0}).to_list(1000)
    billing = await db.billing.find({"patientId": patient_id}, {"_id": 0}).to_list(1000)
    medications = await db.medications.find({"patientId": patient_id}, {"_id": 0}).to_list(1000)
    insurance = await db.insurance.find_one({"patientId": patient_id}, {"_id": 0})
    
    # Validate and convert related data
    lab_tests_valid = []
    for t in lab_tests:
        try:
            lab_tests_valid.append(LabTest(**t))
        except Exception:
            continue
    
    timeline_valid = []
    for e in timeline:
        try:
            timeline_valid.append(TimelineEvent(**e))
        except Exception:
            continue
    
    notes_valid = []
    for n in notes:
        try:
            notes_valid.append(Note(**n))
        except Exception:
            continue
    
    billing_valid = []
    for b in billing:
        try:
            billing_valid.append(BillingItem(**b))
        except Exception:
            continue
    
    medications_valid = []
    for m in medications:
        try:
            medications_valid.append(Medication(**m))
        except Exception:
            continue
    
    insurance_obj = None
    if insurance:
        try:
            insurance_obj = Insurance(**insurance)
        except Exception:
            pass
    
    return PatientDashboardResponse(
        patient=patient_obj,
        labTests=lab_tests_valid,
        timeline=timeline_valid,
        doctorNotes=[n for n in notes_valid if n.type == "doctor"],
        nurseNotes=[n for n in notes_valid if n.type == "nurse"],
        billing=billing_valid,
        medications=medications_valid,
        insurance=insurance_obj
    )
