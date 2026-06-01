import { useState } from 'react';

interface Message {
  id: string;
  senderId: string;
  type: 'audio' | 'video' | 'text';
  content: string;
  duration?: number;
  createdAt: number;
}

interface MessageBubbleProps {
  msg: Message;
  isOwn: boolean;
}

export function MessageBubble({ msg, isOwn }: MessageBubbleProps) {
  const [isPlaying, setIsPlaying] = useState(false);

  return (
    <div className={`message ${isOwn ? 'own' : ''}`}>
      {!isOwn && <span className="sender">{msg.senderId.slice(0, 8)}</span>}
      
      {msg.type === 'audio' && (
        <div className="audio-message">
          <button onClick={() => setIsPlaying(!isPlaying)}>
            {isPlaying ? '⏸' : '▶'}
          </button>
          <span>{msg.duration || '?'}s</span>
          {isPlaying && <audio src={msg.content} autoPlay onEnded={() => setIsPlaying(false)} />}
        </div>
      )}
      
      {msg.type === 'video' && (
        <video src={msg.content} controls className="video-message" />
      )}
      
      <span className="time">{new Date(msg.createdAt).toLocaleTimeString()}</span>
    </div>
  );
}
