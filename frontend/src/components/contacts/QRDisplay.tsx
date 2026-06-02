import { useDeviceId } from '../../hooks/useDeviceId';

export const QRDisplay = () => {
  const deviceId = useDeviceId();
  
  // Generate a simple data URL QR code using an external API (works without extra dependencies)
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(deviceId)}`;
  
  return (
    <div style={{ textAlign: 'center', padding: 20 }}>
      <h3>Your QR Code</h3>
      <img src={qrUrl} alt="QR Code" width={150} height={150} />
      <p style={{ fontSize: 12, marginTop: 10 }}>Your Device ID: <code>{deviceId}</code></p>
      <p>Share this QR code or ID with friends to connect</p>
    </div>
  );
};
