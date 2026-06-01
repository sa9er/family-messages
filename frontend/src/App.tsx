import { useState, useRef, useEffect } from 'react';

const API_URL = 'http://localhost:3000';

function App() {
  const [familyId, setFamilyId] = useState(null);
  const [memberId, setMemberId] = useState(null);
  const [token, setToken] = useState(null);
  const [messages, setMessages] = useState([]);
  const [view, setView] = useState('home');
  const [status, setStatus] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [textMessage, setTextMessage] = useState('');

  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (token && familyId) {
      fetchMessages();
      const interval = setInterval(fetchMessages, 3000);
      return () => clearInterval(interval);
    }
  }, [token, familyId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchMessages = async () => {
    if (!token) return;
    try {
      const response = await fetch(`${API_URL}/api/messages/family/${familyId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setMessages(data.messages || []);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const testBackend = async () => {
    try {
      const response = await fetch(`${API_URL}/api/family/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'test' })
      });
      const data = await response.json();
      if (data.familyId) setStatus('✓ Backend connected');
    } catch (error) {
      setStatus('❌ Backend error');
    }
  };

  const createFamily = async () => {
    try {
      const response = await fetch(`${API_URL}/api/family/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'My Family' })
      });
      const data = await response.json();
      
      if (data.token) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('familyId', data.familyId);
        localStorage.setItem('memberId', data.memberId);
        
        setToken(data.token);
        setFamilyId(data.familyId);
        setMemberId(data.memberId);
        setView('chat');
      }
    } catch (error) {
      setStatus('Create failed');
    }
  };

  const sendTextMessage = async () => {
    if (!textMessage.trim()) return;
    
    try {
      const response = await fetch(`${API_URL}/api/messages/text`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          familyId: familyId,
          senderId: memberId,
          type: 'text',
          content: textMessage
        })
      });
      
      if (response.ok) {
        setTextMessage('');
        await fetchMessages();
        setStatus('✓ Sent');
        setTimeout(() => setStatus(''), 1000);
      }
    } catch (error) {
      setStatus('❌ Failed to send');
    }
  };

  const startRecording = async () => {
    chunksRef.current = [];
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };
      
      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
        await uploadAudio(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };
      
      mediaRecorder.start(100);
      setIsRecording(true);
      setStatus('🔴 Recording...');
    } catch (error) {
      setStatus('Microphone access denied');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setStatus('📤 Sending...');
    }
  };

  const uploadAudio = async (audioBlob) => {
    const formData = new FormData();
    formData.append('media', audioBlob, 'recording.webm');
    formData.append('familyId', familyId);
    formData.append('senderId', memberId);
    formData.append('type', 'audio');

    try {
      const response = await fetch(`${API_URL}/api/messages/upload`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });
      
      if (response.ok) {
        setStatus('✓ Sent!');
        await fetchMessages();
        setTimeout(() => setStatus(''), 2000);
      } else {
        setStatus('❌ Upload failed');
      }
    } catch (error) {
      setStatus('❌ Error sending');
    }
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp * 1000);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (view === 'home') {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px'
      }}>
        <div style={{
          background: 'rgba(255,255,255,0.95)',
          borderRadius: '32px',
          padding: '40px 30px',
          maxWidth: '400px',
          width: '100%',
          textAlign: 'center',
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
        }}>
          <h1 style={{ fontSize: '2.5em', marginBottom: '10px', color: '#667eea' }}>💬 Family Messages</h1>
          <p style={{ color: '#888', marginBottom: '30px' }}>Share your voice with loved ones</p>
          
          <button onClick={testBackend} style={{
            width: '100%',
            padding: '15px',
            marginBottom: '15px',
            border: 'none',
            borderRadius: '50px',
            background: '#f0f0f0',
            color: '#667eea',
            fontSize: '16px',
            fontWeight: '600',
            cursor: 'pointer'
          }}>
            🔌 Test Connection
          </button>
          
          <button onClick={createFamily} style={{
            width: '100%',
            padding: '15px',
            border: 'none',
            borderRadius: '50px',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            fontSize: '16px',
            fontWeight: '600',
            cursor: 'pointer',
            boxShadow: '0 4px 15px rgba(102,126,234,0.4)'
          }}>
            ✨ Create Family
          </button>
          
          {status && <p style={{ marginTop: '20px', color: '#667eea' }}>{status}</p>}
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#f5f7fa',
      display: 'flex',
      flexDirection: 'column'
    }}>
      <div style={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        padding: '20px',
        color: 'white',
        boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
      }}>
        <h2 style={{ margin: 0, fontSize: '1.5em' }}>💬 Family Chat</h2>
        <p style={{ margin: '5px 0 0', opacity: 0.9, fontSize: '12px' }}>Connected to family space</p>
      </div>
      
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '20px',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {messages.length === 0 && (
          <div style={{
            textAlign: 'center',
            color: '#aaa',
            padding: '50px 20px'
          }}>
            <p style={{ fontSize: '48px', margin: 0 }}>🎤</p>
            <p>No messages yet. Send a text or voice message!</p>
          </div>
        )}
        
        {messages.map((msg) => {
          const isOwn = msg.senderId === memberId;
          
          return (
            <div key={msg.id} style={{
              display: 'flex',
              justifyContent: isOwn ? 'flex-end' : 'flex-start',
              marginBottom: '15px'
            }}>
              <div style={{
                maxWidth: '75%',
                background: isOwn ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : 'white',
                borderRadius: '20px',
                padding: '12px 18px',
                boxShadow: '0 2px 5px rgba(0,0,0,0.1)',
                color: isOwn ? 'white' : '#333'
              }}>
                {msg.type === 'audio' && (
                  <audio controls src={`${API_URL}${msg.content}`} style={{
                    width: '220px',
                    height: '36px',
                    borderRadius: '20px'
                  }} />
                )}
                {msg.type === 'text' && (
                  <p style={{ margin: 0, fontSize: '14px', wordBreak: 'break-word' }}>{msg.content}</p>
                )}
                <div style={{
                  fontSize: '10px',
                  marginTop: '5px',
                  opacity: 0.7,
                  textAlign: isOwn ? 'right' : 'left'
                }}>
                  {formatTime(msg.createdAt)}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>
      
      <div style={{
        background: 'white',
        padding: '15px 20px',
        borderTop: '1px solid #e0e0e0',
        boxShadow: '0 -2px 10px rgba(0,0,0,0.05)'
      }}>
        {/* Text input */}
        <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
          <input
            type="text"
            value={textMessage}
            onChange={(e) => setTextMessage(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && sendTextMessage()}
            placeholder="Type a message..."
            style={{
              flex: 1,
              padding: '12px 15px',
              border: '1px solid #e0e0e0',
              borderRadius: '25px',
              fontSize: '14px',
              outline: 'none',
              fontFamily: 'inherit'
            }}
          />
          <button
            onClick={sendTextMessage}
            style={{
              padding: '12px 20px',
              border: 'none',
              borderRadius: '25px',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            Send
          </button>
        </div>
        
        {/* Voice button */}
        <div style={{ textAlign: 'center' }}>
          <button
            onMouseDown={startRecording}
            onMouseUp={stopRecording}
            onMouseLeave={stopRecording}
            onTouchStart={(e) => { e.preventDefault(); startRecording(); }}
            onTouchEnd={(e) => { e.preventDefault(); stopRecording(); }}
            style={{
              width: '60px',
              height: '60px',
              borderRadius: '30px',
              background: isRecording ? '#ff4444' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              border: 'none',
              fontSize: '20px',
              cursor: 'pointer',
              boxShadow: isRecording ? '0 0 20px rgba(255,68,68,0.5)' : '0 4px 15px rgba(102,126,234,0.4)',
              transition: 'all 0.2s ease',
              transform: isRecording ? 'scale(0.95)' : 'scale(1)',
              touchAction: 'none'
            }}
          >
            {isRecording ? '🔴' : '🎤'}
          </button>
          <p style={{
            marginTop: '8px',
            fontSize: '11px',
            color: isRecording ? '#ff4444' : '#888'
          }}>
            {isRecording ? 'Recording... release' : 'Hold for voice'}
          </p>
          {status && (
            <p style={{
              marginTop: '5px',
              fontSize: '11px',
              color: status.includes('✓') ? '#4caf50' : '#888'
            }}>
              {status}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
