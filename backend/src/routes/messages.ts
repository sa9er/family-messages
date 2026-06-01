import { Router } from 'express';
import multer from 'multer';
import { DatabaseManager } from '../services/DatabaseManager';
import { MediaService } from '../services/MediaService';
import { randomUUID } from 'crypto';
import * as fs from 'fs';

const upload = multer({
  dest: 'uploads/temp/',
  limits: { fileSize: 100 * 1024 * 1024 }
});

export const messageRoutes = (db: DatabaseManager, media: MediaService): Router => {
  const router = Router();

  // GET all messages for a family
  router.get('/family/:familyId', async (req, res) => {
    try {
      const { familyId } = req.params;
      const dbInstance = (db as any).db;
      
      const stmt = dbInstance.prepare(`
        SELECT id, type, content, sender_id, created_at, duration, file_size 
        FROM messages 
        WHERE family_id = ? 
        ORDER BY created_at DESC 
        LIMIT 100
      `);
      stmt.bind([familyId]);
      
      const messages = [];
      while (stmt.step()) {
        const row = stmt.getAsObject();
        messages.push({
          id: row.id,
          type: row.type,
          content: row.content,
          senderId: row.sender_id,
          createdAt: row.created_at,
          duration: row.duration,
          fileSize: row.file_size
        });
      }
      stmt.free();
      
      res.json({ messages });
    } catch (error) {
      console.error('Get messages error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // POST upload audio/video message
  router.post('/upload', upload.single('media'), async (req, res) => {
    let tempFile = null;
    try {
      const { familyId, senderId, type } = req.body;
      const file = req.file;

      if (!file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      tempFile = file.path;

      if (!['audio', 'video'].includes(type)) {
        if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile);
        return res.status(400).json({ error: 'Invalid type' });
      }

      const messageId = randomUUID();
      let processed;

      if (type === 'video') {
        processed = await media.processVideo(tempFile, messageId);
      } else {
        processed = await media.processAudio(tempFile, messageId);
      }

      const dbInstance = (db as any).db;
      dbInstance.run(`
        INSERT INTO messages (id, family_id, sender_id, type, content, duration, file_size, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, strftime('%s', 'now'))
      `, [messageId, familyId, senderId, type, media.getMediaUrl(processed.compressedPath), processed.duration, processed.size]);
      
      (db as any).save();

      res.json({
        messageId,
        mediaUrl: media.getMediaUrl(processed.compressedPath),
        duration: processed.duration
      });
    } catch (error) {
      console.error('Upload error:', error);
      res.status(500).json({ error: 'Upload failed' });
    }
  });

  // POST text message
  router.post('/text', async (req, res) => {
    try {
      const { familyId, senderId, type, content } = req.body;
      const messageId = randomUUID();
      const createdAt = Math.floor(Date.now() / 1000);
      
      const dbInstance = (db as any).db;
      dbInstance.run(`
        INSERT INTO messages (id, family_id, sender_id, type, content, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [messageId, familyId, senderId, type, content, createdAt]);
      
      (db as any).save();
      
      res.json({ messageId, success: true });
    } catch (error) {
      console.error('Text message error:', error);
      res.status(500).json({ error: 'Failed to send text' });
    }
  });

  return router;
};
