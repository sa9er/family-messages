import React, { useRef, useState } from 'react';
import jsQR from 'jsqr';

interface Props {
  onScan: (deviceId: string) => void;
}

export const QRScanner: React.FC<Props> = ({ onScan }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [scanning, setScanning] = useState(false);

  const startScan = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
    if (videoRef.current) videoRef.current.srcObject = stream;
    setScanning(true);
    scan();
  };

  const scan = () => {
    if (!videoRef.current || !scanning) return;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      ctx?.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      const imageData = ctx?.getImageData(0, 0, canvas.width, canvas.height);
      if (imageData) {
        const code = jsQR(imageData.data, imageData.width, imageData.height);
        if (code) {
          setScanning(false);
          (videoRef.current.srcObject as MediaStream)?.getTracks().forEach(t => t.stop());
          onScan(code.data);
          return;
        }
      }
    }
    requestAnimationFrame(scan);
  };

  return (
    <div>
      <video ref={videoRef} autoPlay playsInline style={{ width: '100%' }} />
      {!scanning && <button onClick={startScan}>Scan QR Code</button>}
    </div>
  );
};
