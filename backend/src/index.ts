import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import dotenv from 'dotenv';
import * as path from 'path';

import { DatabaseManager } from './core/database';
import { MediaService } from './modules/messages/audioProcessor';
import { SocketManager } from './core/socket';
import { familyRoutes } from './modules/auth/routes';
import { messageRoutes } from './modules/messages/routes';
import { authMiddleware } from './middleware/auth';
import { errorHandler } from './middleware/errorHandler';
import { initSignaling } from "./core/signaling";

dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  },
  maxHttpBufferSize: 1e8
});

const db = new DatabaseManager();
const mediaService = new MediaService();
const socketManager = new SocketManager(io, db);

// CORS for all routes including media
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(helmet({
  contentSecurityPolicy: false
}));
app.use(compression());
app.use(express.json({ limit: '10mb' }));

// Serve media files with proper headers
app.use('/media', (req, res, next) => {
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  next();
}, express.static('uploads/media'));

app.use('/api/family', familyRoutes(db));
app.use('/api/messages', authMiddleware, messageRoutes(db, mediaService));

// Socket.io authentication
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  // TODO: Verify token
  next();
});

socketManager.initialize();

const staticPath = path.join(__dirname, '../../frontend/dist');
app.use(express.static(staticPath));

app.get('*', (req, res) => {
  res.sendFile(path.join(staticPath, 'index.html'));
});

app.use(errorHandler);

const PORT = parseInt(process.env.PORT || '3000');

// Initialize WebRTC signaling
initSignaling(httpServer);

const startServer = async () => {
  await db.waitForReady();
  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
};

startServer();

export { db, io };

// Ensure proper audio MIME types
app.get('/media/*', (req, res, next) => {
  res.setHeader('Content-Type', 'audio/mp4');
  res.setHeader('Accept-Ranges', 'bytes');
  next();
});
// Serve audio files from uploads directory
app.use('/media', express.static('uploads/media'));
