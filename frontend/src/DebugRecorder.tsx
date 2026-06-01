import { useState, useRef } from 'react';

export const DebugRecorder = ({ onSend }: { onSend: (blob: Blob) => void }) => {
  const [recording, setRecording] = useState(false);
  const [status, setStatus] = useState('');
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const startRecording = async () => {
    try {
      setStatus('Requesting microphone...');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      
      // Test with a simple MediaRecorder
      const recorder = new MediaRecorder(stream);
      mediaRecorder.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
          console.log('Chunk received:', e.data.size, 'bytes');
        }
      };

      recorder.onstop = () => {
        console.log('Recording stopped. Chunks:', chunksRef.current.length);
        
        if (chunksRef.current.length === 0) {
          setStatus('No data recorded!');
          return;
        }
        
        // Create blob and test it
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        console.log('Total blob size:', blob.size, 'bytes');
        
        // Test if blob is playable
        const audioUrl = URL.createObjectURL(blob);
        const audio = new Audio(audioUrl);
        audio.oncanplay = () => {
          console.log('Audio can play, duration:', audio.duration);
          setStatus(`Success! Duration: ${audio.duration}s, Size: ${(blob.size/1024).toFixed(1)}KB`);
          URL.revokeObjectURL(audioUrl);
        };
        audio.onerror = (e) => {
          console.error('Audio error:', e);
          setStatus('Blob is corrupted!');
          URL.revokeObjectURL(audioUrl);
        };
        
        onSend(blob);
        
        // Cleanup
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
          streamRef.current = null;
        }
        mediaRecorder.current = null;
        setRecording(false);
      };

      recorder.start(1000); // Collect data every second
      setRecording(true);
      setStatus('Recording... (click stop)');
    } catch (err) {
      console.error('Error:', err);
      setStatus(`Error: ${err.message}`);
    }
  };

  const stopRecording = () => {
    if (mediaRecorder.current && mediaRecorder.current.state !== 'inactive') {
      mediaRecorder.current.stop();
    }
  };

  return (
    <div style={{ padding: '1rem', background: '#333', borderRadius: '8px' }}>
      <h3>Debug Recorder</h3>
      <div style={{ marginBottom: '1rem' }}>
        <button
          onMouseDown={startRecording}
          onMouseUp={stopRecording}
          onMouseLeave={stopRecording}
          style={{
            padding: '1rem 2rem',
            fontSize: '1.2rem',
            background: recording ? '#e94560' : '#667eea',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer'
          }}
        >
          {recording ? '🔴 Recording... (release to stop)' : '🎤 Hold to Record (Debug)'}
        </button>
      </div>
      <div style={{ color: '#eee', fontSize: '0.9rem' }}>
        Status: {status}
      </div>
    </div>
  );
};
