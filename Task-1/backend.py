import os
import uvicorn
from typing import List, Optional, Literal, Annotated
from typing_extensions import TypedDict
from datetime import datetime
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# LangChain & LangGraph Imports
from langchain_groq import ChatGroq
from langchain_core.messages import SystemMessage, HumanMessage, ToolMessage, BaseMessage, AIMessage
from langchain_core.tools import tool
from langgraph.graph import StateGraph, END
from langgraph.graph.message import add_messages
from langgraph.prebuilt import ToolNode

# --- CONFIGURATION ---
api_key = os.environ.get("GROQ_API_KEY")
if not api_key:
    print("WARNING: GROQ_API_KEY not found. Please set it.")

# --- DATA MODELS ---
class ChatRequest(BaseModel):
    message: str
    history: List[dict] = []

# --- MOCK DATABASE ---
mock_db = {
    "interactions": [],
    "hcps": [
        {"id": 1, "name": "Dr. Sarah Smith", "specialty": "Cardiology", "hospital": "City General"},
        {"id": 2, "name": "Dr. John Doe", "specialty": "Oncology", "hospital": "Westside Clinic"}
    ]
}

# --- TOOLS ---
@tool
def search_hcp(name: str):
    """Search for a Healthcare Professional (HCP) by name."""
    results = [hcp for hcp in mock_db["hcps"] if name.lower() in hcp["name"].lower()]
    if not results:
        return f"System: No HCP found matching '{name}'."
    return f"System: Found HCPs: {results}"

@tool
def get_product_talking_points(product_name: str):
    """Retrieves approved talking points."""
    knowledge_base = {
        "CardioFix": "CardioFix reduces systolic BP by 15% within 2 weeks.",
        "OncoCure": "OncoCure is the first-line treatment for Stage 2."
    }
    data = knowledge_base.get(product_name, "Product data not found.")
    return f"System: Retrieved data: {data}"

@tool
def log_interaction(hcp_name: str, topics: str, sentiment: str, outcomes: str):
    """Logs a new interaction. CALL ONLY ONCE."""
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
    return f"System: Interaction {new_id} logged. Stop and inform user."

@tool
def edit_interaction(interaction_id: int, field_name: str, new_value: str):
    """Edits an existing interaction record."""
    record = next((item for item in mock_db["interactions"] if item["id"] == interaction_id), None)
    if not record:
        return f"System: Error - Interaction {interaction_id} not found."
    
    record[field_name] = new_value
    return f"System: Updated interaction {interaction_id}. {field_name} set to {new_value}."

@tool
def schedule_follow_up(hcp_name: str, action: str, date: str):
    """Schedules a follow-up task."""
    return f"System: Calendar Event Created: '{action}' with {hcp_name} on {date}."

# --- AGENT SETUP ---
llm = ChatGroq(model="llama-3.3-70b-versatile", temperature=0)
tools = [search_hcp, get_product_talking_points, log_interaction, edit_interaction, schedule_follow_up]
llm_with_tools = llm.bind_tools(tools)

class AgentState(TypedDict):
    messages: Annotated[list, add_messages]

def agent_node(state: AgentState):
    result = llm_with_tools.invoke(state["messages"])
    return {"messages": [result]}

tool_node = ToolNode(tools)

workflow = StateGraph(AgentState)
workflow.add_node("agent", agent_node)
workflow.add_node("tools", tool_node)
workflow.set_entry_point("agent")

def should_continue(state: AgentState):
    if state["messages"][-1].tool_calls:
        return "tools"
    return END

workflow.add_conditional_edges("agent", should_continue)
workflow.add_edge("tools", "agent")
app_graph = workflow.compile()

# --- APP ---
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/chat")
async def chat_endpoint(req: ChatRequest):
    # 1. Build History
    messages = [SystemMessage(content="You are a CRM Assistant. Use tools to Log or Edit interactions. When a tool is used, reply to the user confirming the action.")]
    
    # Convert frontend history to LangChain messages for context (needed for 'Edit' tool)
    for msg in req.history:
        if msg['sender'] == 'user':
            messages.append(HumanMessage(content=msg['text']))
        elif msg['sender'] == 'ai':
            messages.append(AIMessage(content=msg['text']))
            
    messages.append(HumanMessage(content=req.message))
    
    # 2. Run Agent
    result = app_graph.invoke({"messages": messages}, config={"recursion_limit": 10})
    
    # 3. Extract Tool Data for Frontend Form Auto-fill
    form_data = {}
    latest_msgs = result["messages"]
    
    for msg in reversed(latest_msgs):
        if isinstance(msg, AIMessage) and msg.tool_calls:
            for tc in msg.tool_calls:
                if tc['name'] == 'log_interaction':
                    # Map backend snake_case to frontend camelCase
                    args = tc['args']
                    form_data = {
                        "hcpName": args.get('hcp_name'),
                        "topics": args.get('topics'),
                        "sentiment": args.get('sentiment'),
                        "outcomes": args.get('outcomes')
                    }
                elif tc['name'] == 'edit_interaction':
                    # Handle single field updates
                    args = tc['args']
                    key_map = {'hcp_name': 'hcpName', 'topics_discussed': 'topics'}
                    frontend_key = key_map.get(args.get('field_name'), args.get('field_name'))
                    form_data[frontend_key] = args.get('new_value')
            break 

    return {
        "response": latest_msgs[-1].content,
        "form_data": form_data # Returns structured data to React
    }

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
