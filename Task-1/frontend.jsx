import React, { useState, useEffect, useRef, useReducer, createContext, useContext } from 'react';
import { MessageSquare, Calendar, User, Save, Mic, Send, MoreHorizontal, Search } from 'lucide-react';

// --- STATE MANAGEMENT (Redux Pattern Implementation) ---
// Since we cannot install @reduxjs/toolkit in this preview, we use React Context + useReducer
// to replicate the exact Redux architecture (Store, Dispatch, Selectors) required by the task.

const initialState = {
  hcpName: '',
  interactionType: 'Meeting',
  date: new Date().toISOString().split('T')[0],
  time: '10:00',
  topics: '',
  attendees: '',
  materials: [],
  sentiment: 'Neutral',
  outcomes: '',
  followUp: '',
  chatHistory: [
    { sender: 'ai', text: 'Hello! I am your AI Assistant. You can ask me to log an interaction, search for an HCP, or schedule a follow-up.' }
  ]
};

// Action Types
const UPDATE_FIELD = 'interaction/updateField';
const ADD_CHAT_MESSAGE = 'interaction/addChatMessage';
const SET_FULL_FORM = 'interaction/setFullForm';

// Reducer (Pure Function)
function interactionReducer(state, action) {
  switch (action.type) {
    case UPDATE_FIELD:
      return { ...state, [action.payload.field]: action.payload.value };
    case ADD_CHAT_MESSAGE:
      return { ...state, chatHistory: [...state.chatHistory, action.payload] };
    case SET_FULL_FORM:
      return { ...state, ...action.payload };
    default:
      return state;
  }
}

// Action Creators
const updateField = (field, value) => ({ type: UPDATE_FIELD, payload: { field, value } });
const addChatMessage = (message) => ({ type: ADD_CHAT_MESSAGE, payload: message });
const setFullForm = (formData) => ({ type: SET_FULL_FORM, payload: formData });

// Store Context
const InteractionContext = createContext();

// Provider Component (Simulates Redux <Provider>)
const InteractionProvider = ({ children }) => {
  const [state, dispatch] = useReducer(interactionReducer, initialState);
  return (
    <InteractionContext.Provider value={{ state, dispatch }}>
      {children}
    </InteractionContext.Provider>
  );
};

// Hooks (Simulates useSelector and useDispatch)
const useSelector = (selectorFn) => {
  const { state } = useContext(InteractionContext);
  return selectorFn(state);
};

const useDispatch = () => {
  const { dispatch } = useContext(InteractionContext);
  return dispatch;
};

// --- COMPONENTS ---

const ChatWidget = () => {
  const dispatch = useDispatch();
  const chatHistory = useSelector((state) => state.chatHistory);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory]);

  const handleSend = async () => {
    if (!input.trim()) return;

    // 1. User Message
    dispatch(addChatMessage({ sender: 'user', text: input }));
    setLoading(true);
    const userMsg = input;
    setInput('');

    try {
      // 2. Call Backend
      // Note: This fetch will fail if the python backend isn't running locally.
      // We will add a fallback simulation for the preview to show it working.
      let responseData;
      
      try {
        const response = await fetch('http://localhost:8000/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: userMsg })
        });
        responseData = await response.json();
      } catch (err) {
        console.warn("Backend not detected, using mock response for preview.");
        // --- MOCK RESPONSE FOR PREVIEW (If Backend is offline) ---
        await new Promise(r => setTimeout(r, 1000)); // Fake network delay
        if (userMsg.toLowerCase().includes('log')) {
            responseData = { response: "I have drafted the interaction details for you based on our conversation." };
            // Simulate AI filling the form
            dispatch(setFullForm({
                hcpName: 'Dr. Sarah Smith',
                interactionType: 'Meeting',
                topics: 'Discussed cardio efficacy data.',
                sentiment: 'Positive',
                outcomes: 'Agreed to trial.',
            }));
        } else {
            responseData = { response: "I can help you log interactions. Try saying 'Log a meeting with Dr. Smith'." };
        }
      }

      // 3. AI Response
      dispatch(addChatMessage({ sender: 'ai', text: responseData.response }));

    } catch (error) {
      dispatch(addChatMessage({ sender: 'ai', text: "Error connecting to AI service." }));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-50 border-l border-gray-200">
      <div className="p-4 bg-white border-b border-gray-200 flex justify-between items-center">
        <h3 className="font-semibold text-gray-700 flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-blue-600" /> AI Assistant
        </h3>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {chatHistory.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] p-3 rounded-lg text-sm ${msg.sender === 'user' ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200 text-gray-800 shadow-sm'}`}>
              {msg.text}
            </div>
          </div>
        ))}
        {loading && <div className="text-xs text-gray-500 animate-pulse ml-2">AI is thinking...</div>}
        <div ref={scrollRef} />
      </div>

      <div className="p-4 bg-white border-t border-gray-200">
        <div className="relative">
          <input 
            type="text" 
            className="w-full pl-4 pr-12 py-2 border rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 text-sm"
            placeholder="Type a message (e.g., 'Log meeting with Dr. Smith...')"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          />
          <button onClick={handleSend} className="absolute right-2 top-1.5 p-1 bg-blue-600 rounded-full text-white hover:bg-blue-700">
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

