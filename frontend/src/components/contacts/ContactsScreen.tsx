import { useState } from 'react';
import { useDeviceId } from '../../hooks/useDeviceId';
import { QRDisplay } from './QRDisplay';
import { QRScanner } from './QRScanner';

interface Props {
  onConnect: (targetDeviceId: string) => void;
}

export const ContactsScreen: React.FC<Props> = ({ onConnect }) => {
  const deviceId = useDeviceId();
  const [showQR, setShowQR] = useState(false);
  const [showScanner, setShowScanner] = useState(false);

  return (
    <div style={{ padding: 20 }}>
      <h2>Contacts</h2>
      <button onClick={() => setShowQR(true)}>Show My QR</button>
      <button onClick={() => setShowScanner(true)}>Scan Friend's QR</button>
      {showQR && <QRDisplay deviceId={deviceId} />}
      {showScanner && <QRScanner onScan={(id) => { setShowScanner(false); onConnect(id); }} />}
    </div>
  );
};
