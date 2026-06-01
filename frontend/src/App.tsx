import React from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { HomeScreen } from './components/auth/HomeScreen';
import { ChatView } from './components/chat/ChatView';

const MainApp = () => {
  const { token } = useAuth();
  return token ? <ChatView /> : <HomeScreen />;
};

function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}

export default App;
