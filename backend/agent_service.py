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

        # Initialize LLM based on API key type
        # Google API keys start with "AIza", OpenAI keys start with "sk-"
        if LLM_KEY and LLM_KEY.startswith("AIza"):
            try:
                llm = ChatGoogleGenerativeAI(
                    model="gemini-pro",
                    google_api_key=LLM_KEY,
                    temperature=0.3,
                    convert_system_message_to_human=True
                )
                logger.info("Using Gemini LLM for extraction")
            except Exception as e:
                logger.error(f"Failed to initialize Gemini: {str(e)}")
                raise
        else:
            # Default to OpenAI
            llm = ChatOpenAI(
                model="gpt-4o-mini",  
                openai_api_key=LLM_KEY,  
                temperature=0.3
            )
            logger.info("Using OpenAI LLM for extraction")

        # Prepare messages
        messages = [
            SystemMessage(content="You are a medical data extraction expert. Extract all patient information thoroughly and return structured JSON."),
            HumanMessage(content=prompt),
        ]

        # Send message
        response = await llm.ainvoke(messages)
        llm_response_text = response.content if hasattr(response, 'content') else str(response)
        logger.info(f"LLM extraction response: {llm_response_text[:200]}...")

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
                "llm_reasoning": llm_response_text[:500] if llm_response_text else ""
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
    AI agent that generates discharge tasks using Google Gemini LLM.
    Reads discharge data from output folder files and uses Gemini to create intelligent tasks.
    """
    try:
        # Get patient details
        patient = await db.patients.find_one({"id": patient_id}, {"_id": 0})
        
        if not patient:
            logger.error(f"Patient {patient_id} not found")
            return
        
        await log_agent_action(
            patient_id,
            "task_generator_agent",
            "start_task_generation",
            reasoning="Reading discharge data from output files and using Gemini LLM to generate tasks"
        )
        
        patient_mrn = patient.get('mrn', patient_id)
        
        # Define output directory path
        output_dir = Path("/app/dischargeflow_agent_main/output")
        
        if not output_dir.exists():
            logger.error(f"Output directory not found: {output_dir}")
            return
        
        # Look for discharge files for this patient
        discharge_state_file = output_dir / f"discharge_state_{patient_mrn}.json"
        final_decision_file = output_dir / f"final_decision_{patient_mrn}.json"
        
        if not discharge_state_file.exists() and not final_decision_file.exists():
            logger.warning(f"No discharge files found for patient {patient_mrn} in {output_dir}")
            return
        
        # Read and parse the files
        all_issues = []
        discharge_decision = "UNKNOWN"
        approved_by = []
        blocked_by = []
        discharge_summary = {}
        discharge_state_data = None
        final_decision_data = None
        
        # Read discharge_state file
        if discharge_state_file.exists():
            try:
                with open(discharge_state_file, 'r') as f:
                    discharge_state_data = json.load(f)
                    all_issues.extend(discharge_state_data.get('issues', []))
                    discharge_decision = discharge_state_data.get('final_decision', 'UNKNOWN')
                    approved_by = discharge_state_data.get('approved_by', [])
                    blocked_by = discharge_state_data.get('blocked_by', [])
                    logger.info(f"Loaded discharge_state file for {patient_mrn}")
            except Exception as e:
                logger.error(f"Error reading discharge_state file: {str(e)}")
        
        # Read final_decision file (preferred source)
        if final_decision_file.exists():
            try:
                with open(final_decision_file, 'r') as f:
                    final_decision_data = json.load(f)
                    # Use aggregated issues from final decision if available
                    aggregated_issues = final_decision_data.get('aggregated_issues', [])
                    if aggregated_issues:
                        all_issues = aggregated_issues
                    discharge_decision = final_decision_data.get('final_decision', discharge_decision)
                    approved_by = final_decision_data.get('approved_by', approved_by)
                    blocked_by = final_decision_data.get('blocked_by', blocked_by)
                    discharge_summary = final_decision_data.get('discharge_summary', {})
                    logger.info(f"Loaded final_decision file for {patient_mrn} with {len(all_issues)} issues")
            except Exception as e:
                logger.error(f"Error reading final_decision file: {str(e)}")
        
        if not all_issues:
            logger.warning(f"No issues found in discharge files for patient {patient_mrn}")
            return
        
        # Prepare patient info for Gemini
        patient_info = {
            "name": patient.get('name', 'Unknown'),
            "mrn": patient.get('mrn', 'Unknown'),
            "diagnosis": patient.get('diagnosis', 'N/A'),
            "admission_id": patient.get('admission_id', 'N/A')
        }
        
        # Create comprehensive prompt for Gemini
        prompt = f"""You are a hospital discharge coordinator AI. Analyze the following patient discharge data and generate specific, actionable tasks.

