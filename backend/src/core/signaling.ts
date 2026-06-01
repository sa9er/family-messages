import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';

interface SignalingMessage {
  type: 'offer' | 'answer' | 'ice-candidate';
  from: string;
  to: string;
  data: any;
}

const sessions = new Map<string, WebSocket>();
const pendingSignals = new Map<string, SignalingMessage[]>();

export function initSignaling(server: Server) {
  const wss = new WebSocketServer({ server, path: '/signal' });
  console.log('Signaling server running on /signal');
  
  wss.on('connection', (ws: WebSocket, req) => {
    const url = new URL(req.url!, `http://${req.headers.host}`);
    const deviceId = url.searchParams.get('deviceId');
    if (!deviceId) {
      ws.close(1008, 'Missing deviceId');
      return;
    }
    console.log(`Device connected: ${deviceId}`);
    sessions.set(deviceId, ws);
    
    // Deliver queued messages
    const queued = pendingSignals.get(deviceId);
    if (queued) {
      queued.forEach(msg => ws.send(JSON.stringify(msg)));
      pendingSignals.delete(deviceId);
    }
    
    ws.on('message', (raw: string) => {
      try {
        const msg: SignalingMessage = JSON.parse(raw);
        console.log(`Signal from ${msg.from} to ${msg.to}: ${msg.type}`);
        const targetWs = sessions.get(msg.to);
        if (targetWs && targetWs.readyState === WebSocket.OPEN) {
          targetWs.send(JSON.stringify(msg));
          console.log(`Relayed to ${msg.to}`);
        } else {
          console.log(`Queueing for ${msg.to}`);
          const queue = pendingSignals.get(msg.to) || [];
          queue.push(msg);
          pendingSignals.set(msg.to, queue);
        }
      } catch (err) {
        console.error('Invalid message:', raw);
      }
    });
    
    ws.on('close', () => {
      console.log(`Device disconnected: ${deviceId}`);
      sessions.delete(deviceId);
    });
  });
}
