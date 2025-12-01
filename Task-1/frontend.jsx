import React, { useState, useEffect, useRef, useReducer, createContext, useContext } from 'react';
import { MessageSquare, Calendar, User, Save, Mic, Send, MoreHorizontal, Search, CheckCircle } from 'lucide-react';

// --- 1. REDUX PATTERN IMPLEMENTATION ---
// This replaces @reduxjs/toolkit for this preview environment.
// It effectively creates a Global Store, Actions, and Reducers.

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
    { sender: 'ai', text: 'Hello! I am your AI Assistant. Tell me about your recent visit (e.g., "I met Dr. Smith...").' }
  ],
  status: 'idle' 
};

// Action Types
const ACTIONS = {
  UPDATE_FIELD: 'UPDATE_FIELD',
  ADD_MESSAGE: 'ADD_MESSAGE',
  SET_FORM_DATA: 'SET_FORM_DATA',
  SET_STATUS: 'SET_STATUS'
};

// Reducer Function
function interactionReducer(state, action) {
  switch (action.type) {
    case ACTIONS.UPDATE_FIELD:
      return { ...state, [action.payload.field]: action.payload.value };
    case ACTIONS.ADD_MESSAGE:
      return { ...state, chatHistory: [...state.chatHistory, action.payload] };
    case ACTIONS.SET_FORM_DATA:
      // When AI parses data, we bulk update the form
      return { ...state, ...action.payload, status: 'ai_filled' };
    case ACTIONS.SET_STATUS:
      return { ...state, status: action.payload };
    default:
      return state;
  }
}

// Store Context
const StoreContext = createContext();

// Provider
const StoreProvider = ({ children }) => {
  const [state, dispatch] = useReducer(interactionReducer, initialState);
  return (
    <StoreContext.Provider value={{ state, dispatch }}>
      {children}
    </StoreContext.Provider>
  );
};

// Custom Hooks to mimic React-Redux
const useSelector = (selector) => selector(useContext(StoreContext).state);
const useDispatch = () => useContext(StoreContext).dispatch;


// --- 2. COMPONENT: CHAT WIDGET ---

