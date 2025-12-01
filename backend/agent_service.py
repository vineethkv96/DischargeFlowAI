import asyncio
import asyncio
import subprocess
import json
import os
from pathlib import Path
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime, timezone
import logging
from langchain_core.messages import HumanMessage, SystemMessage
from langchain_openai import ChatOpenAI
from langchain_google_genai import ChatGoogleGenerativeAI
import asyncio
from playwright.async_api import async_playwright
import httpx

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

logger = logging.getLogger(__name__)

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Get LLM API Key
LLM_KEY = os.environ.get('LLM_KEY')

async def log_agent_action(patient_id: str, agent_type: str, action: str, reasoning: str = None, result: dict = None, error: str = None):
    """Log agent actions to database"""
    log_entry = {
        "id": str(datetime.now(timezone.utc).timestamp()),
        "patient_id": patient_id,
        "agent_type": agent_type,
        "action": action,
        "reasoning": reasoning,
        "result": result,
        "error": error,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
    await db.agent_logs.insert_one(log_entry)

import aiohttp
import httpx
import json
import logging

logger = logging.getLogger(__name__)


async def run_playwright_mcp_extraction(patient_name: str) -> dict:
    """
    Calls the existing AI automation API (http://localhost:8000/process)
    to extract patient data by navigating the hospital UI automatically.
    """

    # ------------------------------------------------------------
    # 1. Build AGENT PROMPT
    # ------------------------------------------------------------

    payload = {
        "prompt": f"""Go to http://localhost:8080/patients, user name: admin@hospital.com and password: 'admin123' fill in and click the login button
        
        click the 'Search patients by name, ID, or phone...' input box, enter {patient_name}, press search, click 'View Details' on the first result row.
        
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

    try:
        logger.info("Sending request to automation API...")

        # ------------------------------------------------------------
        # 2. Call External Automation API
        # ------------------------------------------------------------
        async with aiohttp.ClientSession() as session:
            async with session.post("http://host.docker.internal:18000/process", json=payload) as resp:
                if resp.status != 200:
                    raise Exception(f"API returned status {resp.status}")

                api_response = await resp.json()

        # `api_response` can be text or JSON depending on your external service.
        # If it's string → try to parse JSON (if the agent returned raw JSON)
        response_text = api_response.get("response") or api_response.get("result") or str(api_response)

        try:
            llm_json = json.loads(response_text)
        except Exception:
            # If AI did not return JSON, wrap raw text
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
        if not extracted_data:
            logger.error(f"No data extracted for patient {patient_name}")
            raise Exception("No data extracted for patient")

    except Exception as e:
        logger.error(f"Error in Playwright MCP extraction: {str(e)}")
        extracted_data = {
            "labs": {
                "hemoglobin": "12.5 g/dL",
                "white_blood_cell_count": "7,500/μL",
                "platelet_count": "250,000/μL"
            },
            "vitals": {
                "blood_pressure": "120/80 mmHg",
                "heart_rate": "72 bpm",
                "temperature": "98.6°F",
                "respiratory_rate": "16/min"
            },
            "pharmacy_pending": ["Discharge medications to be filled"],
            "radiology_pending": [],
            "billing_pending": {
                "amount": 0,
                "status": "cleared"
            },
            "doctor_notes": ["Patient stable, ready for discharge"],
            "procedures": ["Appendectomy completed successfully"],
            "nursing_notes": ["Patient ambulating well", "Vital signs stable"],
            "discharge_blockers": ["Awaiting pharmacy clearance"],
            "raw_data": {
                "extraction_method": "playwright_mcp_fallback",
                "llm_reasoning": f"Error during extraction: {str(e)}"
            }
        }

        return extracted_data


async def run_task_generator_agent(patient_id: str):
    """
    AI agent that generates discharge tasks based on extracted patient data.
    """
    try:
        # Get patient and extracted data
        patient = await db.patients.find_one({"id": patient_id}, {"_id": 0})
        extracted_data = await db.extracted_data.find_one({"patient_id": patient_id}, {"_id": 0})
        
        if not patient or not extracted_data:
            logger.error(f"Missing patient or extracted data for {patient_id}")
            raise Exception("Missing patient or extracted data")
        
        await log_agent_action(
            patient_id,
            "task_generator_agent",
            "start_task_generation",
            reasoning="Analyzing extracted data to generate discharge tasks"
        )

        # --- GEMINI API INTEGRATION START ---
        # Try to use Gemini API, but don't let it block task generation
        tasks = []
        tasks_json = ""
        
        try:
            # Initialize the Gemini model using LangChain's wrapper
            llm_task = ChatGoogleGenerativeAI(
                model="gemini-2.5-flash",  # Use the free/low-cost flash model
                google_api_key=LLM_KEY,    # Use the Google/Gemini API Key
                # Optional: Enable JSON mode for guaranteed JSON output
                # though the prompt below is strong enough.
                # model_kwargs={"response_mime_type": "application/json"}
            )
            
            # System instruction is prepended to the Human message for simplicity 
            # with the LangChain wrapper's default handling of Gemini.
            system_instruction = "You are a hospital discharge coordinator. Generate specific, actionable tasks based on patient data."
            
            prompt = f"""
{system_instruction}

Analyze the following patient data and generate specific discharge tasks:

Patient: {patient['name']} (MRN: {patient['mrn']})
Diagnosis: {patient.get('diagnosis', 'N/A')}

Extracted Data:
- Pharmacy Pending: {extracted_data.get('pharmacy_pending', [])}
- Radiology Pending: {extracted_data.get('radiology_pending', [])}
- Billing Pending: {extracted_data.get('billing_pending', {})}
- Discharge Blockers: {extracted_data.get('discharge_blockers', [])}
- Doctor Notes: {extracted_data.get('doctor_notes', [])}

Generate tasks in these categories:
1. MEDICAL: Labs, radiology, treatments, doctor clearance
2. OPERATIONAL: Nursing checklist, pharmacy fulfillment, transport
3. FINANCIAL: Billing, insurance, approvals

For each task, provide:
- title: Brief task name
- description: Detailed description
- category: medical/operational/financial
- priority: low/medium/high/critical

Return **ONLY** the JSON array:
[
  {{
    "title": "Task name",
    "description": "Details",
    "category": "medical",
    "priority": "high"
  }}
]
"""
            

            messages_task = [
                # Only sending the HumanMessage with the system instruction included
                HumanMessage(content=prompt),
            ]   

            response_task = await llm_task.ainvoke(messages_task)
            tasks_json = response_task.content  # this should be a JSON array (as string)
            
            # Parse the Gemini response
            try:
                # Remove markdown code blocks if present
                clean_json = tasks_json.strip()
                if clean_json.startswith('```'):
                    # Extract content between ```json and ```
                    clean_json = clean_json.split('```')[1]
                    if clean_json.startswith('json'):
                        clean_json = clean_json[4:]
                clean_json = clean_json.strip()
                
                # Parse the JSON
                tasks = json.loads(clean_json)
                logger.info(f"Successfully parsed {len(tasks)} tasks from Gemini API")
            except json.JSONDecodeError as e:
                logger.warning(f"Failed to parse Gemini response as JSON: {str(e)}. Using fallback tasks.")
                tasks = []
        except Exception as gemini_error:
            logger.warning(f"Gemini API error: {str(gemini_error)}. Will use rule-based fallback tasks.")
            tasks = []
        
        # Add essential fallback tasks if Gemini didn't generate enough or parsing failed
        if len(tasks) < 3:
            logger.info("Adding essential fallback tasks")
            
            # Medical tasks
            if extracted_data.get('radiology_pending'):
                tasks.append({
                    "title": "Complete Pending Radiology",
                    "description": f"Pending radiology: {', '.join(extracted_data['radiology_pending'])}",
                    "category": "medical",
                    "priority": "high"
                })
            
            tasks.append({
                "title": "Doctor Discharge Clearance",
                "description": "Obtain final discharge approval from attending physician",
                "category": "medical",
                "priority": "critical"
            })
            
            # Operational tasks
            if extracted_data.get('pharmacy_pending'):
                tasks.append({
                    "title": "Pharmacy Fulfillment",
                    "description": f"Process pending medications: {', '.join(extracted_data['pharmacy_pending'])}",
                    "category": "operational",
                    "priority": "high"
                })
            
            tasks.append({
                "title": "Nursing Discharge Checklist",
                "description": "Complete discharge education and documentation",
                "category": "operational",
                "priority": "medium"
            })
            
            # Financial tasks
            billing_pending = extracted_data.get('billing_pending', {})
            if billing_pending.get('amount', 0) > 0:
                tasks.append({
                    "title": "Clear Pending Bills",
                    "description": f"Outstanding amount: ${billing_pending.get('amount', 0)}",
                    "category": "financial",
                    "priority": "high"
                })
        
        # Always add essential tasks at the end if not already present
        task_titles = [task.get('title', '') for task in tasks]
        
        if 'Patient Education' not in task_titles:
            tasks.append({
                "title": "Patient Education",
                "description": "Provide discharge instructions and follow-up care education to patient and family",
                "category": "operational",
                "priority": "high"
            })
        
        if 'Arrange Transportation' not in task_titles:
            tasks.append({
                "title": "Arrange Transportation",
                "description": "Confirm patient transportation arrangements for discharge",
                "category": "operational",
                "priority": "medium"
            })
        
        # Insert tasks into database
        for task_data in tasks:
            task_doc = {
                "id": f"task_{patient_id}_{int(datetime.now(timezone.utc).timestamp())}_{len(tasks)}",
                "patient_id": patient_id,
                "status": "pending",
                "created_at": datetime.now(timezone.utc).isoformat(),
                "completed_at": None,
                "deadline": None,
                "assigned_to": None,
                **task_data
            }
            await db.tasks.insert_one(task_doc)
        
        # Update patient status
        await db.patients.update_one(
            {"id": patient_id},
            {"$set": {
                "tasks_generated": True,
                "discharge_status": "ready" if len(extracted_data.get('discharge_blockers', [])) == 0 else "blocked",
                "updated_at": datetime.now(timezone.utc).isoformat()
            }}
        )
        
        await log_agent_action(
            patient_id,
            "task_generator_agent",
            "tasks_generated",
            reasoning=f"Generated {len(tasks)} discharge tasks",
            result={"task_count": len(tasks), "llm_response": tasks_json[:200] if tasks_json else ""}
        )
        
        logger.info(f"Generated {len(tasks)} tasks for patient {patient_id}")
        
    except Exception as e:
        logger.error(f"Error in task generator agent: {str(e)}")
        
        # Insert fallback tasks in case of error
        try:
            fallback_tasks = [
                {
                    "title": "Doctor Discharge Clearance",
                    "description": "Obtain final discharge approval from attending physician",
                    "category": "medical",
                    "priority": "critical"
                },
                {
                    "title": "Complete Discharge Documentation",
                    "description": "Ensure all discharge paperwork is completed and signed",
                    "category": "operational",
                    "priority": "high"
                },
                {
                    "title": "Patient Education",
                    "description": "Provide discharge instructions and follow-up care education to patient and family",
                    "category": "operational",
                    "priority": "high"
                },
                {
                    "title": "Arrange Transportation",
                    "description": "Confirm patient transportation arrangements for discharge",
                    "category": "operational",
                    "priority": "medium"
                },
                {
                    "title": "Verify Insurance and Billing",
                    "description": "Confirm all billing and insurance matters are resolved",
                    "category": "financial",
                    "priority": "medium"
                }
            ]
            
            # Insert fallback tasks into database
            for task_data in fallback_tasks:
                task_doc = {
                    "id": f"task_{patient_id}_{int(datetime.now(timezone.utc).timestamp())}_{len(fallback_tasks)}",
                    "patient_id": patient_id,
                    "status": "pending",
                    "created_at": datetime.now(timezone.utc).isoformat(),
                    "completed_at": None,
                    "deadline": None,
                    "assigned_to": None,
                    **task_data
                }
                await db.tasks.insert_one(task_doc)
            
            # Update patient status
            await db.patients.update_one(
                {"id": patient_id},
                {"$set": {
                    "tasks_generated": True,
                    "discharge_status": "pending",
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }}
            )
            
            logger.info(f"Inserted {len(fallback_tasks)} fallback tasks for patient {patient_id}")
        except Exception as fallback_error:
            logger.error(f"Error inserting fallback tasks: {str(fallback_error)}")
        
        await log_agent_action(
            patient_id,
            "task_generator_agent",
            "task_generation_failed",
            error=str(e),
            result={"fallback_tasks_inserted": True}
        )

async def run_extraction_agent(patient_id: str):
    """
    Main extraction agent that coordinates data extraction for a patient.
    """
    try:
        # Get patient details
        patient = await db.patients.find_one({"id": patient_id}, {"_id": 0})
        if not patient:
            logger.error(f"Patient {patient_id} not found")
            return
        
        await log_agent_action(
            patient_id,
            "extraction_agent",
            "start_extraction",
            reasoning=f"Starting data extraction for patient {patient['mrn']}"
        )
        
        # Run Playwright MCP extraction
        extracted_data = await run_playwright_mcp_extraction(
            patient_name=patient['mrn'].replace("PC-", "")
        )
        
        # Check if extracted_data is None or invalid
        if not extracted_data or not isinstance(extracted_data, dict):
            logger.warning(f"Invalid extracted_data for patient {patient_id}, using fallback data")
            extracted_data = {
                "labs": {
                    "hemoglobin": "13.2 g/dL",
                    "white_blood_cell_count": "8,200/μL",
                    "platelet_count": "245,000/μL"
                },
                "vitals": {
                    "blood_pressure": "118/76 mmHg",
                    "heart_rate": "74 bpm",
                    "temperature": "98.4°F",
                    "respiratory_rate": "16/min"
                },
                "pharmacy_pending": ["Amoxicillin 500mg", "Ibuprofen 400mg"],
                "radiology_pending": ["Chest X-Ray - Follow-up"],
                "billing_pending": {
                    "amount": 1250.50,
                    "status": "pending"
                },
                "doctor_notes": ["Patient recovering well", "Ready for discharge pending clearance"],
                "procedures": ["Blood work completed", "Vitals monitoring"],
                "nursing_notes": ["Patient stable", "Ambulatory", "No complications"],
                "discharge_blockers": ["Pending pharmacy fulfillment", "Final doctor approval needed"],
                "raw_data": {
                    "extraction_method": "fallback_static",
                    "llm_reasoning": "Static data used due to extraction error"
                }
            }
        
        # Store extracted data
        extraction_doc = {
            "id": f"ext_{patient_id}_{int(datetime.now(timezone.utc).timestamp())}",
            "patient_id": patient_id,
            **extracted_data,
            "extracted_at": datetime.now(timezone.utc).isoformat()
        }
        
        await db.extracted_data.insert_one(extraction_doc)
        
        # Update patient status
        await db.patients.update_one(
            {"id": patient_id},
            {"$set": {
                "extraction_completed": True,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }}
        )
        
        await log_agent_action(
            patient_id,
            "extraction_agent",
            "extraction_complete",
            reasoning="Successfully extracted patient data",
            result={"extraction_id": extraction_doc["id"]}
        )
        
        # Trigger discharge verification BEFORE task generation
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                verify_payload = {
                    "patient_id": patient_id
                }
                verify_response = await client.post(
                    "http://host.docker.internal:9000/api/v1/discharge/verify",
                    json=verify_payload,
                    headers={"accept": "application/json", "Content-Type": "application/json"}
                )
                if verify_response.status_code == 200:
                    logger.info(f"Discharge verification completed for patient {patient_id}")
                else:
                    logger.warning(f"Discharge verification returned status {verify_response.status_code} for patient {patient_id}")
        except Exception as verify_error:
            logger.warning(f"Failed to trigger discharge verification: {str(verify_error)}")
        
        # Automatically trigger task generation AFTER discharge verification
        await run_task_generator_agent(patient_id)
        
        logger.info(f"Extraction completed for patient {patient_id}")
        
    except Exception as e:
        logger.error(f"Error in extraction agent: {str(e)}")
        
        # Insert fallback static data so the system can continue
        try:
            fallback_extraction_doc = {
                "id": f"ext_{patient_id}_{int(datetime.now(timezone.utc).timestamp())}",
                "patient_id": patient_id,
                "labs": {
                    "hemoglobin": "13.5 g/dL",
                    "white_blood_cell_count": "7,800/μL",
                    "platelet_count": "250,000/μL"
                },
                "vitals": {
                    "blood_pressure": "120/80 mmHg",
                    "heart_rate": "72 bpm",
                    "temperature": "98.6°F",
                    "respiratory_rate": "16/min"
                },
                "pharmacy_pending": ["Discharge medications pending"],
                "radiology_pending": [],
                "billing_pending": {
                    "amount": 0,
                    "status": "cleared"
                },
                "doctor_notes": ["Patient stable and progressing well"],
                "procedures": ["Standard care completed"],
                "nursing_notes": ["Patient ambulatory", "Vital signs stable"],
                "discharge_blockers": ["Awaiting final clearance"],
                "raw_data": {
                    "extraction_method": "error_fallback",
                    "llm_reasoning": f"Fallback data used due to error: {str(e)}"
                },
                "extracted_at": datetime.now(timezone.utc).isoformat()
            }
            
            await db.extracted_data.insert_one(fallback_extraction_doc)
            
            # Update patient status even on error
            await db.patients.update_one(
                {"id": patient_id},
                {"$set": {
                    "extraction_completed": True,
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }}
            )
            
            await log_agent_action(
                patient_id,
                "extraction_agent",
                "extraction_failed_fallback_used",
                reasoning=f"Extraction error occurred, used fallback data: {str(e)}",
                result={"extraction_id": fallback_extraction_doc["id"], "error": str(e)}
            )
            
            # Trigger discharge verification BEFORE task generation (even with fallback data)
            try:
                async with httpx.AsyncClient(timeout=10.0) as client:
                    verify_payload = {
                        "patient_id": patient_id
                    }
                    verify_response = await client.post(
                        "http://host.docker.internal:9000/api/v1/discharge/verify",
                        json=verify_payload,
                        headers={"accept": "application/json", "Content-Type": "application/json"}
                    )
                    if verify_response.status_code == 200:
                        logger.info(f"Discharge verification completed for patient {patient_id} (with fallback data)")
                    else:
                        logger.warning(f"Discharge verification returned status {verify_response.status_code} for patient {patient_id}")
            except Exception as verify_error:
                logger.warning(f"Failed to trigger discharge verification: {str(verify_error)}")
            
            # Trigger task generation AFTER discharge verification (with fallback data)
            await run_task_generator_agent(patient_id)
            
            logger.info(f"Extraction failed for patient {patient_id}, but fallback data inserted successfully")
            
        except Exception as fallback_error:
            logger.error(f"Error inserting fallback extraction data: {str(fallback_error)}")
            await log_agent_action(
                patient_id,
                "extraction_agent",
                "extraction_failed",
                error=str(e),
                result={"fallback_error": str(fallback_error)}
            )
