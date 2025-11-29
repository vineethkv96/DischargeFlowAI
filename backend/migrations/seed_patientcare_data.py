"""
Migration script to seed initial data for PatientCare Hub
Run this script to populate MongoDB with initial patient data
"""
import asyncio
import sys
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime, timezone
import os
from dotenv import load_dotenv
from pathlib import Path

# Add parent directory to path to import auth module
ROOT_DIR = Path(__file__).parent.parent
sys.path.insert(0, str(ROOT_DIR))

from auth import get_password_hash

load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
# Use same DB as dischargeflow (dischargeflow_db) to keep data consistent
db_name = os.environ.get('DB_NAME', 'dischargeflow_db')
client = AsyncIOMotorClient(mongo_url)
db = client[db_name]


async def seed_data():
    """Seed initial data into MongoDB"""
    print("Starting data migration...")
    
    # Seed Users (only if they don't exist)
    print("Seeding users...")
    users = [
        {
            "id": "U001",
            "email": "admin@hospital.com",
            "name": "Admin User",
            "role": "admin",
            "hashedPassword": get_password_hash("admin123"),
            "isActive": True,
            "createdAt": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": "U002",
            "email": "doctor@hospital.com",
            "name": "Dr. Sarah Wilson",
            "role": "doctor",
            "hashedPassword": get_password_hash("doctor123"),
            "isActive": True,
            "createdAt": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": "U003",
            "email": "nurse@hospital.com",
            "name": "Nurse Maria Garcia",
            "role": "nurse",
            "hashedPassword": get_password_hash("nurse123"),
            "isActive": True,
            "createdAt": datetime.now(timezone.utc).isoformat()
        }
    ]
    
    users_to_insert = []
    for user in users:
        existing = await db.users.find_one({"id": user["id"]})
        if not existing:
            users_to_insert.append(user)
    
    if users_to_insert:
        await db.users.insert_many(users_to_insert)
        print(f"✓ Inserted {len(users_to_insert)} users")
    else:
        print("✓ All users already exist")
    
    # Seed Patients (only if they don't exist)
    print("Seeding patients...")
    patients = [
        {
            "id": "P001",
            "firstName": "John",
            "lastName": "Doe",
            "age": 45,
            "gender": "Male",
            "address": "123 Main St, New York, NY 10001",
            "phone": "(555) 123-4567",
            "emergencyContact": "(555) 987-6543",
            "medicalHistory": "Hypertension, Type 2 Diabetes",
            "lastVisit": "2024-01-15",
            "allergies": "Penicillin",
            "currentDiagnosis": "Acute bronchitis",
            "existingConditions": "Hypertension, Type 2 Diabetes",
            "createdAt": datetime.now(timezone.utc).isoformat(),
            "updatedAt": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": "P002",
            "firstName": "Jane",
            "lastName": "Smith",
            "age": 32,
            "gender": "Female",
            "address": "456 Oak Ave, Brooklyn, NY 11201",
            "phone": "(555) 234-5678",
            "emergencyContact": "(555) 876-5432",
            "medicalHistory": "Asthma",
            "lastVisit": "2024-01-10",
            "allergies": "None",
            "currentDiagnosis": "Annual checkup",
            "existingConditions": "Asthma",
            "createdAt": datetime.now(timezone.utc).isoformat(),
            "updatedAt": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": "P003",
            "firstName": "Robert",
            "lastName": "Johnson",
            "age": 67,
            "gender": "Male",
            "address": "789 Pine Rd, Queens, NY 11354",
            "phone": "(555) 345-6789",
            "emergencyContact": "(555) 765-4321",
            "medicalHistory": "Heart disease, Arthritis",
            "lastVisit": "2024-01-12",
            "allergies": "Sulfa drugs",
            "currentDiagnosis": "Chest pain evaluation",
            "existingConditions": "Coronary artery disease, Osteoarthritis",
            "createdAt": datetime.now(timezone.utc).isoformat(),
            "updatedAt": datetime.now(timezone.utc).isoformat()
        }
    ]
    
    patients_to_insert = []
    for patient in patients:
        existing = await db.patients.find_one({"id": patient["id"]})
        if not existing:
            patients_to_insert.append(patient)
    
    if patients_to_insert:
        await db.patients.insert_many(patients_to_insert)
        print(f"✓ Inserted {len(patients_to_insert)} patients")
    else:
        print("✓ All patients already exist")
    
    # Seed Lab Tests (only if they don't exist)
    print("Seeding lab tests...")
    lab_tests = [
        {
            "id": "L001",
            "patientId": "P001",
            "testName": "Complete Blood Count",
            "orderedDate": "2024-01-15",
            "status": "Completed",
            "results": "Normal range - WBC: 7.5, RBC: 5.2, Platelets: 250",
            "documents": []
        },
        {
            "id": "L002",
            "patientId": "P001",
            "testName": "Chest X-Ray",
            "orderedDate": "2024-01-15",
            "status": "Pending",
            "results": "",
            "documents": []
        }
    ]
    
    lab_tests_to_insert = []
    for test in lab_tests:
        existing = await db.lab_tests.find_one({"id": test["id"]})
        if not existing:
            lab_tests_to_insert.append(test)
    
    if lab_tests_to_insert:
        await db.lab_tests.insert_many(lab_tests_to_insert)
        print(f"✓ Inserted {len(lab_tests_to_insert)} lab tests")
    else:
        print("✓ All lab tests already exist")
    
    # Seed Timeline Events (only if they don't exist)
    print("Seeding timeline events...")
    timeline = [
        {
            "id": "T001",
            "patientId": "P001",
            "timestamp": "2024-01-15T09:00:00",
            "actor": "Dr. Sarah Wilson",
            "actorRole": "Doctor",
            "activity": "Patient John Doe admitted for acute bronchitis",
            "type": "admission"
        },
        {
            "id": "T002",
            "patientId": "P001",
            "timestamp": "2024-01-15T09:30:00",
            "actor": "Dr. Sarah Wilson",
            "actorRole": "Doctor",
            "activity": "Ordered Complete Blood Count and Chest X-Ray for John Doe",
            "type": "lab"
        },
        {
            "id": "T003",
            "patientId": "P001",
            "timestamp": "2024-01-15T10:00:00",
            "actor": "Dr. Sarah Wilson",
            "actorRole": "Doctor",
            "activity": "Prescribed Amoxicillin 500mg for John Doe",
            "type": "medication"
        },
        {
            "id": "T004",
            "patientId": "P001",
            "timestamp": "2024-01-15T10:30:00",
            "actor": "Nurse Maria Garcia",
            "actorRole": "Nurse",
            "activity": "Vital signs recorded for John Doe: BP 130/85, Temp 100.2°F, Pulse 78",
            "type": "note"
        }
    ]
    
    timeline_to_insert = []
    for event in timeline:
        existing = await db.timeline.find_one({"id": event["id"]})
        if not existing:
            timeline_to_insert.append(event)
    
    if timeline_to_insert:
        await db.timeline.insert_many(timeline_to_insert)
        print(f"✓ Inserted {len(timeline_to_insert)} timeline events")
    else:
        print("✓ All timeline events already exist")
    
    # Seed Notes (only if they don't exist)
    print("Seeding notes...")
    notes = [
        {
            "id": "N001",
            "patientId": "P001",
            "type": "doctor",
            "author": "Dr. Sarah Wilson",
            "timestamp": "2024-01-15T10:00:00",
            "content": "Patient John Doe presents with persistent cough and mild fever. Diagnosed with acute bronchitis. Prescribed antibiotics and rest."
        },
        {
            "id": "N002",
            "patientId": "P001",
            "type": "nurse",
            "author": "Nurse Maria Garcia",
            "timestamp": "2024-01-15T10:30:00",
            "content": "Vital signs recorded for John Doe: BP 130/85, Temp 100.2°F, Pulse 78. Patient comfortable and resting."
        }
    ]
    
    notes_to_insert = []
    for note in notes:
        existing = await db.notes.find_one({"id": note["id"]})
        if not existing:
            notes_to_insert.append(note)
    
    if notes_to_insert:
        await db.notes.insert_many(notes_to_insert)
        print(f"✓ Inserted {len(notes_to_insert)} notes")
    else:
        print("✓ All notes already exist")
    
    # Seed Billing (only if they don't exist)
    print("Seeding billing items...")
    billing = [
        {
            "id": "B001",
            "patientId": "P001",
            "description": "Consultation Fee",
            "cost": 150.0,
            "status": "Paid",
            "date": "2024-01-15"
        },
        {
            "id": "B002",
            "patientId": "P001",
            "description": "Complete Blood Count",
            "cost": 75.0,
            "status": "Pending",
            "date": "2024-01-15"
        },
        {
            "id": "B003",
            "patientId": "P001",
            "description": "Chest X-Ray",
            "cost": 200.0,
            "status": "Pending",
            "date": "2024-01-15"
        }
    ]
    
    billing_to_insert = []
    for item in billing:
        existing = await db.billing.find_one({"id": item["id"]})
        if not existing:
            billing_to_insert.append(item)
    
    if billing_to_insert:
        await db.billing.insert_many(billing_to_insert)
        print(f"✓ Inserted {len(billing_to_insert)} billing items")
    else:
        print("✓ All billing items already exist")
    
    # Seed Medications (only if they don't exist)
    print("Seeding medications...")
    medications = [
        {
            "id": "M001",
            "patientId": "P001",
            "medicationName": "Amoxicillin",
            "dosage": "500mg",
            "frequency": "3 times daily",
            "prescribedDate": "2024-01-15",
            "prescribedBy": "Dr. Sarah Wilson",
            "status": "Active",
            "instructions": "Take with food. Complete full course.",
            "refills": [
                {"date": "2024-01-15", "pharmacist": "Central Pharmacy"}
            ]
        },
        {
            "id": "M002",
            "patientId": "P001",
            "medicationName": "Lisinopril",
            "dosage": "10mg",
            "frequency": "Once daily",
            "prescribedDate": "2023-12-01",
            "prescribedBy": "Dr. Sarah Wilson",
            "status": "Active",
            "instructions": "Take in the morning for blood pressure control.",
            "refills": [
                {"date": "2023-12-01", "pharmacist": "Central Pharmacy"},
                {"date": "2024-01-05", "pharmacist": "Central Pharmacy"}
            ]
        }
    ]
    
    medications_to_insert = []
    for med in medications:
        existing = await db.medications.find_one({"id": med["id"]})
        if not existing:
            medications_to_insert.append(med)
    
    if medications_to_insert:
        await db.medications.insert_many(medications_to_insert)
        print(f"✓ Inserted {len(medications_to_insert)} medications")
    else:
        print("✓ All medications already exist")
    
    # Seed Insurance (only if it doesn't exist)
    print("Seeding insurance...")
    insurance = [
        {
            "id": "I001",
            "patientId": "P001",
            "providerName": "Blue Cross Blue Shield",
            "policyName": "Premium Health Plan",
            "policyType": "Individual",
            "policyNumber": "BCBS-2024-123456",
            "providerContact": "1-800-555-1234",
            "coverageType": "Cashless",
            "coveragePercentage": 80.0,
            "coverageLimit": 500000.0,
            "deductible": 1000.0,
            "copay": 20.0,
            "preAuthRequired": True,
            "policyStartDate": "2024-01-01",
            "policyEndDate": "2024-12-31",
            "status": "Active",
            "documents": [
                {
                    "type": "Policy",
                    "name": "policy-document.pdf",
                    "uploadDate": "2024-01-01"
                }
            ],
            "claims": [],
            "notes": [
                {
                    "timestamp": "2024-01-15T09:00:00",
                    "author": "Insurance Desk",
                    "content": "Policy verified and active. Pre-authorization approved for current admission."
                }
            ]
        }
    ]
    
    insurance_to_insert = []
    for ins in insurance:
        existing = await db.insurance.find_one({"id": ins["id"]})
        if not existing:
            insurance_to_insert.append(ins)
    
    if insurance_to_insert:
        await db.insurance.insert_many(insurance_to_insert)
        print(f"✓ Inserted {len(insurance_to_insert)} insurance records")
    else:
        print("✓ All insurance records already exist")
    
    # Verify all data is linked to P001
    print("\nVerifying data consistency...")
    p001_lab_tests = await db.lab_tests.count_documents({"patientId": "P001"})
    p001_timeline = await db.timeline.count_documents({"patientId": "P001"})
    p001_notes = await db.notes.count_documents({"patientId": "P001"})
    p001_billing = await db.billing.count_documents({"patientId": "P001"})
    p001_medications = await db.medications.count_documents({"patientId": "P001"})
    p001_insurance = await db.insurance.count_documents({"patientId": "P001"})
    
    print(f"✓ Patient P001 (John Doe) has:")
    print(f"  - {p001_lab_tests} lab tests")
    print(f"  - {p001_timeline} timeline events")
    print(f"  - {p001_notes} notes")
    print(f"  - {p001_billing} billing items")
    print(f"  - {p001_medications} medications")
    print(f"  - {p001_insurance} insurance record(s)")
    
    print("\n✅ Migration completed successfully!")
    print("\nDefault login credentials:")
    print("  Admin: admin@hospital.com / admin123")
    print("  Doctor: doctor@hospital.com / doctor123")
    print("  Nurse: nurse@hospital.com / nurse123")
    print("\nTo view patient data, navigate to: /patient/P001")

if __name__ == "__main__":
    asyncio.run(seed_data())

