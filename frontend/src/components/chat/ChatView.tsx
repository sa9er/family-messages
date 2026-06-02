import { useRef, useEffect, useState } from 'react';
import { useMessages } from '../../hooks/useMessages';
import { useAudioRecorder } from '../../hooks/useAudioRecorder';
import { useAuth } from '../../contexts/AuthContext';
import { MessageBubble } from './MessageBubble';

export const ChatView: React.FC = () => {
  const { messages, sendText, sendAudio } = useMessages();
  const { memberId } = useAuth();
  const { isRecording, start, stop, setOnComplete } = useAudioRecorder();
  const [inputText, setInputText] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  setOnComplete(sendAudio);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendText = () => {
    if (!inputText.trim()) return;
    sendText(inputText);
    setInputText('');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ flex: 1, overflow: 'auto', padding: 16 }}>
        {messages.map(msg => (
          <MessageBubble key={msg.id} message={msg} isOwn={msg.senderId === memberId} />
        ))}
        <div ref={bottomRef} />
      </div>
      <div style={{ padding: 12, borderTop: '1px solid #ccc', background: '#fff' }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            value={inputText}
            onChange={e => setInputText(e.target.value)}
            onKeyPress={e => e.key === 'Enter' && handleSendText()}
            placeholder="Type a message..."
            style={{ flex: 1, padding: 10, borderRadius: 20, border: '1px solid #ccc' }}
          />
          <button onClick={handleSendText} style={{ padding: '8px 16px', borderRadius: 20, background: '#007bff', color: 'white', border: 'none' }}>
            Send
          </button>
        </div>
        <div style={{ textAlign: 'center', marginTop: 8 }}>
          <button
            onMouseDown={start}
            onMouseUp={stop}
            onMouseLeave={stop}
            onTouchStart={e => { e.preventDefault(); start(); }}
            onTouchEnd={e => { e.preventDefault(); stop(); }}
            style={{
              background: isRecording ? 'red' : '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: 50,
              width: 70,
              height: 70,
              fontSize: 20,
              touchAction: 'none',
            }}
          >
            🎤
          </button>
          <p style={{ fontSize: 12, marginTop: 4 }}>{isRecording ? 'Recording... release' : 'Hold to record'}</p>
        </div>
      </div>
    </div>
  );
};
