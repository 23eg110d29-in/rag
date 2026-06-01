import React, { useState, useEffect, useRef } from 'react';
import GlassCard from '../components/GlassCard';
import DebugPanel from '../components/DebugPanel';
import { chatApi, memoryApi, documentApi } from '../services/api';
import { MessageSquare, Send, Plus, ArrowRightLeft, ShieldAlert, Sparkles, Terminal, SlidersHorizontal, Gauge, SearchCheck, ListFilter } from 'lucide-react';

const Chat = ({ selectedSessionId, setSelectedSessionId }) => {
  const [sessions, setSessions] = useState([]);
  const [activeSessionId, setActiveSessionId] = useState('');
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [hasDocuments, setHasDocuments] = useState(true);
  const [showDebug, setShowDebug] = useState(true);
  const [retrievalSettings, setRetrievalSettings] = useState({
    mode: 'adaptive',
    ragMode: 'adaptive',
    topK: 5,
    candidatePool: 40,
    minScore: 0.1,
    hybridEnabled: true,
    rerankEnabled: true,
    expansionEnabled: true
  });
  
  // States for the debug panel
  const [debugData, setDebugData] = useState({
    retrievedChunks: [],
    query: ''
  });

  const messagesEndRef = useRef(null);

  // Auto-scroll chat history
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  // Load stats and check if documents are indexed on mount
  const checkDocuments = async () => {
    try {
      const res = await documentApi.list();
      setHasDocuments(res.data?.data && res.data.data.length > 0);
    } catch (error) {
      console.error('Error checking documents count:', error);
    }
  };

  // Fetch list of sessions
  const fetchSessions = async () => {
    try {
      const res = await memoryApi.listSessions();
      const list = res.data?.data || [];
      setSessions(list);
      
      // If a historic session was selected, load it
      if (selectedSessionId) {
        selectSession(selectedSessionId);
        if (setSelectedSessionId) {
          setSelectedSessionId(''); // clear global selection
        }
      } else if (list.length > 0 && !activeSessionId) {
        selectSession(list[0].sessionId);
      } else if (list.length === 0 && !activeSessionId) {
        startNewSession();
      }
    } catch (error) {
      console.error('Error fetching sessions list:', error);
      if (!activeSessionId) {
        startNewSession();
      }
    }
  };

  // Select existing session and fetch its history
  const selectSession = async (sessionId) => {
    setActiveSessionId(sessionId);
    try {
      setLoading(true);
      const res = await memoryApi.getHistory(sessionId);
      const fetchedMessages = res.data?.messages || [];
      setMessages(fetchedMessages);
      
      // Update debug panel with latest retrieved chunks if assistant message is available
      const assistantMsgs = fetchedMessages.filter(m => m.role === 'assistant');
      if (assistantMsgs.length > 0) {
        const lastAssistantMsg = assistantMsgs[assistantMsgs.length - 1];
        const userMsgs = fetchedMessages.filter(m => m.role === 'user');
        const lastUserQuery = userMsgs.length > 0 ? userMsgs[userMsgs.length - 1].content : '';
        
        setDebugData({
          retrievedChunks: lastAssistantMsg.retrievedChunks || [],
          query: lastUserQuery
        });
      } else {
        setDebugData({ retrievedChunks: [], query: '' });
      }
    } catch (error) {
      console.error('Error getting history for session:', error);
    } finally {
      setLoading(false);
    }
  };

  // Initialize a new session ID
  const startNewSession = () => {
    const newId = `session_${Date.now()}`;
    setActiveSessionId(newId);
    setMessages([]);
    setDebugData({ retrievedChunks: [], query: '' });
  };

  useEffect(() => {
    checkDocuments();
    fetchSessions();
  }, []);

  // Send message
  const handleSend = async (e) => {
    e.preventDefault();
    if (!inputText.trim() || loading) return;

    const userMessageText = inputText.trim();
    setInputText('');
    
    // Add user message to state
    setMessages(prev => [...prev, { role: 'user', content: userMessageText }]);
    setLoading(true);

    try {
      const res = await chatApi.sendMessage(activeSessionId, userMessageText, retrievalSettings);
      
      // Add assistant response to state
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: res.data?.answer,
        retrievedChunks: res.data?.retrievedChunks || []
      }]);
      
      // Update debug data
      setDebugData({
        retrievedChunks: res.data?.retrievedChunks || [],
        query: userMessageText,
        settings: res.data?.retrievalConfig || retrievalSettings
      });

      // Refresh session dropdown list in background
      fetchSessions();
    } catch (error) {
      console.error('Error sending message:', error);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Error: Failed to fetch reply from backend. Make sure keys are configured.',
        retrievedChunks: []
      }]);
    } finally {
      setLoading(false);
    }
  };

  // Setup historic message debugging click
  const inspectHistoricMessage = (msgIndex) => {
    const msg = messages[msgIndex];
    if (msg.role !== 'assistant') return;
    
    // Find the user query right before this message
    let queryText = '';
    for (let i = msgIndex - 1; i >= 0; i--) {
      if (messages[i].role === 'user') {
        queryText = messages[i].content;
        break;
      }
    }

    setDebugData({
      retrievedChunks: msg.retrievedChunks || [],
      query: queryText,
      settings: retrievalSettings
    });
  };

  const updateRetrievalSetting = (key, value) => {
    setRetrievalSettings(prev => ({ ...prev, [key]: value }));
  };

  const applyRetrievalMode = (mode) => {
    const presets = {
      standard: { mode, ragMode: mode, candidatePool: 30, topK: 5, minScore: 0.12, rerankEnabled: true, expansionEnabled: true },
      adaptive: { mode, ragMode: mode, candidatePool: 40, topK: 5, minScore: 0.1, rerankEnabled: true, expansionEnabled: true },
      corrective: { mode, ragMode: mode, candidatePool: 60, topK: 6, minScore: 0.08, rerankEnabled: true, expansionEnabled: true }
    };
    setRetrievalSettings(prev => ({ ...prev, ...presets[mode] }));
  };

  return (
    <div className="flex h-[calc(100vh-10rem)] gap-6 max-w-7xl mx-auto overflow-hidden">
      {/* Left Chat Screen */}
      <div className={`flex flex-col h-full flex-1 min-w-0 transition-all duration-300`}>
        {/* Chat Control Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <select
              value={activeSessionId}
              onChange={(e) => selectSession(e.target.value)}
              className="bg-slate-900 border border-white/10 text-slate-200 text-xs rounded-xl px-3 py-2 focus:ring-1 focus:ring-medical-500 focus:outline-none max-w-[200px]"
            >
              {sessions.map((s) => (
                <option key={s.sessionId} value={s.sessionId}>
                  {s.sessionId.substring(0, 18)}... ({new Date(s.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})
                </option>
              ))}
              {!sessions.some(s => s.sessionId === activeSessionId) && activeSessionId && (
                <option value={activeSessionId}>Current Session</option>
              )}
            </select>
            
            <button
              onClick={startNewSession}
              className="p-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 hover:text-medical-400 transition-all text-slate-300"
              title="New Chat Session"
            >
              <Plus size={16} />
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowDebug(!showDebug)}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-semibold transition-all duration-200 ${
                showDebug
                  ? 'bg-medical-500/15 border-medical-500/30 text-medical-400'
                  : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
              }`}
            >
              <ArrowRightLeft size={14} />
              <span>{showDebug ? 'Hide Debug' : 'Show Debug'}</span>
            </button>
          </div>
        </div>

        {/* Warning if no documents are uploaded */}
        {!hasDocuments && (
          <div className="mb-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center gap-2.5 text-xs">
            <ShieldAlert size={16} />
            <p>
              <strong>No documents indexed.</strong> The assistant will always respond fallback answers until you upload files in the <span className="underline">Document Manager</span> tab.
            </p>
          </div>
        )}

        {/* Chat Feed */}
        <GlassCard className="flex-1 flex flex-col p-0 overflow-hidden border border-white/5">
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-500 text-center space-y-4">
                <div className="p-4 rounded-full bg-white/5 text-medical-400">
                  <MessageSquare size={36} className="animate-pulse" />
                </div>
                <div>
                  <p className="font-bold text-slate-300">Start a Grounded Conversation</p>
                  <p className="text-xs text-slate-400 mt-1 max-w-sm">
                    Ask questions. The assistant will retrieve relevant content from indexed files and formulate an answer without hallucinating.
                  </p>
                </div>
              </div>
            ) : (
              messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] sm:max-w-[75%] rounded-2xl p-4 text-sm leading-relaxed relative group ${
                      msg.role === 'user'
                        ? 'bg-gradient-to-tr from-medical-600 to-indigo-600 text-white rounded-br-none shadow-md shadow-medical-500/10'
                        : 'bg-slate-900 border border-white/5 text-slate-200 rounded-bl-none'
                    }`}
                  >
                    {/* Message content */}
                    <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{msg.content}</div>

                    {/* Metadata for assistant response */}
                    {msg.role === 'assistant' && msg.retrievedChunks?.length > 0 && (
                      <div className="mt-3 pt-2.5 border-t border-white/5 flex items-center justify-between gap-4">
                        <span className="text-[9px] text-slate-500 font-medium tracking-wide uppercase flex items-center gap-1.5">
                          <Sparkles size={10} className="text-medical-400" />
                          Grounded in {msg.retrievedChunks.length} chunks
                        </span>
                        
                        <button
                          onClick={() => inspectHistoricMessage(idx)}
                          className="text-[9px] font-semibold text-medical-400 hover:underline flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Terminal size={10} /> Inspect Retrieval
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}

            {/* Loading typing bubble */}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-slate-900 border border-white/5 text-slate-200 rounded-2xl rounded-bl-none p-4 flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-medical-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* Chat input form */}
          <form onSubmit={handleSend} className="p-4 bg-black/20 border-t border-white/5 flex items-center gap-3">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Ask a question about your documents..."
              disabled={loading}
              className="flex-1 bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-slate-200 placeholder-slate-500 text-sm focus:ring-1 focus:ring-medical-500 focus:border-medical-500 focus:outline-none disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={!inputText.trim() || loading}
              className="p-3 rounded-xl bg-gradient-to-tr from-medical-500 to-indigo-500 text-white font-medium hover:opacity-90 disabled:opacity-50 transition-all flex items-center justify-center shadow-lg shadow-medical-500/10"
            >
              <Send size={16} />
            </button>
          </form>
        </GlassCard>
      </div>

      {/* Right Retrieval Debugger Panel */}
      {showDebug && (
        <div className="w-[460px] h-full flex-shrink-0">
          <GlassCard className="h-full flex flex-col p-6 border border-white/5 bg-slate-950/20 overflow-hidden">
            <div className="border-b border-white/5 pb-4 mb-4 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-slate-100 flex items-center gap-2 text-sm">
                  <SlidersHorizontal size={16} className="text-medical-400" />
                  Retrieval Tools
                </h3>
                <span className="text-[10px] font-mono text-medical-300 uppercase">{retrievalSettings.mode}</span>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {['standard', 'adaptive', 'corrective'].map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => applyRetrievalMode(mode)}
                    className={`px-2 py-2 rounded-lg border text-[10px] font-semibold uppercase transition-all ${
                      retrievalSettings.mode === mode
                        ? 'bg-medical-500/15 border-medical-500/40 text-medical-300'
                        : 'bg-white/5 border-white/10 text-slate-400 hover:text-slate-100'
                    }`}
                  >
                    {mode}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-3 gap-2">
                {[
                  ['hybridEnabled', 'Hybrid', SearchCheck],
                  ['rerankEnabled', 'Rerank', Gauge],
                  ['expansionEnabled', 'Expand', ListFilter]
                ].map(([key, label, Icon]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => updateRetrievalSetting(key, !retrievalSettings[key])}
                    className={`flex items-center justify-center gap-1.5 px-2 py-2 rounded-lg border text-[10px] font-semibold transition-all ${
                      retrievalSettings[key]
                        ? 'bg-indigo-500/15 border-indigo-500/35 text-indigo-200'
                        : 'bg-white/5 border-white/10 text-slate-500'
                    }`}
                    title={`${label} retrieval`}
                  >
                    <Icon size={12} />
                    {label}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-3 gap-3">
                <label className="space-y-1">
                  <span className="text-[10px] uppercase font-semibold text-slate-500">Top K</span>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={retrievalSettings.topK}
                    onChange={(e) => updateRetrievalSetting('topK', Number(e.target.value))}
                    className="w-full bg-slate-950 border border-white/10 rounded-lg px-2 py-2 text-xs text-slate-200 focus:outline-none focus:border-medical-500"
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-[10px] uppercase font-semibold text-slate-500">Pool</span>
                  <input
                    type="number"
                    min="5"
                    max="80"
                    value={retrievalSettings.candidatePool}
                    onChange={(e) => updateRetrievalSetting('candidatePool', Number(e.target.value))}
                    className="w-full bg-slate-950 border border-white/10 rounded-lg px-2 py-2 text-xs text-slate-200 focus:outline-none focus:border-medical-500"
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-[10px] uppercase font-semibold text-slate-500">Min</span>
                  <input
                    type="number"
                    min="0"
                    max="1"
                    step="0.01"
                    value={retrievalSettings.minScore}
                    onChange={(e) => updateRetrievalSetting('minScore', Number(e.target.value))}
                    className="w-full bg-slate-950 border border-white/10 rounded-lg px-2 py-2 text-xs text-slate-200 focus:outline-none focus:border-medical-500"
                  />
                </label>
              </div>
            </div>

            <DebugPanel retrievedChunks={debugData.retrievedChunks} query={debugData.query} settings={debugData.settings || retrievalSettings} />
          </GlassCard>
        </div>
      )}
    </div>
  );
};

export default Chat;
