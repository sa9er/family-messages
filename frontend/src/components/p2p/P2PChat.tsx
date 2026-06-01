import React, { useState, useEffect, useRef } from 'react';
import { useDeviceId } from '../../hooks/useDeviceId';
import { WebRTCService } from '../../services/webrtc';

export const P2PChat: React.FC = () => {
  const deviceId = useDeviceId();
  const [peerId, setPeerId] = useState('');
  const [messages, setMessages] = useState<{ text: string; isOwn: boolean }[]>([]);
  const [input, setInput] = useState('');
  const [logs, setLogs] = useState<string[]>([]);
  const [webrtc, setWebrtc] = useState<WebRTCService | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const logsEndRef = useRef<HTMLDivElement>(null);
  const [connected, setConnected] = useState(false);

  const addLog = (msg: string) => {
    setLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${msg}`]);
    if (msg.includes('Connected') || msg.includes('Data channel open')) setConnected(true);
  };

  useEffect(() => {
    const w = new WebRTCService();
    w.init(deviceId, (data) => {
      setMessages(prev => [...prev, { text: data.text, isOwn: false }]);
    }, addLog);
    setWebrtc(w);
    return () => {};
  }, [deviceId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const handleConnect = async () => {
    if (!peerId.trim() || !webrtc) return;
    addLog(`Initiating connection to ${peerId.substring(0,8)}...`);
    await webrtc.call(peerId);
  };

  const sendMessage = () => {
    if (!input.trim() || !webrtc) return;
    if (webrtc.sendMessage({ text: input })) {
      setMessages(prev => [...prev, { text: input, isOwn: true }]);
      setInput('');
    } else {
      addLog('Message not sent – not connected');
    }
  };

  return (
    <div style={{ padding: 20 }}>
      <h3>P2P Chat</h3>
      <div><strong>Your Device ID:</strong> <code>{deviceId}</code></div>
      <div style={{ marginTop: 10 }}>
        <input
          type="text"
          placeholder="Friend's Device ID"
          value={peerId}
          onChange={(e) => setPeerId(e.target.value)}
          style={{ padding: 8, width: '70%', marginRight: 8 }}
        />
        <button onClick={handleConnect}>Connect</button>
      </div>
      <div style={{ marginTop: 10, background: '#f5f5f5', padding: 8, borderRadius: 4, maxHeight: 150, overflow: 'auto' }}>
        <strong>Logs:</strong>
        {logs.map((log, i) => <div key={i} style={{ fontSize: 12, fontFamily: 'monospace' }}>{log}</div>)}
        <div ref={logsEndRef} />
      </div>
      {connected && (
        <div style={{ marginTop: 20, border: '1px solid #ccc', borderRadius: 8, padding: 10 }}>
          <div style={{ height: 200, overflow: 'auto', marginBottom: 8 }}>
            {messages.map((msg, idx) => (
              <div key={idx} style={{ textAlign: msg.isOwn ? 'right' : 'left', margin: '4px 0' }}>
                <span style={{ background: msg.isOwn ? '#007bff' : '#e4e6eb', color: msg.isOwn ? 'white' : 'black', padding: '4px 8px', borderRadius: 12, display: 'inline-block' }}>
                  {msg.text}
                </span>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
              placeholder="Type a message..."
              style={{ flex: 1, padding: 8, borderRadius: 20, border: '1px solid #ccc' }}
            />
            <button onClick={sendMessage}>Send</button>
          </div>
        </div>
      )}
    </div>
  );
};
