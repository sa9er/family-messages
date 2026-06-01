import { useState, useRef } from 'react';

interface AudioRecorderProps {
  onSend: (blob: Blob) => void;
}

export const AudioRecorder = ({ onSend }: AudioRecorderProps) => {
  const [recording, setRecording] = useState(false);
  const [status, setStatus] = useState('');
  const [duration, setDuration] = useState(0);
  const mediaStream = useRef<MediaStream | null>(null);
  const audioContext = useRef<AudioContext | null>(null);
  const sourceNode = useRef<MediaStreamAudioSourceNode | null>(null);
  const processorNode = useRef<ScriptProcessorNode | null>(null);
  const audioChunks = useRef<Int16Array[]>([]);
  const startTimeRef = useRef(0);
  const intervalRef = useRef<NodeJS.Timeout>();

  const cleanup = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    
    if (processorNode.current) {
      try {
        processorNode.current.disconnect();
      } catch(e) {}
      processorNode.current = null;
    }
    
    if (sourceNode.current) {
      try {
        sourceNode.current.disconnect();
      } catch(e) {}
      sourceNode.current = null;
    }
    
    if (audioContext.current) {
      try {
        audioContext.current.close();
      } catch(e) {}
      audioContext.current = null;
    }
    
    if (mediaStream.current) {
      mediaStream.current.getTracks().forEach(track => track.stop());
      mediaStream.current = null;
    }
    
    audioChunks.current = [];
    setRecording(false);
    setDuration(0);
  };

  const createWavBlob = (samples: Int16Array, sampleRate: number): Blob => {
    const numChannels = 1;
    const bitsPerSample = 16;
    const byteRate = sampleRate * numChannels * bitsPerSample / 8;
    const blockAlign = numChannels * bitsPerSample / 8;
    const dataSize = samples.length * 2;
    const buffer = new ArrayBuffer(44 + dataSize);
    const view = new DataView(buffer);
    
    const writeString = (offset: number, str: string) => {
      for (let i = 0; i < str.length; i++) {
        view.setUint8(offset + i, str.charCodeAt(i));
      }
    };
    
    writeString(0, 'RIFF');
    view.setUint32(4, 36 + dataSize, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, byteRate, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bitsPerSample, true);
    writeString(36, 'data');
    view.setUint32(40, dataSize, true);
    
    for (let i = 0; i < samples.length; i++) {
      view.setInt16(44 + i * 2, samples[i], true);
    }
    
    return new Blob([buffer], { type: 'audio/wav' });
  };

  const startRecording = async () => {
    if (recording) return;
    
    try {
      setStatus('🎤 Requesting microphone...');
      
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStream.current = stream;
      
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      audioContext.current = new AudioCtx();
      sourceNode.current = audioContext.current.createMediaStreamSource(stream);
      processorNode.current = audioContext.current.createScriptProcessor(4096, 1, 1);
      
      audioChunks.current = [];
      
      processorNode.current.onaudioprocess = (event: any) => {
        const inputData = event.inputBuffer.getChannelData(0);
        const int16Data = new Int16Array(inputData.length);
        for (let i = 0; i < inputData.length; i++) {
          int16Data[i] = Math.max(-32768, Math.min(32767, Math.floor(inputData[i] * 32768)));
        }
        audioChunks.current.push(int16Data);
      };
      
      sourceNode.current.connect(processorNode.current);
      processorNode.current.connect(audioContext.current.destination);
      
      startTimeRef.current = Date.now();
      setRecording(true);
      
      intervalRef.current = setInterval(() => {
        if (recording) {
          setDuration(Math.floor((Date.now() - startTimeRef.current) / 1000));
        }
      }, 100);
      
      setStatus('🔴 Recording... (release to send)');
      
    } catch (err: any) {
      console.error('Recording error:', err);
      setStatus(`❌ Error: ${err.message}`);
      cleanup();
    }
  };

  const stopRecording = () => {
    if (!recording) return;
    
    const totalDuration = (Date.now() - startTimeRef.current) / 1000;
    
    // Combine all chunks
    const totalLength = audioChunks.current.reduce((sum, chunk) => sum + chunk.length, 0);
    const combinedBuffer = new Int16Array(totalLength);
    let offset = 0;
    for (const chunk of audioChunks.current) {
      combinedBuffer.set(chunk, offset);
      offset += chunk.length;
    }
    
    const totalSize = combinedBuffer.length * 2;
    
    if (totalSize < 5000) {
      setStatus(`❌ Too short (${(totalSize/1024).toFixed(1)}KB). Record longer!`);
      cleanup();
      return;
    }
    
    // Create WAV blob
    const sampleRate = audioContext.current?.sampleRate || 44100;
    const wavBlob = createWavBlob(combinedBuffer, sampleRate);
    
    setStatus(`✅ ${totalDuration.toFixed(1)}s, ${(totalSize/1024).toFixed(1)}KB - Sending...`);
    onSend(wavBlob);
    cleanup();
  };

  return (
    <div>
      <button
        onTouchStart={(e) => { e.preventDefault(); startRecording(); }}
        onTouchEnd={(e) => { e.preventDefault(); stopRecording(); }}
        onTouchCancel={(e) => { e.preventDefault(); stopRecording(); }}
        onMouseDown={startRecording}
        onMouseUp={stopRecording}
        onMouseLeave={stopRecording}
        className={`record-btn ${recording ? 'recording' : ''}`}
        style={{ touchAction: 'none' }}
      >
        {recording ? `🔴 Recording... ${duration}s` : '🎤 Hold to Record'}
      </button>
      {status && <div style={{color: '#aaa', fontSize: '0.8rem', marginTop: '0.5rem', textAlign: 'center'}}>{status}</div>}
    </div>
  );
};
