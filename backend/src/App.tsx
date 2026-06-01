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

  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);

  useEffect(() => {
    if (token && familyId) {
      fetchMessages();
    }
  }, [token, familyId]);

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
      if (data.familyId) setStatus('Backend OK!');
    } catch (error) {
      setStatus('Backend error');
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
        setStatus('Family created!');
      }
    } catch (error) {
      setStatus('Create failed');
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
      setStatus('Recording...');
    } catch (error) {
      setStatus('Microphone error');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setStatus('Processing...');
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
        setStatus('Sent!');
        await fetchMessages();
      } else {
        setStatus('Upload failed');
      }
    } catch (error) {
      setStatus('Upload error');
    }
  };

  if (view === 'home') {
    return (
      <div style={{ padding: 20, textAlign: 'center' }}>
        <h1>Family Messages</h1>
        <button onClick={testBackend} style={{ margin: 10, padding: '10px 20px' }}>Test Backend</button>
        <br />
        <button onClick={createFamily} style={{ margin: 10, padding: '10px 20px' }}>Create Family</button>
        <p>{status}</p>
      </div>
    );
  }

  return (
    <div style={{ padding: 20 }}>
      <h2>Family Chat</h2>
      <button onClick={fetchMessages} style={{ marginBottom: 10 }}>Refresh</button>
      <p>{status}</p>
      
      <div style={{ height: 400, overflow: 'auto', border: '1px solid #ccc', marginBottom: 20, padding: 10 }}>
        {messages.length === 0 && <p>No messages yet</p>}
        {messages.map(msg => (
          <div key={msg.id} style={{ textAlign: msg.senderId === memberId ? 'right' : 'left', marginBottom: 10 }}>
            <div style={{ display: 'inline-block', background: msg.senderId === memberId ? '#007bff' : '#e0e0e0', color: msg.senderId === memberId ? 'white' : 'black', padding: 10, borderRadius: 10 }}>
              {msg.type === 'audio' && (
                <audio controls src={`${API_URL}${msg.content}`} style={{ width: 200 }} />
              )}
              <div style={{ fontSize: 11 }}>{new Date(msg.createdAt * 1000).toLocaleTimeString()}</div>
            </div>
          </div>
        ))}
      </div>
      
      <div style={{ textAlign: 'center' }}>
        <button
          onMouseDown={startRecording}
          onMouseUp={stopRecording}
          onMouseLeave={stopRecording}
          onTouchStart={e => { e.preventDefault(); startRecording(); }}
          onTouchEnd={e => { e.preventDefault(); stopRecording(); }}
          style={{
            width: 100,
            height: 100,
            borderRadius: 50,
            background: isRecording ? '#ff4444' : '#dc3545',
            color: 'white',
            border: 'none',
            fontSize: 14,
            touchAction: 'none'
          }}
        >
          {isRecording ? 'Recording...' : 'Hold'}
        </button>
      </div>
    </div>
  );
}

export default App;