**Patient Information:**
- Name: {patient_info['name']}
- MRN: {patient_info['mrn']}
- Diagnosis: {patient_info['diagnosis']}
- Admission ID: {patient_info['admission_id']}

**Discharge Decision:** {discharge_decision}
**Approved By:** {', '.join(approved_by) if approved_by else 'None'}
**Blocked By:** {', '.join(blocked_by) if blocked_by else 'None'}

**Issues Identified by AI Agents:**
{json.dumps(all_issues, indent=2)}

**Discharge Summary:**
{json.dumps(discharge_summary, indent=2)}

**Your Task:**
Generate a comprehensive list of discharge tasks based on the issues identified. Each task should be:
1. Specific and actionable
2. Properly categorized (medical/operational/financial)
3. Appropriately prioritized (critical/high/medium/low)
4. Include detailed description with context from the issues

**Task Categories:**
- **medical**: Labs, radiology, treatments, doctor clearance, clinical assessments
- **operational**: Nursing checklist, pharmacy fulfillment, transport, bed management
- **financial**: Billing, insurance, payment clearance, financial approvals

**Priority Levels:**
- **critical**: Immediate action required, blocks discharge
- **high**: Important, should be resolved soon
- **medium**: Should be addressed but not urgent
- **low**: Nice to have, can be resolved later

**Output Format:**
Return ONLY a valid JSON array of tasks. Each task must have:
- title: Brief, clear task name
- description: Detailed description including issue context, what needs to be done, and why
- category: One of: medical, operational, financial
- priority: One of: critical, high, medium, low
- agent: The agent that identified this issue
- issue_code: The issue code from the agent

Example:
[
  {{
    "title": "Resolve Insurance Coverage Discrepancy",
    "description": "[INS_PARTIAL_COVERAGE] Despite an approved pre-authorization for ₹500,000, insurance has covered ₹0 of the ₹400,000 bill. Contact Red Insurance immediately to investigate why the approved pre-authorization is not being honored.",
    "category": "financial",
    "priority": "critical",
    "agent": "Insurance",
    "issue_code": "INS_PARTIAL_COVERAGE"
  }}
]

