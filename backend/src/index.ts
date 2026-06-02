import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import dotenv from 'dotenv';
import path from 'path';

import { DatabaseManager } from './core/database';
import { MediaService } from './modules/messages/audioProcessor';
import { SocketManager } from './core/socket';
import { familyRoutes } from './modules/auth/routes';
import { messageRoutes } from './modules/messages/routes';
import { authMiddleware } from './middleware/auth';
import { errorHandler } from './middleware/errorHandler';
import { initSignaling } from './core/signaling';
import { ensureUploadDirectories } from './core/storage';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
  maxHttpBufferSize: 1e8
});

const db = new DatabaseManager();
const mediaService = new MediaService();
const socketManager = new SocketManager(io, db);

app.use(helmet({ contentSecurityPolicy: false }));
app.use(compression());
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use('/media', express.static('uploads/media'));

app.use('/api/family', familyRoutes(db));
app.use('/api/messages', authMiddleware, messageRoutes(db, mediaService));

io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  next();
});

socketManager.initialize();
initSignaling(httpServer);

const PORT = parseInt(process.env.PORT || '3000');

const startServer = async () => {
  await db.waitForReady();
  ensureUploadDirectories();
  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
};

startServer();

export { db, io };
