import { Router } from 'express';
import { DatabaseManager } from '../services/DatabaseManager';
import { randomUUID } from 'crypto';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this';

export const familyRoutes = (db: DatabaseManager): Router => {
  const router = Router();

  router.post('/create', async (req, res) => {
    try {
      const { name } = req.body;
      
      if (!name) {
        return res.status(400).json({ error: 'Family name required' });
      }

      const familyId = randomUUID();
      const memberId = randomUUID();
      const inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase();
      const encryptionSalt = randomUUID().replace(/-/g, '').substring(0, 32);

      // Access the internal db through a temporary method
      const dbInstance = (db as any).db;
      if (dbInstance) {
        dbInstance.run(`
          INSERT INTO families (id, name, invite_code, encryption_salt)
          VALUES (?, ?, ?, ?)
        `, [familyId, name, inviteCode, encryptionSalt]);

        dbInstance.run(`
          INSERT INTO members (id, family_id, display_name, public_key, device_id)
          VALUES (?, ?, ?, ?, ?)
        `, [memberId, familyId, 'Admin', 'temp-public-key', 'device-001']);
        
        (db as any).save();
      }

      // Generate JWT token
      const token = jwt.sign(
        { memberId, familyId },
        JWT_SECRET,
        { expiresIn: '30d' }
      );

      res.json({
        familyId,
        memberId,
        inviteCode,
        encryptionSalt,
        token
      });
    } catch (error) {
      console.error('Create family error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  return router;
};
