import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';

interface SignalingMessage {
  type: 'offer' | 'answer' | 'ice-candidate';
  from: string;
  to: string;
  data: any;
}

const sessions = new Map<string, WebSocket>(); // deviceId -> ws
const pendingSignals = new Map<string, SignalingMessage[]>(); // targetDeviceId -> queue

export function initSignaling(server: Server) {
  const wss = new WebSocketServer({ server, path: '/signal' });
  
  wss.on('connection', (ws: WebSocket, req) => {
    const url = new URL(req.url!, `http://${req.headers.host}`);
    const deviceId = url.searchParams.get('deviceId');
    
    if (!deviceId) {
      ws.close(1008, 'Missing deviceId');
      return;
    }
    
    sessions.set(deviceId, ws);
    
    // Deliver any queued messages for this device
    const queued = pendingSignals.get(deviceId);
    if (queued) {
      queued.forEach(msg => ws.send(JSON.stringify(msg)));
      pendingSignals.delete(deviceId);
    }
    
    ws.on('message', (raw: string) => {
      const msg: SignalingMessage = JSON.parse(raw);
      const targetWs = sessions.get(msg.to);
      if (targetWs && targetWs.readyState === WebSocket.OPEN) {
        targetWs.send(JSON.stringify(msg));
      } else {
        // Queue for later delivery
        const queue = pendingSignals.get(msg.to) || [];
        queue.push(msg);
        pendingSignals.set(msg.to, queue);
      }
    });
    
    ws.on('close', () => {
      sessions.delete(deviceId);
    });
  });
}
