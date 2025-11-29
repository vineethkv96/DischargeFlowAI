import os
# Force anyio to use asyncio
os.environ["ANYIO_BACKEND"] = "asyncio"

import asyncio
from google.generativeai import GenerativeModel, configure, protos
from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client
import nest_asyncio
from copy import deepcopy
import time
from google.api_core import exceptions
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import uvicorn
import traceback
import sniffio

# nest_asyncio.apply() # Removed this as it causes issues with anyio

# --- 1. CONFIGURATION ---

# IMPORTANT: Replace with your actual Gemini API key.
# For security, you should set this as an environment variable (GEMINI_API_KEY)
# and retrieve it using os.getenv("GEMINI_API_KEY")
GOOGLE_API_KEY = "AIzaSyAXy-RbiG_v6rzSktQjxtaJC_Spxq1nLNM" # <--- REPLACE THIS LINE!
configure(api_key=GOOGLE_API_KEY)

# Define the command to run the Playwright MCP Server in HEADLESS (default) mode.
# If you want to see the browser, you must set an environment variable like
# "PLAYWRIGHT_HEADLESS": "0" in the 'env' dictionary below.
server_params = StdioServerParameters(
    command="npx",
    args=["-y", "@playwright/mcp@latest"],
    env={
        **os.environ.copy(),
        "PLAYWRIGHT_HEADLESS": "0" # Setting this to "0" (or "false") often forces headed mode
    }
)

app = FastAPI()

class AgentRequest(BaseModel):
    promty: str
    expected_output: str

def clean_schema_recursively(data):
    """Removes fields forbidden by the Gemini Function Declaration schema."""
    if isinstance(data, dict):
        # Create a deep copy to safely modify the dictionary during iteration
        cleaned_data = deepcopy(data) 
        
        # Keys forbidden by the Gemini API's strict JSON Schema implementation
        # We add 'default' to the list of fields to remove recursively.
        forbidden_keys = ["additionalProperties", "$schema", "title", "default"] # <-- FIX IS HERE

        for key in forbidden_keys:
            if key in cleaned_data:
                del cleaned_data[key]
        
        # Recursively clean nested dictionaries (like 'properties', 'items', etc.)
        for key, value in cleaned_data.items():
            cleaned_data[key] = clean_schema_recursively(value)
        
        return cleaned_data
    
    elif isinstance(data, list):
        # Recursively clean items within lists
        return [clean_schema_recursively(item) for item in data]
    
    else:
        # Return base types as is
        return data

async def run_agent(prompt: str) -> str:
    print("🤖 Agent Starting...")
    # Manually set sniffio context to asyncio since uvicorn doesn't do it
    sniffio.current_async_library_cvar.set("asyncio")
    
    try:
        # Connect to the Playwright MCP Server
        async with stdio_client(server_params) as (read, write):
            async with ClientSession(read, write) as session:
                
                # 1. Initialize and get tools
                await session.initialize()
                tools_list = await session.list_tools()
                print(f"🛠️ Found {len(tools_list.tools)} Playwright tools.")

                # 2. Translate MCP tools for Gemini using the recursive cleaner
                gemini_tools = []
                for tool in tools_list.tools:
                    
                    # Get the JSON Schema (which is a dictionary)
                    schema = tool.inputSchema
                    
                    # --- APPLY THE GUARANTEED CLEANER ---
                    cleaned_schema = clean_schema_recursively(schema)
                    # --- CLEANER APPLIED ---

                    gemini_tools.append({
                        "name": tool.name,
                        "description": tool.description,
                        "parameters": cleaned_schema # Pass the guaranteed-clean schema
                    })

                # 3. Configure the Gemini Model with the cleaned tools
                model = GenerativeModel(
                    # Use the correct, officially supported model identifier.
                    model_name='gemini-2.0-flash-001', # <--- CHANGE MODEL NAME HERE
                    tools=[gemini_tools]
                )
                chat = model.start_chat()
                
                print(f"💬 Sending prompt: '{prompt}'")

                # 4. Start the Agent Loop
                response = chat.send_message(prompt)
                
                # Loop to handle tool calls
                try:
                    part = response.candidates[0].content.parts[0]
                except IndexError:
                    return response.text

                while part.function_call:
                    fc = part.function_call
                    tool_name = fc.name # This will be the prefixed name (e.g., 'browser_navigate')
                    tool_args = dict(fc.args)
                    
                    print(f"\n🛠️ Gemini is calling: {tool_name}({tool_args})")
                    
                    # 5. Execute the tool via MCP
                    try:
                        # Note: We use the tool_name directly, which Gemini generated (e.g., 'browser_navigate')
                        result = await session.call_tool(tool_name, arguments=tool_args)
                        tool_output = result.content[0].text 
                        print(f"   -> Playwright executed. Result preview: {tool_output[:100]}...")
                    except Exception as e:
                        tool_output = f"Error executing tool: {str(e)}"
                        print(f"   -> ERROR: {tool_output}")
                    
                    # 6. Send the tool result back to Gemini using the protos objects.
                    
                    # We use protos.Content, protos.Part, and protos.FunctionResponse
                    tool_response_payload = protos.Content(
                        role="function",
                        parts=[
                            protos.Part( # <--- Use protos.Part
                                function_response=protos.FunctionResponse( # <--- Use protos.FunctionResponse
                                    name=tool_name,
                                    response={"result": tool_output}
                                )
                            )
                        ]
                    )
                    
                    response = chat.send_message(tool_response_payload)
                    
                    # Get the next response part to check for completion or next tool call
                    try:
                        part = response.candidates[0].content.parts[0]
                    except IndexError:
                        break

                # 7. Final natural language response from Gemini
                print("\n✅ TASK COMPLETE. Final Report:")
                print("----------------------------------")
                print(response.text)
                print("----------------------------------")
                return response.text
    except Exception as e:
        print(f"CRITICAL ERROR in run_agent: {e}")
        traceback.print_exc()
        raise e

@app.post("/process")
async def process_request(request: AgentRequest):
    try:
        result = await run_agent(request.prompt)
        return AgentRequest(prompt=request.prompt, expected_output=result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=18000, loop="asyncio")