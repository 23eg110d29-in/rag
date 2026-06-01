import React from 'react';
import { Home, UploadCloud, MessageSquare, History, BrainCircuit } from 'lucide-react';

const MainLayout = ({ children, activePage, setActivePage }) => {
  const navItems = [
    { id: 'home', name: 'Dashboard', icon: Home },
    { id: 'upload', name: 'Document Manager', icon: UploadCloud },
    { id: 'chat', name: 'Assistant Chat', icon: MessageSquare },
    { id: 'memory', name: 'Chat History', icon: History }
  ];

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-darkBg text-slate-100">
      {/* Sidebar */}
      <aside className="w-72 glass-panel border-r border-white/5 flex flex-col h-full z-10">
        {/* Brand Header */}
        <div className="p-6 border-b border-white/5 flex items-center gap-3">
          <div className="p-2 rounded-xl bg-gradient-to-tr from-medical-500 to-medical-700 text-white shadow-md shadow-medical-500/10">
            <BrainCircuit size={24} className="animate-pulse" />
          </div>
          <div>
            <h1 className="font-bold text-lg bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
              MedRAG AI
            </h1>
            <p className="text-[10px] text-medical-400 font-medium tracking-widest uppercase">
              Medical Assistant
            </p>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activePage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActivePage(item.id)}
                className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 group ${
                  isActive
                    ? 'bg-gradient-to-r from-medical-500/15 to-medical-500/5 text-medical-400 border border-medical-500/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/5 border border-transparent'
                }`}
              >
                <Icon
                  size={18}
                  className={`transition-transform duration-200 group-hover:scale-110 ${
                    isActive ? 'text-medical-400' : 'text-slate-400 group-hover:text-slate-200'
                  }`}
                />
                <span>{item.name}</span>
                {isActive && (
                  <span className="ml-auto w-1.5 h-1.5 rounded-full bg-medical-400 shadow-md shadow-medical-400/50" />
                )}
              </button>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-6 border-t border-white/5 text-center">
          <p className="text-xs text-slate-500">MedRAG AI v2.0</p>
          <p className="text-[10px] text-slate-600 mt-1">Designed & Developed by</p>
          <p className="text-[11px] font-semibold bg-gradient-to-r from-medical-400 to-indigo-400 bg-clip-text text-transparent mt-0.5">Kammarisahasra</p>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-full overflow-hidden relative">
        {/* Glow Effects in main layout */}
        <div className="absolute top-0 right-1/4 w-[400px] h-[400px] rounded-full bg-indigo-500/5 blur-[120px] pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 w-[300px] h-[300px] rounded-full bg-cyan-500/5 blur-[100px] pointer-events-none" />
        
        {/* Top border header spacing */}
        <header className="h-16 border-b border-white/5 flex items-center justify-between px-8 bg-darkBg/30 backdrop-blur-md z-10">
          <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">
            {navItems.find(n => n.id === activePage)?.name || 'Dashboard'}
          </h2>
          <div className="flex items-center gap-3">
            <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-md shadow-emerald-500/50 animate-ping" />
            <span className="text-xs text-slate-400 font-medium">System Online</span>
          </div>
        </header>

        {/* Scrollable Page Container */}
        <div className="flex-1 overflow-y-auto p-8 relative z-0">
          {children}
        </div>
      </main>
    </div>
  );
};

export default MainLayout;
