import { Server } from 'socket.io';
import { DatabaseManager } from './services/DatabaseManager';
declare const io: Server<import("socket.io").DefaultEventsMap, import("socket.io").DefaultEventsMap, import("socket.io").DefaultEventsMap, any>;
declare const db: DatabaseManager;
export { db, io };
//# sourceMappingURL=index.d.ts.map