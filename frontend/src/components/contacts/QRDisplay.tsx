import React from 'react';
import QRCode from 'qrcode.react';

interface Props {
  deviceId: string;
}

export const QRDisplay: React.FC<Props> = ({ deviceId }) => {
  return (
    <div style={{ textAlign: 'center', padding: 20 }}>
      <h3>Your QR Code</h3>
      <QRCode value={deviceId} size={200} />
      <p>Let friend scan this to connect</p>
    </div>
  );
};
