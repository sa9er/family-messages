import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import './App.css';

const API_URL = '';

function App() {
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState('Loading...');

  useEffect(() => {
    setStatus('App loaded');
    // Test if React is working
    const testDiv = document.createElement('div');
    testDiv.id = 'test';
    document.body.appendChild(testDiv);
    setStatus('React working');
  }, []);

  const handleTest = async () => {
    try {
      setStatus('Testing microphone...');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setStatus('Microphone working!');
      stream.getTracks().forEach(t => t.stop());
    } catch (err: any) {
      setError(err.message);
      setStatus('Microphone error');
    }
  };

  if (error) {
    return (
      <div style={{ padding: '20px', background: '#e94560', color: 'white' }}>
        <h2>Error:</h2>
        <p>{error}</p>
        <button onClick={() => window.location.reload()}>Reload</button>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', textAlign: 'center' }}>
      <h1>Family Messages</h1>
      <p>Status: {status}</p>
      <button onClick={handleTest} style={{ padding: '20px', fontSize: '18px' }}>
        Test Microphone
      </button>
    </div>
  );
}

export default App;
