import os
import uvicorn
from typing import List, Optional, Literal
from datetime import datetime
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

# LangChain & LangGraph Imports
from langchain_groq import ChatGroq
from langchain_core.messages import SystemMessage, HumanMessage, ToolMessage, BaseMessage
from langchain_core.tools import tool
from langgraph.graph import StateGraph, END
from langgraph.prebuilt import ToolNode

# --- CONFIGURATION ---
# usage: export GROQ_API_KEY="your_key_here"
os.environ["GROQ_API_KEY"] = os.environ.get("GROQ_API_KEY", "") 

# --- DATA MODELS ---
class InteractionData(BaseModel):
    hcp_name: Optional[str] = None
    interaction_type: Optional[str] = "Meeting"
    interaction_date: Optional[str] = None
    topics_discussed: Optional[str] = None
    sentiment: Optional[Literal['Positive', 'Neutral', 'Negative']] = "Neutral"
    outcomes: Optional[str] = None
    follow_up_actions: Optional[str] = None

class ChatRequest(BaseModel):
    message: str
    history: List[dict] = [] # List of previous messages

# --- MOCK DATABASE (For demonstration purposes without SQL setup) ---
# In production, replace these dict interactions with SQL queries using sqlalchemy
mock_db = {
    "interactions": [],
    "hcps": [
        {"id": 1, "name": "Dr. Sarah Smith", "specialty": "Cardiology", "hospital": "City General"},
        {"id": 2, "name": "Dr. John Doe", "specialty": "Oncology", "hospital": "Westside Clinic"}
    ]
}

# --- TOOLS (THE 5 REQUIRED TOOLS) ---

@tool
def search_hcp(name: str):
    """
    Search for a Healthcare Professional (HCP) by name to get their details.
    Useful for validating names before logging.
    """
    results = [hcp for hcp in mock_db["hcps"] if name.lower() in hcp["name"].lower()]
    if not results:
        return f"No HCP found matching '{name}'."
    return f"Found HCPs: {results}"

@tool
def get_product_talking_points(product_name: str):
    """
    Retrieves approved talking points and efficacy data for a specific product.
    Useful when the user asks for help on what to discuss or recalls details.
    """
    # Mock RAG response
    knowledge_base = {
        "CardioFix": "CardioFix reduces systolic BP by 15% within 2 weeks. Phase 3 trials showed 98% tolerance.",
        "OncoCure": "OncoCure is the first-line treatment for Stage 2. Primary benefit is reduced nausea."
    }
    return knowledge_base.get(product_name, "Product data not found. Available: CardioFix, OncoCure.")

@tool
def log_interaction(hcp_name: str, topics: str, sentiment: str, outcomes: str):
    """
    REQUIRED TOOL 1: Logs a new interaction into the system.
    Extracts structured data from the conversation and saves it.
    """
    new_id = len(mock_db["interactions"]) + 1
    entry = {
        "id": new_id,
        "hcp_name": hcp_name,
        "topics": topics,
        "sentiment": sentiment,
        "outcomes": outcomes,
        "date": datetime.now().strftime("%Y-%m-%d")
    }
    mock_db["interactions"].append(entry)
    return f"Success: Interaction {new_id} logged for {hcp_name}. Data saved: {entry}"

@tool
def edit_interaction(interaction_id: int, field_name: str, new_value: str):
    """
    REQUIRED TOOL 2: Edits an existing interaction record.
    Useful if the user realizes they made a mistake in previous logs.
    """
    record = next((item for item in mock_db["interactions"] if item["id"] == interaction_id), None)
    if not record:
        return f"Error: Interaction ID {interaction_id} not found."
    
    record[field_name] = new_value
    return f"Success: Updated interaction {interaction_id}. Set {field_name} to '{new_value}'."

@tool
def schedule_follow_up(hcp_name: str, action: str, date: str):
    """
    Schedules a follow-up task or meeting in the calendar.
    """
    return f"Calendar Event Created: '{action}' with {hcp_name} on {date}."

# --- LANGGRAPH AGENT SETUP ---

# 1. Initialize LLM
llm = ChatGroq(model="gemma2-9b-it", temperature=0)

# 2. Bind Tools
tools = [search_hcp, get_product_talking_points, log_interaction, edit_interaction, schedule_follow_up]
llm_with_tools = llm.bind_tools(tools)

# 3. Define State
class AgentState(BaseModel):
    messages: List[BaseMessage]

# 4. Define Nodes
def agent_node(state: dict):
    return {"messages": [llm_with_tools.invoke(state["messages"])]}

tool_node = ToolNode(tools)

# 5. Build Graph
workflow = StateGraph(dict) # Using dict for state simplicity in this example
workflow.add_node("agent", agent_node)
workflow.add_node("tools", tool_node)

workflow.set_entry_point("agent")

def should_continue(state: dict):
    last_message = state["messages"][-1]
    if last_message.tool_calls:
        return "tools"
    return END

workflow.add_conditional_edges("agent", should_continue)
workflow.add_edge("tools", "agent")

app_graph = workflow.compile()

# --- FASTAPI APP ---

app = FastAPI(title="AI-First CRM Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/chat")
async def chat_endpoint(req: ChatRequest):
    """
    Endpoint for the React Frontend to communicate with the LangGraph Agent.
    """
    # Convert history dicts to LangChain Message objects
    lc_messages = [SystemMessage(content="You are an AI Assistant for a Life Sciences CRM. Help Field Reps log interactions, find HCP info, and schedule tasks. Be concise.")]
    
    # In a real app, you'd parse req.history here. For now, we take the new message.
    lc_messages.append(HumanMessage(content=req.message))
    
    inputs = {"messages": lc_messages}
    
    # Run Graph
    result = app_graph.invoke(inputs)
    
    last_message = result["messages"][-1]
    content = last_message.content
    
    # Check if a tool updated the state (in a real app, we'd sync DB to Frontend here)
    # For this demo, if "log_interaction" was called, we infer the frontend should update
    
    return {
        "response": content,
        "tool_used": bool(last_message.tool_calls) if hasattr(last_message, 'tool_calls') else False
    }

@app.get("/interactions")
async def get_interactions():
    return mock_db["interactions"]

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)