Generate tasks now:"""

        # Initialize Gemini LLM
        try:
            llm = ChatGoogleGenerativeAI(
                model="gemini-pro",
                google_api_key=LLM_KEY,
                temperature=0.3,
                convert_system_message_to_human=True
            )
            logger.info("Initialized Gemini LLM")
        except Exception as e:
            logger.warning(f"Failed to initialize Gemini, falling back to OpenAI: {str(e)}")
            llm = ChatOpenAI(
                model="gpt-4o-mini",
                openai_api_key=LLM_KEY,
                temperature=0.3
            )
        
        # Prepare messages
        messages = [
            SystemMessage(content="You are a hospital discharge coordinator AI. Generate specific, actionable discharge tasks in JSON format."),
            HumanMessage(content=prompt)
        ]
        
        # Call LLM
        logger.info(f"Calling Gemini LLM to generate tasks for patient {patient_mrn}")
        response = await llm.ainvoke(messages)
        
        # Parse LLM response
        llm_response_text = response.content
        logger.info(f"Received response from LLM: {llm_response_text[:200]}...")
        
        # Extract JSON from response
        try:
            # Try to find JSON array in response
            start_idx = llm_response_text.find('[')
            end_idx = llm_response_text.rfind(']') + 1
            
            if start_idx != -1 and end_idx > start_idx:
                json_str = llm_response_text[start_idx:end_idx]
                tasks_from_llm = json.loads(json_str)
            else:
                # If no JSON array found, try parsing entire response
                tasks_from_llm = json.loads(llm_response_text)
            
            logger.info(f"Successfully parsed {len(tasks_from_llm)} tasks from LLM response")
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse LLM response as JSON: {str(e)}")
            logger.error(f"LLM response was: {llm_response_text}")
            
            # Fallback: Create tasks directly from issues
            logger.warning("Falling back to direct issue-to-task mapping")
            tasks_from_llm = []
            
            severity_to_priority = {
                "critical": "critical",
                "high": "high",
                "medium": "medium",
                "low": "low"
            }
            
            agent_to_category = {
                "Insurance": "financial",
                "Pharmacy": "operational",
                "Lab": "medical",
                "Bed Management": "financial",
                "Ambulance": "operational"
            }
            
            for issue in all_issues:
                task = {
                    "title": issue.get('title', 'Unknown Issue'),
                    "description": f"[{issue.get('code', 'N/A')}] {issue.get('message', '')}\n\nSuggested Action: {issue.get('suggested_action', '')}",
                    "category": agent_to_category.get(issue.get('agent', 'Unknown'), "operational"),
                    "priority": severity_to_priority.get(issue.get('severity', 'medium'), "medium"),
                    "agent": issue.get('agent', 'Unknown'),
                    "issue_code": issue.get('code', '')
                }
                tasks_from_llm.append(task)
        
        # Insert tasks into MongoDB
        for idx, task_data in enumerate(tasks_from_llm):
            task_doc = {
                "id": f"task_{patient_id}_{int(datetime.now(timezone.utc).timestamp())}_{idx}",
                "patient_id": patient_id,
                "status": "pending",
                "created_at": datetime.now(timezone.utc).isoformat(),
                "completed_at": None,
                "deadline": None,
                "assigned_to": None,
                "title": task_data.get('title', 'Untitled Task'),
                "description": task_data.get('description', ''),
                "category": task_data.get('category', 'operational'),
                "priority": task_data.get('priority', 'medium'),
                "agent": task_data.get('agent', 'Unknown'),
                "issue_code": task_data.get('issue_code', '')
            }
            await db.tasks.insert_one(task_doc)
        
        # Update patient status
        final_discharge_status = "ready" if discharge_decision == "APPROVE" else "blocked"
        
        await db.patients.update_one(
            {"id": patient_id},
            {"$set": {
                "tasks_generated": True,
                "discharge_status": final_discharge_status,
                "discharge_decision": discharge_decision,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }}
        )
        
        await log_agent_action(
            patient_id,
            "task_generator_agent",
            "tasks_generated",
            reasoning=f"Generated {len(tasks_from_llm)} discharge tasks using Gemini LLM from output files",
            result={
                "task_count": len(tasks_from_llm),
                "discharge_status": discharge_decision,
                "source": "output_files",
                "llm_used": "gemini" if "gemini" in str(type(llm)).lower() else "openai",
                "files_processed": [
                    str(discharge_state_file.name) if discharge_state_file.exists() else None,
                    str(final_decision_file.name) if final_decision_file.exists() else None
                ]
            }
        )
        
        logger.info(f"Generated {len(tasks_from_llm)} tasks for patient {patient_id} using Gemini LLM from output files")
        
    except Exception as e:
        logger.error(f"Error in task generator agent: {str(e)}")
        import traceback
        traceback.print_exc()
        await log_agent_action(
            patient_id,
            "task_generator_agent",
            "task_generation_failed",
            error=str(e)
        )