const LogInteractionForm = () => {
  const dispatch = useDispatch();
  const form = useSelector((state) => state);

  const handleChange = (field, value) => {
    dispatch(updateField(field, value));
  };

  return (
    <div className="p-8 h-full overflow-y-auto bg-white">
      <h1 className="text-2xl font-bold text-slate-800 mb-6">Log HCP Interaction</h1>
      
      <div className="grid grid-cols-2 gap-6 mb-6">
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">HCP Name</label>
          <div className="relative">
            <input 
              type="text" 
              className="w-full p-2 border border-gray-300 rounded-md text-sm pl-9 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              placeholder="Search or select HCP"
              value={form.hcpName}
              onChange={(e) => handleChange('hcpName', e.target.value)}
            />
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
          </div>
        </div>
        
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Interaction Type</label>
          <select 
            className="w-full p-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            value={form.interactionType}
            onChange={(e) => handleChange('interactionType', e.target.value)}
          >
            <option>Meeting</option>
            <option>Call</option>
            <option>Email</option>
            <option>Conference</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Date</label>
          <input 
            type="date" 
            className="w-full p-2 border border-gray-300 rounded-md text-sm"
            value={form.date}
            onChange={(e) => handleChange('date', e.target.value)}
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Time</label>
          <input 
            type="time" 
            className="w-full p-2 border border-gray-300 rounded-md text-sm"
            value={form.time}
            onChange={(e) => handleChange('time', e.target.value)}
          />
        </div>
      </div>

      <div className="mb-6">
        <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Topics Discussed</label>
        <textarea 
          className="w-full p-3 border border-gray-300 rounded-md text-sm h-24 focus:ring-2 focus:ring-blue-500 outline-none resize-none"
          placeholder="Enter key discussion points..."
          value={form.topics}
          onChange={(e) => handleChange('topics', e.target.value)}
        ></textarea>
        <button className="text-xs text-blue-600 flex items-center gap-1 mt-2 hover:underline">
          <Mic className="w-3 h-3" /> Summarize from Voice Note (Requires Consent)
        </button>
      </div>

      <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
        <label className="block text-xs font-semibold text-gray-500 uppercase mb-3">Observed / Inferred Sentiment</label>
        <div className="flex gap-6">
          {['Positive', 'Neutral', 'Negative'].map((s) => (
            <label key={s} className="flex items-center gap-2 cursor-pointer">
              <input 
                type="radio" 
                name="sentiment" 
                checked={form.sentiment === s}
                onChange={() => handleChange('sentiment', s)}
                className="text-blue-600 focus:ring-blue-500" 
              />
              <span className={`text-sm ${s === 'Positive' ? 'text-green-600' : s === 'Negative' ? 'text-red-600' : 'text-gray-600'}`}>{s}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="mb-6">
        <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Outcomes</label>
        <input 
          type="text" 
          className="w-full p-2 border border-gray-300 rounded-md text-sm"
          placeholder="Key outcomes or agreements..."
          value={form.outcomes}
          onChange={(e) => handleChange('outcomes', e.target.value)}
        />
      </div>

      <div className="mb-8">
        <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Follow-up Actions</label>
        <input 
          type="text" 
          className="w-full p-2 border border-gray-300 rounded-md text-sm"
          placeholder="Enter next steps or tasks..."
          value={form.followUp}
          onChange={(e) => handleChange('followUp', e.target.value)}
        />
      </div>

      <div className="flex justify-end gap-3">
        <button className="px-6 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
        <button className="px-6 py-2 bg-blue-900 text-white rounded-md text-sm font-medium hover:bg-blue-800 flex items-center gap-2">
          <Save className="w-4 h-4" /> Log Interaction
        </button>
      </div>
    </div>
  );
};

const MainLayout = () => {
  return (
    <div className="flex h-screen w-full bg-gray-100 font-sans">
      <div className="w-full md:w-2/3 h-full border-r border-gray-200">
        <LogInteractionForm />
      </div>
      <div className="hidden md:block w-1/3 h-full">
        <ChatWidget />
      </div>
    </div>
  );
};

export default function App() {
  return (
    <InteractionProvider>
      <MainLayout />
    </InteractionProvider>
  );
}