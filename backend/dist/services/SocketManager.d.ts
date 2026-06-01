import { Server } from 'socket.io';
import { DatabaseManager } from './DatabaseManager';
export declare class SocketManager {
    private io;
    private db;
    private memberSockets;
    constructor(io: Server, db: DatabaseManager);
    initialize(): void;
    private sendPendingMessages;
    private notifySender;
    broadcastToFamily(familyId: string, event: string, data: any): void;
    isMemberOnline(memberId: string): boolean;
}
//# sourceMappingURL=SocketManager.d.ts.map