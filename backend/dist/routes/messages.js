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
exports.messageRoutes = void 0;
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const crypto_1 = require("crypto");
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const upload = (0, multer_1.default)({
    dest: 'uploads/temp/',
    limits: { fileSize: 100 * 1024 * 1024 }
});
const messageRoutes = (db, media) => {
    const router = (0, express_1.Router)();
    router.post('/upload', upload.single('media'), async (req, res) => {
        try {
            const { familyId, senderId, type } = req.body;
            const file = req.file;
            console.log('Upload request:', {
                familyId,
                senderId,
                type,
                fileSize: file?.size,
                fileMime: file?.mimetype,
                filePath: file?.path
            });
            if (!file) {
                return res.status(400).json({ error: 'No file uploaded' });
            }
            if (file.size < 1000) {
                fs.unlinkSync(file.path);
                return res.status(400).json({ error: 'File too small (less than 1KB)' });
            }
            if (!['audio', 'video'].includes(type)) {
                fs.unlinkSync(file.path);
                return res.status(400).json({ error: 'Invalid type' });
            }
            const messageId = (0, crypto_1.randomUUID)();
            let processed;
            // Save original file for debugging
            const originalDir = 'uploads/original';
            if (!fs.existsSync(originalDir))
                fs.mkdirSync(originalDir, { recursive: true });
            const originalPath = path.join(originalDir, `${messageId}_original${path.extname(file.originalname)}`);
            fs.copyFileSync(file.path, originalPath);
            console.log(`Saved original file: ${originalPath}`);
            if (type === 'video') {
                processed = await media.processVideo(file.path, messageId);
            }
            else {
                processed = await media.processAudio(file.path, messageId);
            }
            console.log('Processing complete:', {
                duration: processed.duration,
                size: processed.size,
                outputPath: processed.compressedPath
            });
            const message = db.storeMessage({
                familyId,
                senderId,
                type,
                content: media.getMediaUrl(path.basename(processed.compressedPath)),
                thumbnailUrl: processed.thumbnailPath
                    ? media.getMediaUrl(path.basename(processed.thumbnailPath))
                    : undefined,
                duration: processed.duration,
                fileSize: processed.size,
                deliveredTo: [],
                seenBy: []
            });
            res.json({
                messageId: message.id,
                url: message.content,
                thumbnailUrl: message.thumbnailUrl,
                duration: message.duration,
                createdAt: message.createdAt
            });
        }
        catch (error) {
            console.error('Upload error:', error);
            res.status(500).json({ error: 'Processing failed: ' + error.message });
        }
    });
    router.get('/:familyId', (req, res) => {
        const { after, limit = '50' } = req.query;
        const messages = db.getMessages(req.params.familyId, after, parseInt(limit));
        res.json(messages);
    });
    router.post('/:messageId/seen', (req, res) => {
        const { memberId } = req.body;
        db.markSeen(req.params.messageId, memberId);
        res.json({ success: true });
    });
    return router;
};
exports.messageRoutes = messageRoutes;
//# sourceMappingURL=messages.js.map