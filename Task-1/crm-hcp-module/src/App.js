import React, { useState, useEffect, useRef, useReducer, createContext, useContext } from 'react';
import { MessageSquare, Save, Mic, Send, Search, CheckCircle } from 'lucide-react';

const initialState = {
  hcpName: '',
  interactionType: 'Meeting',
  date: new Date().toISOString().split('T')[0],
  time: '10:00',
  topics: '',
  sentiment: 'Neutral',
  outcomes: '',
  chatHistory: [
    { sender: 'ai', text: 'Hello! I am your AI Assistant. Tell me about your visit (e.g., "I met Dr. Smith...").' }
  ],
  status: 'idle' 
};

const ACTIONS = {
  UPDATE_FIELD: 'UPDATE_FIELD',
  ADD_MESSAGE: 'ADD_MESSAGE',
  SET_FORM_DATA: 'SET_FORM_DATA',
};

function interactionReducer(state, action) {
  switch (action.type) {
    case ACTIONS.UPDATE_FIELD:
      return { ...state, [action.payload.field]: action.payload.value };
    case ACTIONS.ADD_MESSAGE:
      return { ...state, chatHistory: [...state.chatHistory, action.payload] };
    case ACTIONS.SET_FORM_DATA:
      return { ...state, ...action.payload, status: 'ai_filled' };
    default:
      return state;
  }
}

const StoreContext = createContext();

const StoreProvider = ({ children }) => {
  const [state, dispatch] = useReducer(interactionReducer, initialState);
  return (
    <StoreContext.Provider value={{ state, dispatch }}>
      {children}
    </StoreContext.Provider>
  );
};

const useSelector = (selector) => selector(useContext(StoreContext).state);
const useDispatch = () => useContext(StoreContext).dispatch;

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
    
    // Add user message to UI immediately
    dispatch({ type: ACTIONS.ADD_MESSAGE, payload: { sender: 'user', text: userMessage } });
    setIsTyping(true);

    try {
      const response = await fetch('http://localhost:8000/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            message: userMessage,
            // Send history so Agent knows context for "Edit" commands
            history: chatHistory.map(msg => ({ sender: msg.sender, text: msg.text }))
        }),
      });

      const data = await response.json();
      setIsTyping(false);
      
      dispatch({ type: ACTIONS.ADD_MESSAGE, payload: { sender: 'ai', text: data.response } });

      // **CRITICAL: Auto-fill Form**
      // If backend sends form_data, update Redux state
      if (data.form_data && Object.keys(data.form_data).length > 0) {
        if (Object.keys(data.form_data).length === 1) {
           // It's an edit (single field)
           const [key, value] = Object.entries(data.form_data)[0];
           dispatch({ type: ACTIONS.UPDATE_FIELD, payload: { field: key, value } });
        } else {
           // It's a full log (multiple fields)
           dispatch({ type: ACTIONS.SET_FORM_DATA, payload: data.form_data });
        }
      }
      
    } catch (error) {
      console.error("Error:", error);
      setIsTyping(false);
      dispatch({ type: ACTIONS.ADD_MESSAGE, payload: { sender: 'ai', text: "Connection error." } });
    }
  };

  return (
    <div className="flex flex-col h-full bg-white border-l border-gray-200">
      <div className="p-4 border-b border-gray-200 bg-gray-50 flex items-center gap-2">
        <div className="p-2 bg-blue-100 rounded-full"><MessageSquare className="w-4 h-4 text-blue-600" /></div>
        <div><h3 className="font-semibold text-gray-800 text-sm">AI Assistant</h3><p className="text-xs text-gray-500">Groq Llama-3</p></div>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/50">
        {chatHistory.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] p-3 rounded-2xl text-sm ${msg.sender === 'user' ? 'bg-blue-600 text-white rounded-br-none' : 'bg-white border border-gray-200 text-gray-800 rounded-bl-none shadow-sm'}`}>{msg.text}</div>
          </div>
        ))}
        {isTyping && <div className="p-4 text-xs text-gray-400">AI is thinking...</div>}
        <div ref={scrollRef} />
      </div>
      <div className="p-4 border-t border-gray-200 bg-white relative">
        <input type="text" className="w-full pl-4 pr-10 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-sm" placeholder="Type or speak..." value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSend()} />
        <button onClick={handleSend} className="absolute right-6 top-6 text-blue-600 hover:text-blue-700"><Send className="w-4 h-4" /></button>
      </div>
    </div>
  );
};

const LogInteractionForm = () => {
  const dispatch = useDispatch();
  const form = useSelector(state => state);
  const handleChange = (field, value) => dispatch({ type: ACTIONS.UPDATE_FIELD, payload: { field, value } });

  return (
    <div className="h-full overflow-y-auto bg-white p-8 space-y-8">
      <h1 className="text-xl font-bold text-gray-900">Log Interaction</h1>
      {form.status === 'ai_filled' && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-xl flex items-center gap-3 text-green-800">
          <CheckCircle className="w-5 h-5" /> <span className="font-semibold">AI Auto-filled</span>
        </div>
      )}
      <div className="grid grid-cols-2 gap-6">
        <div><label className="text-sm font-medium">HCP Name</label><input type="text" className="w-full border rounded-lg p-2" value={form.hcpName} onChange={e => handleChange('hcpName', e.target.value)} /></div>
        <div><label className="text-sm font-medium">Interaction Type</label><select className="w-full border rounded-lg p-2" value={form.interactionType} onChange={e => handleChange('interactionType', e.target.value)}><option>Meeting</option><option>Call</option></select></div>
        <div><label className="text-sm font-medium">Date</label><input type="date" className="w-full border rounded-lg p-2" value={form.date} onChange={e => handleChange('date', e.target.value)} /></div>
        <div><label className="text-sm font-medium">Time</label><input type="time" className="w-full border rounded-lg p-2" value={form.time} onChange={e => handleChange('time', e.target.value)} /></div>
      </div>
      <div><label className="text-sm font-medium">Discussion</label><textarea className="w-full border rounded-lg p-2 h-32" value={form.topics} onChange={e => handleChange('topics', e.target.value)}></textarea></div>
      <div><label className="text-sm font-medium">Sentiment</label>
        <div className="flex gap-4 mt-2">
          {['Positive', 'Neutral', 'Negative'].map(s => (
            <button key={s} className={`flex-1 p-2 rounded-lg border ${form.sentiment === s ? 'bg-blue-50 border-blue-500 text-blue-700' : 'bg-white'}`} onClick={() => handleChange('sentiment', s)}>{s}</button>
          ))}
        </div>
      </div>
      <div><label className="text-sm font-medium">Outcomes</label><input type="text" className="w-full border rounded-lg p-2" value={form.outcomes} onChange={e => handleChange('outcomes', e.target.value)} /></div>
    </div>
  );
};

const MainLayout = () => (
  <div className="flex flex-col md:flex-row h-screen w-full bg-gray-100 font-sans overflow-hidden">
    <div className="w-full md:w-2/3 h-full border-r border-gray-200"><LogInteractionForm /></div>
    <div className="hidden md:block md:w-1/3 h-full z-20 shadow-[-5px_0_20px_-5px_rgba(0,0,0,0.05)]"><ChatWidget /></div>
  </div>
);

export default function App() { return <StoreProvider><MainLayout /></StoreProvider>; }
