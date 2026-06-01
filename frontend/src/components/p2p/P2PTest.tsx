import React, { useEffect, useState } from 'react';
import { useDeviceId } from '../../hooks/useDeviceId';

export const P2PTest: React.FC = () => {
  const deviceId = useDeviceId();
  const [status, setStatus] = useState('Connecting...');

  useEffect(() => {
    const ws = new WebSocket(`ws://localhost:3000/signal?deviceId=${deviceId}`);
    ws.onopen = () => setStatus('✅ Signaling connected');
    ws.onerror = () => setStatus('❌ Signaling error');
    ws.onclose = () => setStatus('⚠️ Disconnected');
    return () => ws.close();
  }, [deviceId]);

  return (
    <div style={{ padding: 20 }}>
      <h3>P2P Test</h3>
      <p>Your Device ID: <code>{deviceId}</code></p>
      <p>Status: {status}</p>
    </div>
  );
};
