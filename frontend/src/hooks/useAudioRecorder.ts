import { useState, useRef } from 'react';

export const useAudioRecorder = () => {
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const onCompleteRef = useRef<(blob: Blob) => Promise<void>>();

  const start = async () => {
    chunksRef.current = [];
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const recorder = new MediaRecorder(stream);
    mediaRecorderRef.current = recorder;
    recorder.ondataavailable = (e) => { if (e.data.size) chunksRef.current.push(e.data); };
    recorder.onstop = async () => {
      const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
      stream.getTracks().forEach(t => t.stop());
      if (onCompleteRef.current) await onCompleteRef.current(blob);
    };
    recorder.start(100);
    setIsRecording(true);
  };

  const stop = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const setOnComplete = (fn: (blob: Blob) => Promise<void>) => { onCompleteRef.current = fn; };

  return { isRecording, start, stop, setOnComplete };
};
