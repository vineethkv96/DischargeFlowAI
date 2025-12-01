"""
Migration script to seed initial DischargeFlow AI patient data.

This populates the shared `patients` collection with example inpatients
that match the DischargeFlow schema (mrn/name/admission_id + ward, bed,
readiness, risk, delay_reason, expected_discharge_at, etc.).

Safe to run multiple times: it checks for existing patient IDs / MRNs
and only inserts missing records.
"""

import asyncio
from datetime import datetime, timedelta, timezone
from pathlib import Path
import os

from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv


ROOT_DIR = Path(__file__).parent.parent
load_dotenv(ROOT_DIR / ".env")


async def seed_dischargeflow_patients():
    mongo_url = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
    db_name = os.environ.get("DB_NAME", "dischargeflow_db")
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]

    print("Starting DischargeFlow patients seed migration...")

    now = datetime.now(timezone.utc)

    # Example inpatients with wards / beds / readiness etc.
    # These are intentionally aligned with the frontend Overview use cases.
    # Patient names match PatientCare Hub naming style for consistency.
    patients = [
        {
            "id": "DF-P001",
            "mrn": "DF-MRN-001",
            "name": "JohnDoe",
            "age": 45,
            "admission_id": "ADM-1001",
            "diagnosis": "Acute decompensated heart failure",
            "internal_hospital_id": "HOSP-001",
            "notes": "",
            "ward": "Cardiology A",
            "bed": "A-12",
            "readiness_score": 82.0,
            "readmission_risk": 0.31,
            "readmission_risk_level": "medium",
            "delay_reason": None,
            "expected_discharge_at": (now + timedelta(hours=12)).isoformat(),
            "discharge_status": "ready",
            "ready_for_discharge_eval": True,
            "extraction_completed": False,
            "tasks_generated": False,
            "created_at": (now - timedelta(days=11)).isoformat(),
            "updated_at": now.isoformat(),
        },
        {
            "id": "DF-P002",
            "mrn": "DF-MRN-002",
            "name": "Jane Smith",
            "age": 32,
            "admission_id": "ADM-1002",
            "diagnosis": "Post-hip replacement",
            "internal_hospital_id": "HOSP-002",
            "notes": "",
            "ward": "Surgery B",
            "bed": "B-07",
            "readiness_score": 47.0,
            "readmission_risk": 0.62,
            "readmission_risk_level": "high",
            "delay_reason": "Pending PT clearance",
            "expected_discharge_at": (now + timedelta(days=2)).isoformat(),
            "discharge_status": "in_progress",
            "ready_for_discharge_eval": True,
            "extraction_completed": False,
            "tasks_generated": False,
            "created_at": (now - timedelta(days=7)).isoformat(),
            "updated_at": now.isoformat(),
        },
        {
            "id": "DF-P003",
            "mrn": "DF-MRN-003",
            "name": "Robert Johnson",
            "age": 67,
            "admission_id": "ADM-1003",
            "diagnosis": "Community-acquired pneumonia",
            "internal_hospital_id": "HOSP-003",
            "notes": "",
            "ward": "Medicine C",
            "bed": "C-04",
            "readiness_score": 90.0,
            "readmission_risk": 0.18,
            "readmission_risk_level": "low",
            "delay_reason": None,
            "expected_discharge_at": (now + timedelta(hours=6)).isoformat(),
            "discharge_status": "ready",
            "ready_for_discharge_eval": True,
            "extraction_completed": False,
            "tasks_generated": False,
            "created_at": (now - timedelta(days=4)).isoformat(),
            "updated_at": now.isoformat(),
        },
    ]

    inserted = 0
    for patient in patients:
        existing = db.patients.find_one(
            {"$or": [{"id": patient["id"]}, {"mrn": patient["mrn"]}]}
        )
        if existing:
            continue

        db.patients.insert_one(patient)
        inserted += 1

    print(f"✓ Inserted {inserted} DischargeFlow patients (others already existed).")
    client.close()
    print("✅ DischargeFlow seed migration completed.")


if __name__ == "__main__":
    asyncio.run(seed_dischargeflow_patients())


