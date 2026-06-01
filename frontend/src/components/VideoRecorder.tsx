import { useRef, useState } from 'react';

interface VideoRecorderProps {
  onSend: (blob: Blob) => void;
  onStatus?: (msg: string) => void;
}

export function VideoRecorder({ onSend, onStatus }: VideoRecorderProps) {
  const [recording, setRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startTimeRef = useRef(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const setStatus = (msg: string) => onStatus?.(msg);

  const cleanup = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
    recorderRef.current = null;
    chunksRef.current = [];
    setRecording(false);
    setDuration(0);
  };

  const start = async () => {
    try {
      setStatus('📷 Camera...');
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      streamRef.current = stream;
      
      const mime = MediaRecorder.isTypeSupported('video/webm') ? 'video/webm' : 'video/mp4';
      recorderRef.current = new MediaRecorder(stream, { mimeType: mime });
      chunksRef.current = [];
      startTimeRef.current = Date.now();
      
      timerRef.current = setInterval(() => {
        if (recording) setDuration(Math.floor((Date.now() - startTimeRef.current) / 1000));
      }, 100);
      
      recorderRef.current.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      
      recorderRef.current.onstop = () => {
        const totalDuration = (Date.now() - startTimeRef.current) / 1000;
        const totalSize = chunksRef.current.reduce((s, c) => s + c.size, 0);
        
        if (totalSize < 10000) {
          setStatus('❌ Too short');
          cleanup();
          return;
        }
        
        const blob = new Blob(chunksRef.current, { type: 'video/webm' });
        setStatus(`✅ ${totalDuration.toFixed(0)}s`);
        onSend(blob);
        cleanup();
      };
      
      recorderRef.current.start(1000);
      setRecording(true);
      setStatus('🔴 Recording...');
    } catch (err) {
      setStatus('❌ Camera error');
      cleanup();
    }
  };

  const stop = () => {
    if (recorderRef.current && recorderRef.current.state !== 'inactive') {
      recorderRef.current.stop();
    }
  };

  return (
    <button
      onTouchStart={start}
      onTouchEnd={stop}
      onTouchCancel={stop}
      onMouseDown={start}
      onMouseUp={stop}
      onMouseLeave={stop}
      className={`record-btn ${recording ? 'recording' : ''}`}
      style={{ touchAction: 'none', width: '100%' }}
    >
      {recording ? `📹 ${duration}s` : 'Hold to Record Video'}
    </button>
  );
}