const ChatWidget = () => {
  const dispatch = useDispatch();
  const chatHistory = useSelector(state => state.chatHistory);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory, isTyping]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage = input;
    setInput('');
    dispatch({ type: ACTIONS.ADD_MESSAGE, payload: { sender: 'user', text: userMessage } });
    setIsTyping(true);

    // --- MOCKING THE BACKEND AI RESPONSE FOR PREVIEW ---
    // In the real app, this fetch call connects to the Python/FastAPI backend
    /* const res = await fetch('http://localhost:8000/chat', { ... });
    const data = await res.json();
    */
    
    // Simulating AI processing delay and Tool usage
    setTimeout(() => {
      setIsTyping(false);
      
      let aiResponse = "I've logged that interaction.";
      
      // Simple keyword detection to simulate LangGraph Extraction
      if (userMessage.toLowerCase().includes('sarah') || userMessage.toLowerCase().includes('smith')) {
        aiResponse = "I've found Dr. Sarah Smith and extracted the meeting details. Please review the form.";
        dispatch({ 
          type: ACTIONS.SET_FORM_DATA, 
          payload: {
            hcpName: 'Dr. Sarah Smith',
            topics: 'Discussed efficacy of CardioFix vs competitors.',
            sentiment: 'Positive',
            outcomes: 'Requested 5 sample units.',
            followUp: ' deliver samples next Tuesday.'
          }
        });
      } else {
        aiResponse = "I can help you log interactions. Try saying 'I met Dr. Sarah Smith today'.";
      }

      dispatch({ type: ACTIONS.ADD_MESSAGE, payload: { sender: 'ai', text: aiResponse } });
    }, 1500);
  };

  return (
    <div className="flex flex-col h-full bg-white border-l border-gray-200">
      <div className="p-4 border-b border-gray-200 bg-gray-50 flex items-center gap-2">
        <div className="p-2 bg-blue-100 rounded-full">
          <MessageSquare className="w-4 h-4 text-blue-600" />
        </div>
        <div>
          <h3 className="font-semibold text-gray-800 text-sm">AI Assistant</h3>
          <p className="text-xs text-gray-500">Powered by Gemma2-9b</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/50">
        {chatHistory.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] p-3 rounded-2xl text-sm ${
              msg.sender === 'user' 
                ? 'bg-blue-600 text-white rounded-br-none' 
                : 'bg-white border border-gray-200 text-gray-800 rounded-bl-none shadow-sm'
            }`}>
              {msg.text}
            </div>
          </div>
        ))}
        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-white border border-gray-200 p-3 rounded-2xl rounded-bl-none shadow-sm flex gap-1">
              <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></span>
              <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-75"></span>
              <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-150"></span>
            </div>
          </div>
        )}
        <div ref={scrollRef} />
      </div>

      <div className="p-4 border-t border-gray-200 bg-white">
        <div className="relative">
          <input
            type="text"
            className="w-full pl-4 pr-10 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-sm transition-all"
            placeholder="Type or speak..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          />
          <button 
            onClick={handleSend}
            className="absolute right-2 top-2 p-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

// --- 3. COMPONENT: LOG INTERACTION FORM ---

const LogInteractionForm = () => {
  const dispatch = useDispatch();
  const form = useSelector(state => state);

  const handleChange = (field, value) => {
    dispatch({ type: ACTIONS.UPDATE_FIELD, payload: { field, value } });
  };

  return (
    <div className="h-full overflow-y-auto bg-white">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-8 py-5 flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Log Interaction</h1>
          <p className="text-xs text-gray-500 mt-1">Capture details of your HCP visit</p>
        </div>
        <div className="flex gap-3">
          <button className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
          <button className="px-5 py-2 bg-blue-900 text-white rounded-lg text-sm font-medium hover:bg-blue-800 flex items-center gap-2 shadow-sm">
            <Save className="w-4 h-4" /> Save Log
          </button>
        </div>
      </div>

      <div className="p-8 max-w-3xl mx-auto space-y-8 pb-24">
        
        {/* AI Success Banner */}
        {form.status === 'ai_filled' && (
          <div className="p-4 bg-green-50 border border-green-200 rounded-xl flex items-center gap-3 text-green-800 animate-fade-in">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <div className="text-sm">
              <span className="font-semibold"> AI Auto-Fill Complete.</span> Please review the details below.
            </div>
          </div>
        )}

        {/* Section 1 */}
        <section className="space-y-4">
          <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Interaction Details</h2>
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700">HCP Name</label>
              <div className="relative">
                <input 
                  type="text" 
                  className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                  placeholder="Search HCP..."
                  value={form.hcpName}
                  onChange={(e) => handleChange('hcpName', e.target.value)}
                />
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
              </div>
            </div>
            
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700">Interaction Type</label>
              <select 
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none bg-white"
                value={form.interactionType}
                onChange={(e) => handleChange('interactionType', e.target.value)}
              >
                <option>Meeting</option>
                <option>Call</option>
                <option>Email</option>
                <option>Conference</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700">Date</label>
              <input 
                type="date" 
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                value={form.date}
                onChange={(e) => handleChange('date', e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700">Time</label>
              <input 
                type="time" 
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                value={form.time}
                onChange={(e) => handleChange('time', e.target.value)}
              />
            </div>
          </div>
        </section>

        {/* Section 2 */}
        <section className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Discussion</h2>
            <button className="text-xs text-blue-600 font-medium flex items-center gap-1 hover:bg-blue-50 px-2 py-1 rounded transition-colors">
              <Mic className="w-3 h-3" /> Dictate
            </button>
          </div>
          <textarea 
            className="w-full p-4 border border-gray-200 rounded-lg text-sm h-32 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none resize-none transition-all"
            placeholder="What was discussed? (Product feedback, questions asked...)"
            value={form.topics}
            onChange={(e) => handleChange('topics', e.target.value)}
          ></textarea>
        </section>

        {/* Section 3 */}
        <section className="space-y-4">
          <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Analysis</h2>
          
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Sentiment</label>
            <div className="flex gap-4">
              {['Positive', 'Neutral', 'Negative'].map((s) => (
                <label key={s} className={`
                  flex-1 flex items-center justify-center gap-2 p-3 rounded-lg border cursor-pointer transition-all
                  ${form.sentiment === s 
                    ? (s === 'Positive' ? 'bg-green-50 border-green-200 text-green-700 ring-1 ring-green-500' : s === 'Negative' ? 'bg-red-50 border-red-200 text-red-700 ring-1 ring-red-500' : 'bg-gray-100 border-gray-300 text-gray-800 ring-1 ring-gray-400') 
                    : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}
                `}>
                  <input 
                    type="radio" 
                    name="sentiment" 
                    checked={form.sentiment === s}
                    onChange={() => handleChange('sentiment', s)}
                    className="hidden" 
                  />
                  <span className="text-sm font-medium">{s}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-700">Outcomes / Next Steps</label>
            <input 
              type="text" 
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
              placeholder="e.g., Agreed to trial, requested samples..."
              value={form.outcomes}
              onChange={(e) => handleChange('outcomes', e.target.value)}
            />
          </div>
        </section>
      </div>
    </div>
  );
};

// --- 4. MAIN LAYOUT ---

const MainLayout = () => {
  return (
    <div className="flex flex-col md:flex-row h-screen w-full bg-gray-100 font-sans overflow-hidden">
      <div className="w-full md:w-2/3 h-full border-r border-gray-200 relative">
        <LogInteractionForm />
      </div>
      <div className="hidden md:block md:w-1/3 h-full z-20 shadow-[-5px_0_20px_-5px_rgba(0,0,0,0.05)]">
        <ChatWidget />
      </div>
    </div>
  );
};

export default function App() {
  return (
    <StoreProvider>
      <MainLayout />
    </StoreProvider>
  );
}