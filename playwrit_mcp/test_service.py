import requests
import time
import subprocess
import sys
import os
import json

def test_service():
    # Start the service in the background
    # process = subprocess.Popen([sys.executable, "agent.py"], cwd=os.getcwd())
    # print(f"Service started with PID: {process.pid}")
    
    # Wait for service to start
    time.sleep(5)
    patient_name ='P001'
    
    url = "http://localhost:18000/process"
    # Use f-string to interpolate patient_name
    payload = {
        "prompt": f"""Go to http://localhost:8080/patients, click the 'Search patients by name, ID, or phone...' input box, enter {patient_name}, press search, click 'View Details' on the first result row.
        
        Extract the patient details and return them in the following JSON format ONLY:
        {{
            "labs": {{ "hemoglobin": "value", "white_blood_cell_count": "value", "platelet_count": "value" }},
            "vitals": {{ "blood_pressure": "value", "heart_rate": "value", "temperature": "value", "respiratory_rate": "value" }},
            "pharmacy_pending": ["item1", ...],
            "radiology_pending": ["item1", ...],
            "billing_pending": {{ "amount": 0, "status": "value" }},
            "doctor_notes": ["note1", ...],
            "procedures": ["proc1", ...],
            "nursing_notes": ["note1", ...],
            "discharge_blockers": ["blocker1", ...]
        }}
        
        If a field is not found, use null or empty list/dict as appropriate. Do not wrap in markdown code blocks.""",
        "expected_output": "Billing info"
    }
    
    response_text = ""
    
    try:
        print(f"Sending request to {url}...")
        response = requests.post(url, json=payload)
        print(f"Status Code: {response.status_code}")
        resp_json = response.json()
        print(f"Response: {resp_json}")
        
        # Assuming the agent's output is in the 'expected_output' field based on previous logs
        # or maybe it's in a different field. The logs showed: 'expected_output': 'Could you please...'
        # We'll assume 'expected_output' holds the string result.
        if isinstance(resp_json, dict):
             response_text = resp_json.get("expected_output", "")
             # If the service returns the result in a different key, we might need to adjust.
             # But based on the logs: 'expected_output': '...'
        else:
             response_text = str(resp_json)

        if response.status_code == 200:
            print("✅ Test Passed")
        else:
            print("❌ Test Failed")
            
    except Exception as e:
        print(f"❌ Error: {e}")
    finally:
        # Kill the service
        # process.terminate()
        # process.wait()
        print("Service stopped")

    # Process the extracted text
    try:
        # The agent might return markdown code blocks, strip them if present
        clean_text = response_text
        if clean_text.startswith("```json"):
            clean_text = clean_text[7:]
        if clean_text.endswith("```"):
            clean_text = clean_text[:-3]
        
        llm_json = json.loads(clean_text.strip())
    except Exception:
        # If AI did not return JSON, wrap raw text
        print("Could not parse JSON from response text.")
        llm_json = {}

    # ------------------------------------------------------------
    # 3. Build your final structured output format
    # ------------------------------------------------------------
    extracted_data = {
        "labs": llm_json.get("labs", {}),
        "vitals": llm_json.get("vitals", {}),
        "pharmacy_pending": llm_json.get("pharmacy_pending", []),
        "radiology_pending": llm_json.get("radiology_pending", []),
        "billing_pending": llm_json.get("billing_pending", {}),
        "doctor_notes": llm_json.get("doctor_notes", []),
        "procedures": llm_json.get("procedures", []),
        "nursing_notes": llm_json.get("nursing_notes", []),
        "discharge_blockers": llm_json.get("discharge_blockers", []),

        # Raw debugging / traceability
        "raw_data": {
            "extraction_method": "api_service_automation",
            "llm_reasoning": response_text[:500] if response_text else ""
        }
    }

    print(json.dumps(extracted_data, indent=2))

if __name__ == "__main__":
    test_service()
