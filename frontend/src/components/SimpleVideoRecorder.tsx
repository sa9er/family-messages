import { useRef, useState } from 'react';

interface SimpleVideoRecorderProps {
  onSend: (blob: Blob) => void;
  onStatusChange?: (status: string) => void;
}

export const SimpleVideoRecorder = ({ onSend, onStatusChange }: SimpleVideoRecorderProps) => {
  const [recording, setRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startTimeRef = useRef(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const setStatus = (msg: string) => {
    if (onStatusChange) onStatusChange(msg);
  };

  const cleanup = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    mediaRecorderRef.current = null;
    chunksRef.current = [];
    setRecording(false);
    setDuration(0);
  };

  const startRecording = async () => {
    try {
      setStatus('📷 Camera...');
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      streamRef.current = stream;
      
      const mimeType = MediaRecorder.isTypeSupported('video/webm') ? 'video/webm' : 'video/mp4';
      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];
      startTimeRef.current = Date.now();
      
      intervalRef.current = setInterval(() => {
        if (recording) {
          setDuration(Math.floor((Date.now() - startTimeRef.current) / 1000));
        }
      }, 100);

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const totalDuration = (Date.now() - startTimeRef.current) / 1000;
        const totalSize = chunksRef.current.reduce((sum, chunk) => sum + chunk.size, 0);
        
        if (totalSize < 10000) {
          setStatus(`❌ Too short`);
          cleanup();
          return;
        }
        
        const blob = new Blob(chunksRef.current, { type: 'video/webm' });
        setStatus(`✅ Video ${totalDuration.toFixed(0)}s`);
        onSend(blob);
        cleanup();
      };

      recorder.start(1000);
      setRecording(true);
      setStatus('🔴 Recording video...');
    } catch (err: any) {
      setStatus(`❌ Camera error`);
      cleanup();
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
  };

  return (
    <div>
      <button
        onTouchStart={startRecording}
        onTouchEnd={stopRecording}
        onTouchCancel={stopRecording}
        onMouseDown={startRecording}
        onMouseUp={stopRecording}
        onMouseLeave={stopRecording}
        className={`record-btn ${recording ? 'recording' : ''}`}
        style={{ touchAction: 'none', width: '100%' }}
      >
        {recording ? `📹 ${duration}s` : 'Hold to Record Video'}
      </button>
    </div>
  );
};
