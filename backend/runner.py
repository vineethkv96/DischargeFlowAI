import asyncio
from migrations.seed_dischargeflow_patients import seed_dischargeflow_patients
from migrations.seed_patientcare_data import seed_data
from migrations.upgrade_patients_overview_fields import run_migration

async def run_all_seeds():
    print("Running all seed scripts...")
    await seed_dischargeflow_patients()
    await seed_data()
    await run_migration()
    print("All seeds completed!")
