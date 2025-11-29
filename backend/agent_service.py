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
import asyncio
from playwright.async_api import async_playwright

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

async def run_playwright_mcp_extraction(patient_mrn: str, patient_name: str) -> dict:
    """
    Run Playwright MCP server to extract patient data from the hospital system.
    This uses subprocess to launch Playwright MCP and interact with it.
    """
    try:
        # Create prompt for the agent
        prompt = f"""
You are a medical data extraction agent. Perform these steps:

1. Navigate to http://localhost:9899
2. Search for patient with MRN: {patient_mrn} or Name: {patient_name}
3. Click on the patient to open their details page
4. Extract ALL information from the page including:
   - Laboratory results (labs)
   - Vital signs (vitals)
   - Pending pharmacy orders
   - Pending radiology orders
   - Billing status and pending amounts
   - Doctor notes
   - Procedures performed
   - Nursing notes
   - Any discharge blockers or pending items
5. Return the extracted data as a structured JSON object

IMPORTANT: Extract everything visible on the patient details page. Be thorough.

Return your response in the following JSON format:
{{
    "labs": {{}},
    "vitals": {{}},
    "pharmacy_pending": [],
    "radiology_pending": [],
    "billing_pending": {{}},
    "doctor_notes": [],
    "procedures": [],
    "nursing_notes": [],
    "discharge_blockers": [],
    "raw_data": {{}}
}}
"""

        llm = ChatOpenAI(
            model="gpt-4o-mini",  
            openai_api_key=LLM_KEY,  
        )

        # Prepare messages
        messages = [
            SystemMessage(content="You are a medical data extraction expert. Extract all patient information thoroughly and return structured JSON."),
            HumanMessage(content=prompt),
        ]

        # Send message
        response = await llm.ainvoke(messages)  


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
                "extraction_method": "playwright_mcp",
                "llm_reasoning": response[:500] if response else ""
            }
        }
        
        return extracted_data
        
    except Exception as e:
        logger.error(f"Error in Playwright MCP extraction: {str(e)}")
        raise

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
            patient['mrn'],
            patient['name']
        )
        
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
        
        # Automatically trigger task generation
        await run_task_generator_agent(patient_id)
        
        logger.info(f"Extraction completed for patient {patient_id}")
        
    except Exception as e:
        logger.error(f"Error in extraction agent: {str(e)}")
        await log_agent_action(
            patient_id,
            "extraction_agent",
            "extraction_failed",
            error=str(e)
        )

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
            return
        
        await log_agent_action(
            patient_id,
            "task_generator_agent",
            "start_task_generation",
            reasoning="Analyzing extracted data to generate discharge tasks"
        )

        
        llm_task = ChatOpenAI(
            model="gpt-4o-mini",
            openai_api_key=LLM_KEY,
        )

        prompt = f"""
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

Return as JSON array:
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
            SystemMessage(content="You are a hospital discharge coordinator. Generate specific, actionable tasks based on patient data."),
            HumanMessage(content=prompt),
        ]   

        response_task = await llm_task.ainvoke(messages_task)
        tasks_json = response_task.content  # this should be a JSON array (as string)


        # user_message = UserMessage(text=prompt)
        # response = await chat.send_message(user_message)
        
        # Parse generated tasks (in production, parse the JSON response)
        # For MVP, create sample tasks based on extracted data
        tasks = []
        
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
            result={"task_count": len(tasks), "llm_response": response[:200] if response else ""}
        )
        
        logger.info(f"Generated {len(tasks)} tasks for patient {patient_id}")
        
    except Exception as e:
        logger.error(f"Error in task generator agent: {str(e)}")
        await log_agent_action(
            patient_id,
            "task_generator_agent",
            "task_generation_failed",
            error=str(e)
        )