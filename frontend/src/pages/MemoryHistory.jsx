import React, { useEffect, useState } from 'react';
import GlassCard from '../components/GlassCard';
import { memoryApi } from '../services/api';
import { History, MessageSquare, Trash2, Calendar, Clock, Loader2, ArrowRight } from 'lucide-react';

const MemoryHistory = ({ setSelectedSessionId, setActivePage }) => {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSessionDetail, setSelectedSessionDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Fetch all sessions from MongoDB memory api
  const fetchSessions = async () => {
    try {
      setLoading(true);
      const res = await memoryApi.listSessions();
      const list = res.data?.data || [];
      setSessions(list);
      
      // Select first session as preview by default if list has items
      if (list.length > 0) {
        loadSessionPreview(list[0].sessionId);
      } else {
        setSelectedSessionDetail(null);
      }
    } catch (error) {
      console.error('Error fetching sessions list:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, []);

  // Fetch individual session messages preview
  const loadSessionPreview = async (sessionId) => {
    try {
      setDetailLoading(true);
      const res = await memoryApi.getHistory(sessionId);
      setSelectedSessionDetail({
        sessionId,
        messages: res.data?.messages || []
      });
    } catch (error) {
      console.error('Error loading session detail:', error);
    } finally {
      setDetailLoading(false);
    }
  };

  // Delete session handler
  const handleDeleteSession = async (sessionId, e) => {
    e.stopPropagation(); // Prevent clicking/loading the preview
    if (!window.confirm(`Are you sure you want to permanently delete session "${sessionId}"?`)) return;

    try {
      await memoryApi.deleteSession(sessionId);
      if (selectedSessionDetail?.sessionId === sessionId) {
        setSelectedSessionDetail(null);
      }
      fetchSessions();
    } catch (error) {
      console.error('Error deleting session:', error);
      alert('Failed to delete session memory.');
    }
  };

  // Select session and redirect user to Chat page
  const handleResumeChat = (sessionId) => {
    setSelectedSessionId(sessionId);
    setActivePage('chat');
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-10rem)] max-w-7xl mx-auto overflow-hidden">
      {/* Sessions list (4 cols) */}
      <div className="lg:col-span-5 flex flex-col h-full overflow-hidden">
        <div className="mb-4">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <History size={18} className="text-medical-400" />
            Chat Memory Sessions
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            MongoDB persistent session storage. Click on a session to preview content.
          </p>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 size={24} className="animate-spin text-medical-400" />
            <p className="text-xs text-slate-400">Loading session logs...</p>
          </div>
        ) : sessions.length === 0 ? (
          <GlassCard className="py-12 flex flex-col items-center justify-center text-slate-500 text-center border border-white/5 flex-1 justify-center">
            <MessageSquare size={48} className="text-slate-700 mb-3" />
            <p className="font-bold text-slate-300 text-sm">No Conversations Found</p>
            <p className="text-xs text-slate-400 mt-1 max-w-[240px]">
              Chat history sessions are created when you engage with the Document Assistant.
            </p>
          </GlassCard>
        ) : (
          <div className="flex-1 overflow-y-auto space-y-3 pr-1">
            {sessions.map((s) => {
              const isSelected = selectedSessionDetail?.sessionId === s.sessionId;
              return (
                <div
                  key={s.sessionId}
                  onClick={() => loadSessionPreview(s.sessionId)}
                  className={`p-4 rounded-xl cursor-pointer border transition-all flex items-center justify-between group ${
                    isSelected
                      ? 'bg-slate-900 border-medical-500/30 shadow-md shadow-medical-500/5'
                      : 'bg-slate-950/20 border-white/5 hover:border-white/10 hover:bg-slate-950/40'
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-xs text-slate-200 truncate pr-4">
                      {s.sessionId}
                    </p>
                    <div className="flex items-center gap-3 text-[10px] text-slate-500 mt-1.5 flex-wrap">
                      <span className="flex items-center gap-1">
                        <Calendar size={10} />
                        {new Date(s.createdAt).toLocaleDateString()}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock size={10} />
                        {new Date(s.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={(e) => handleDeleteSession(s.sessionId, e)}
                      className="p-2 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/5 transition-all opacity-0 group-hover:opacity-100"
                      title="Delete Session Memory"
                    >
                      <Trash2 size={14} />
                    </button>
                    <button
                      onClick={() => handleResumeChat(s.sessionId)}
                      className={`p-2 rounded-lg transition-all ${
                        isSelected ? 'text-medical-400' : 'text-slate-400 hover:text-white'
                      }`}
                      title="Resume Chat"
                    >
                      <ArrowRight size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Session Preview Details (7 cols) */}
      <div className="lg:col-span-7 flex flex-col h-full overflow-hidden">
        {selectedSessionDetail ? (
          <GlassCard className="flex-1 flex flex-col p-6 border border-white/5 h-full overflow-hidden">
            {/* Header Details */}
            <div className="border-b border-white/5 pb-4 flex items-center justify-between">
              <div>
                <h4 className="font-bold text-slate-200 text-sm truncate max-w-[200px] sm:max-w-md">
                  Preview: {selectedSessionDetail.sessionId}
                </h4>
                <p className="text-[10px] text-slate-400 mt-1">
                  Exchanged {selectedSessionDetail.messages.length} messages in this thread
                </p>
              </div>
              <button
                onClick={() => handleResumeChat(selectedSessionDetail.sessionId)}
                className="px-4 py-2 rounded-xl bg-gradient-to-tr from-medical-500 to-medical-500 text-white font-medium text-xs hover:opacity-90 transition-all flex items-center gap-1 shadow-lg shadow-medical-500/10"
              >
                Resume Chat <ArrowRight size={12} />
              </button>
            </div>

            {/* Scrollable messages detail */}
            <div className="flex-1 overflow-y-auto space-y-4 my-4 pr-1">
              {detailLoading ? (
                <div className="flex flex-col items-center justify-center h-full gap-2 py-10">
                  <Loader2 size={20} className="animate-spin text-medical-400" />
                  <p className="text-xs text-slate-500">Loading dialogue messages...</p>
                </div>
              ) : selectedSessionDetail.messages.length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-20">Session is empty.</p>
              ) : (
                selectedSessionDetail.messages.map((m, idx) => (
                  <div key={idx} className="p-3.5 rounded-xl border border-white/5 bg-black/10">
                    <span className={`text-[10px] font-bold uppercase tracking-wider ${
                      m.role === 'user' ? 'text-medical-400' : 'text-medical-400'
                    }`}>
                      {m.role === 'user' ? 'User' : 'Assistant'}
                    </span>
                    <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">{m.content}</p>
                    <span className="text-[9px] text-slate-500 block text-right mt-1">
                      {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ))
              )}
            </div>
          </GlassCard>
        ) : (
          <GlassCard className="flex-1 flex flex-col items-center justify-center text-slate-500 border border-white/5">
            <Clock size={40} className="text-slate-700 mb-2" />
            <p className="font-bold text-slate-400 text-sm">Select a Conversation</p>
            <p className="text-xs text-slate-500 mt-1 max-w-[200px] text-center">
              Click on any session in the list to browse the chat memory detail.
            </p>
          </GlassCard>
        )}
      </div>
    </div>
  );
};

export default MemoryHistory;
