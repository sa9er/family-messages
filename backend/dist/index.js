"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.io = exports.db = void 0;
const express_1 = __importDefault(require("express"));
const http_1 = require("http");
const socket_io_1 = require("socket.io");
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const compression_1 = __importDefault(require("compression"));
const dotenv_1 = __importDefault(require("dotenv"));
const path = __importStar(require("path"));
const DatabaseManager_1 = require("./services/DatabaseManager");
const MediaService_1 = require("./services/MediaService");
const SocketManager_1 = require("./services/SocketManager");
const family_1 = require("./routes/family");
const messages_1 = require("./routes/messages");
const auth_1 = require("./middleware/auth");
const errorHandler_1 = require("./middleware/errorHandler");
dotenv_1.default.config();
const app = (0, express_1.default)();
const httpServer = (0, http_1.createServer)(app);
const io = new socket_io_1.Server(httpServer, {
    cors: {
        origin: process.env.FRONTEND_URL || '*',
        methods: ['GET', 'POST']
    },
    maxHttpBufferSize: 1e8
});
exports.io = io;
const db = new DatabaseManager_1.DatabaseManager();
exports.db = db;
const mediaService = new MediaService_1.MediaService();
const socketManager = new SocketManager_1.SocketManager(io, db);
app.use((0, helmet_1.default)({
    contentSecurityPolicy: false
}));
app.use((0, compression_1.default)());
app.use((0, cors_1.default)());
app.use(express_1.default.json({ limit: '10mb' }));
app.use('/media', express_1.default.static('uploads/media'));
app.use('/api/family', (0, family_1.familyRoutes)(db));
app.use('/api/messages', auth_1.authMiddleware, (0, messages_1.messageRoutes)(db, mediaService));
io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    next();
});
socketManager.initialize();
// Serve static frontend files in production
const staticPath = path.join(__dirname, '../../frontend/dist');
app.use(express_1.default.static(staticPath));
// Fallback to index.html for SPA routing
app.get('*', (req, res) => {
    res.sendFile(path.join(staticPath, 'index.html'));
});
app.use(errorHandler_1.errorHandler);
const PORT = parseInt(process.env.PORT || '3000');
const startServer = async () => {
    await db.waitForReady();
    httpServer.listen(PORT, '0.0.0.0', () => {
        console.log(`Server running on http://0.0.0.0:${PORT}`);
    });
};
startServer();
//# sourceMappingURL=index.js.map