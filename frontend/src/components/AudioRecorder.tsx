import { useRef, useState } from 'react';

interface AudioRecorderProps {
  onSend: (blob: Blob) => void;
  onStatus?: (msg: string) => void;
}

export function AudioRecorder({ onSend, onStatus }: AudioRecorderProps) {
  const [recording, setRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  
  const recordingRef = useRef(false);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const chunksRef = useRef<Int16Array[]>([]);
  const startTimeRef = useRef(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const setStatus = (msg: string) => onStatus?.(msg);

  const cleanup = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (processorRef.current) processorRef.current.disconnect();
    if (sourceRef.current) sourceRef.current.disconnect();
    if (audioContextRef.current) audioContextRef.current.close();
    if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
    chunksRef.current = [];
    recordingRef.current = false;
    setRecording(false);
    setDuration(0);
  };

  const createWavBlob = (samples: Int16Array, sampleRate: number): Blob => {
    const buffer = new ArrayBuffer(44 + samples.length * 2);
    const view = new DataView(buffer);
    
    const write = (off: number, str: string) => {
      for (let i = 0; i < str.length; i++) view.setUint8(off + i, str.charCodeAt(i));
    };
    
    write(0, 'RIFF');
    view.setUint32(4, 36 + samples.length * 2, true);
    write(8, 'WAVE');
    write(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    write(36, 'data');
    view.setUint32(40, samples.length * 2, true);
    
    for (let i = 0; i < samples.length; i++) {
      view.setInt16(44 + i * 2, samples[i], true);
    }
    
    return new Blob([buffer], { type: 'audio/wav' });
  };

  const start = async () => {
    if (recordingRef.current) return;
    
    try {
      setStatus('🎤 Mic...');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      audioContextRef.current = new AudioCtx();
      sourceRef.current = audioContextRef.current.createMediaStreamSource(stream);
      processorRef.current = audioContextRef.current.createScriptProcessor(4096, 1, 1);
      
      chunksRef.current = [];
      
      processorRef.current.onaudioprocess = (e: any) => {
        if (!recordingRef.current) return;
        const data = e.inputBuffer.getChannelData(0);
        const int16 = new Int16Array(data.length);
        for (let i = 0; i < data.length; i++) {
          int16[i] = Math.max(-32768, Math.min(32767, Math.floor(data[i] * 32768)));
        }
        chunksRef.current.push(int16);
      };
      
      sourceRef.current.connect(processorRef.current);
      processorRef.current.connect(audioContextRef.current.destination);
      
      recordingRef.current = true;
      setRecording(true);
      startTimeRef.current = Date.now();
      
      timerRef.current = setInterval(() => {
        if (recordingRef.current) {
          setDuration(Math.floor((Date.now() - startTimeRef.current) / 1000));
        }
      }, 100);
      
      setStatus('🔴 Recording...');
    } catch (err) {
      setStatus('❌ Mic error');
    }
  };

  const stop = () => {
    if (!recordingRef.current) return;
    
    recordingRef.current = false;
    if (timerRef.current) clearInterval(timerRef.current);
    
    const totalDuration = (Date.now() - startTimeRef.current) / 1000;
    
    let totalLen = 0;
    for (const chunk of chunksRef.current) totalLen += chunk.length;
    
    if (totalLen === 0) {
      setStatus('❌ No audio');
      cleanup();
      return;
    }
    
    const combined = new Int16Array(totalLen);
    let offset = 0;
    for (const chunk of chunksRef.current) {
      combined.set(chunk, offset);
      offset += chunk.length;
    }
    
    const size = combined.length * 2;
    if (size < 5000) {
      setStatus('❌ Too short');
      cleanup();
      return;
    }
    
    const sampleRate = audioContextRef.current?.sampleRate || 44100;
    const blob = createWavBlob(combined, sampleRate);
    
    setStatus(`✅ ${totalDuration.toFixed(0)}s`);
    onSend(blob);
    cleanup();
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
      {recording ? `🔴 ${duration}s` : '🎤 Hold to Record'}
    </button>
  );
}
