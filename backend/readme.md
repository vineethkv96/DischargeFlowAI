Use this for some example data for testing


docker exec -it discharge_backend python3 /app/migrations/seed_dischargeflow_patients.py
docker exec -it discharge_backend python3 /app/migrations/seed_patientcare_data.py
docker exec -it discharge_backend python3 /app/migrations/upgrade_patients_overview_fields.py


Run this if needed:

GEMINI_API_KEY="AIzaSyD1FOh6yZlYG3EHo1aBX81mmiPzFqtUXHk"