# PatientCare Hub - Database Migrations

## Running the Migration

To seed the MongoDB database with initial data, run the migration script:

```bash
# From the backend directory
cd backend
python migrations/seed_patientcare_data.py
```

Or using Docker:

```bash
docker exec -it discharge_backend python migrations/seed_patientcare_data.py
```

## What Gets Seeded

The migration script will create:

1. **Users** (3 default users):
   - Admin: `admin@hospital.com` / `admin123`
   - Doctor: `doctor@hospital.com` / `doctor123`
   - Nurse: `nurse@hospital.com` / `nurse123`

2. **Patients** (3 sample patients):
   - P001: John Doe
   - P002: Jane Smith
   - P003: Robert Johnson

3. **Lab Tests** (2 tests for P001)

4. **Timeline Events** (2 events for P001)

5. **Notes** (2 notes for P001 - 1 doctor, 1 nurse)

6. **Billing Items** (3 items for P001)

7. **Medications** (2 medications for P001)

8. **Insurance** (1 insurance policy for P001)

## Environment Variables

Make sure these environment variables are set:

- `MONGO_URL`: MongoDB connection string (default: `mongodb://localhost:27017`)
- `DB_NAME`: Database name (default: `patientcare_db`)

## Notes

- The migration script checks if data already exists and will skip if patients are found
- All IDs are generated in the format: `P001`, `L001`, `T001`, etc.
- Timestamps are stored in ISO format

