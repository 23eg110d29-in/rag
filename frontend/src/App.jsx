import React, { useState } from 'react';
import MainLayout from './layouts/MainLayout';
import Home from './pages/Home';
import Upload from './pages/Upload';
import Chat from './pages/Chat';
import MemoryHistory from './pages/MemoryHistory';

function App() {
  const [activePage, setActivePage] = useState('home');
  const [selectedSessionId, setSelectedSessionId] = useState('');

  return (
    <MainLayout activePage={activePage} setActivePage={setActivePage}>
      {activePage === 'home' && (
        <Home setActivePage={setActivePage} />
      )}
      
      {activePage === 'upload' && (
        <Upload />
      )}
      
      {activePage === 'chat' && (
        <Chat
          key={selectedSessionId || 'default_chat'}
          selectedSessionId={selectedSessionId}
          setSelectedSessionId={setSelectedSessionId}
        />
      )}
      
      {activePage === 'memory' && (
        <MemoryHistory
          setSelectedSessionId={setSelectedSessionId}
          setActivePage={setActivePage}
        />
      )}
    </MainLayout>
  );
}

export default App;
