
import { Message } from '../../types';

interface Props {
  message: Message;
  isOwn: boolean;
}

export const MessageBubble: React.FC<Props> = ({ message, isOwn }) => {
  const audioUrl = `http://localhost:3000${message.content}`;
  return (
    <div style={{ textAlign: isOwn ? 'right' : 'left', marginBottom: 12 }}>
      <div style={{
        display: 'inline-block',
        maxWidth: '75%',
        padding: '10px 14px',
        borderRadius: 20,
        background: isOwn ? '#007bff' : '#e4e6eb',
        color: isOwn ? 'white' : 'black',
      }}>
        {message.type === 'text' && <p style={{ margin: 0 }}>{message.content}</p>}
        {message.type === 'audio' && <audio controls src={audioUrl} style={{ width: '200px' }} />}
        <div style={{ fontSize: 10, marginTop: 5, opacity: 0.7 }}>
          {new Date(message.createdAt * 1000).toLocaleTimeString()}
        </div>
      </div>
    </div>
  );
};
