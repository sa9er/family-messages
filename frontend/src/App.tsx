import React, { useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { HomeScreen } from './components/auth/HomeScreen';
import { ChatView } from './components/chat/ChatView';
import { ProfileScreen } from './components/profile/ProfileScreen';

const MainApp = () => {
  const { token } = useAuth();
  const [tab, setTab] = useState<'chat' | 'profile'>('chat');

  if (!token) return <HomeScreen />;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '80vh', margin: '5vh auto', maxWidth: 600, border: '1px solid #ccc', borderRadius: 12, overflow: 'hidden' }}>
      <div style={{ display: 'flex', gap: 10, padding: 10, background: '#f0f0f0', borderBottom: '1px solid #ccc' }}>
        <button
          onClick={() => setTab('chat')}
          style={{ padding: '8px 16px', background: tab === 'chat' ? '#007bff' : '#fff', color: tab === 'chat' ? 'white' : '#333', border: 'none', borderRadius: 4, cursor: 'pointer' }}
        >
          Chat
        </button>
        <button
          onClick={() => setTab('profile')}
          style={{ padding: '8px 16px', background: tab === 'profile' ? '#007bff' : '#fff', color: tab === 'profile' ? 'white' : '#333', border: 'none', borderRadius: 4, cursor: 'pointer' }}
        >
          Profile
        </button>
      </div>
      <div style={{ flex: 1, overflow: 'auto' }}>
        {tab === 'chat' && <ChatView />}
        {tab === 'profile' && <ProfileScreen />}
      </div>
    </div>
  );
};

function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}

export default App;
