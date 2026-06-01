import React from 'react';
import QRCode from 'react-qr-code';
import { useDeviceId } from '../../hooks/useDeviceId';

export const ProfileScreen: React.FC = () => {
  const deviceId = useDeviceId();

  return (
    <div style={{ padding: 20, textAlign: 'center' }}>
      <h2>Your Profile</h2>
      <p><strong>Device ID:</strong></p>
      <code style={{ wordBreak: 'break-all', background: '#f0f0f0', padding: 8, display: 'inline-block' }}>
        {deviceId}
      </code>
      <div style={{ marginTop: 20 }}>
        <QRCode value={deviceId} size={150} />
      </div>
      <p style={{ fontSize: 12, color: '#666', marginTop: 20 }}>
        Share this QR code or ID with friends to connect (coming soon)
      </p>
    </div>
  );
};
