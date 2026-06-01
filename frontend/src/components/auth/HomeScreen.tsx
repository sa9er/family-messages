import React, { useState } from 'react';
import { api } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

export const HomeScreen: React.FC = () => {
  const [status, setStatus] = useState('');
  const { setAuth } = useAuth();

  const testBackend = async () => {
    try {
      await api.post('/api/family/create', { name: 'test' });
      setStatus('✅ Backend OK');
    } catch {
      setStatus('❌ Backend error');
    }
  };

  const createFamily = async () => {
    try {
      const data = await api.post('/api/family/create', { name: 'My Family' });
      if (data.token) {
        setAuth({ familyId: data.familyId, memberId: data.memberId, token: data.token });
      }
    } catch {
      setStatus('Creation failed');
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 20,
    }}>
      <div style={{
        background: 'white',
        borderRadius: 32,
        padding: '40px 30px',
        width: '100%',
        maxWidth: 400,
        textAlign: 'center',
      }}>
        <h1 style={{ color: '#667eea' }}>💬 Family Messages</h1>
        <button onClick={testBackend} style={{ width: '100%', margin: '10px 0', padding: 12, borderRadius: 50, border: 'none', background: '#f0f0f0' }}>
          🔌 Test Backend
        </button>
        <button onClick={createFamily} style={{ width: '100%', padding: 12, borderRadius: 50, border: 'none', background: 'linear-gradient(135deg, #667eea, #764ba2)', color: 'white' }}>
          ✨ Create Family
        </button>
        <p style={{ marginTop: 20, color: '#666' }}>{status}</p>
      </div>
    </div>
  );
};
