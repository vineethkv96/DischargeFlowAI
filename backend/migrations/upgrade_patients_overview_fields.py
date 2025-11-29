"""
Migration script to backfill and normalize fields used by the Overview dashboard.

This script is safe to run multiple times. It will:
- Ensure discharge-related flags exist on discharge-flow patients (those with `mrn`)
- Optionally add placeholder ward/bed and risk fields if they are missing
"""
import asyncio
from datetime import datetime, timezone
import os
from pathlib import Path

from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv


ROOT_DIR = Path(__file__).parent.parent
load_dotenv(ROOT_DIR / ".env")


async def run_migration():
  mongo_url = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
  db_name = os.environ.get("DB_NAME", "dischargeflow_db")
  client = AsyncIOMotorClient(mongo_url)
  db = client[db_name]

  print("Starting Overview fields migration...")

  # Only touch discharge-flow patients (mrn present)
  filter_query = {"mrn": {"$exists": True}}

  # Set defaults for discharge flags if missing
  print("Ensuring discharge flags exist...")
  await db.patients.update_many(
      filter_query,
      {
          "$setOnInsert": {
              "ready_for_discharge_eval": False,
              "extraction_completed": False,
              "tasks_generated": False,
          }
      },
  )

  # Add placeholder overview fields if missing
  # We do not overwrite any existing values.
  print("Backfilling overview fields where missing...")
  cursor = db.patients.find(filter_query)
  count = 0
  async for doc in cursor:
      update: dict = {}
      if "ward" not in doc:
          update["ward"] = None
      if "bed" not in doc:
          update["bed"] = None
      if "readiness_score" not in doc:
          update["readiness_score"] = None
      if "readmission_risk" not in doc:
          update["readmission_risk"] = None
      if "readmission_risk_level" not in doc:
          update["readmission_risk_level"] = None
      if "delay_reason" not in doc:
          update["delay_reason"] = None
      if "expected_discharge_at" not in doc:
          update["expected_discharge_at"] = None

      if update:
          update["updated_at"] = datetime.now(timezone.utc).isoformat()
          await db.patients.update_one({"_id": doc["_id"]}, {"$set": update})
          count += 1

  print(f"Updated {count} patient documents with overview fields.")
  await client.close()
  print("✅ Overview migration completed.")


if __name__ == "__main__":
  asyncio.run(run_migration())


