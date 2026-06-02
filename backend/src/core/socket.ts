import { Server, Socket } from 'socket.io';
import { DatabaseManager } from './database';

interface AuthenticatedSocket extends Socket {
  memberId?: string;
  familyId?: string;
}

export class SocketManager {
  private io: Server;
  private db: DatabaseManager;
  private memberSockets: Map<string, string[]> = new Map();

  constructor(io: Server, db: DatabaseManager) {
    this.io = io;
    this.db = db;
  }

  initialize(): void {
    this.io.on('connection', (socket: AuthenticatedSocket) => {
      console.log(`Socket connected: ${socket.id}`);

      socket.on('auth', (data: { memberId: string; familyId: string }) => {
        socket.memberId = data.memberId;
        socket.familyId = data.familyId;
        socket.join(data.familyId);

        const existing = this.memberSockets.get(data.memberId) || [];
        this.memberSockets.set(data.memberId, [...existing, socket.id]);

        console.log(`Member ${data.memberId} joined family ${data.familyId}`);
      });

      socket.on('disconnect', () => {
        if (socket.memberId) {
          const sockets = this.memberSockets.get(socket.memberId) || [];
          const filtered = sockets.filter(id => id !== socket.id);
          if (filtered.length) {
            this.memberSockets.set(socket.memberId, filtered);
          } else {
            this.memberSockets.delete(socket.memberId);
          }
        }
      });
    });
  }
}
