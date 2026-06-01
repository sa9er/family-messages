import initSqlJs from 'sql.js';
import * as fs from 'fs';
import * as path from 'path';
import { randomUUID } from 'crypto';

export interface Family {
  id: string;
  name: string;
  inviteCode: string;
  createdAt: number;
  encryptionSalt: string;
}

export interface Message {
  id: string;
  familyId: string;
  senderId: string;
  type: 'audio' | 'video' | 'text';
  content: string;
  thumbnailUrl?: string;
  duration?: number;
  fileSize: number;
  createdAt: number;
  deliveredTo: string[];
  seenBy: string[];
}

export class DatabaseManager {
  private db: any;
  private dbPath: string;
  private SQL: any;
  private initialized: boolean = false;
  public ready: Promise<void>;

  constructor(dbPath: string = 'data/family-messages.db') {
    this.dbPath = dbPath;
    this.ready = this.init();
  }

  private async init(): Promise<void> {
    const dir = path.dirname(this.dbPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    this.SQL = await initSqlJs();
    
    if (fs.existsSync(this.dbPath)) {
      const filebuffer = fs.readFileSync(this.dbPath);
      this.db = new this.SQL.Database(filebuffer);
    } else {
      this.db = new this.SQL.Database();
    }

    this.initializeSchema();
    this.initialized = true;
    this.save();
  }

  private initializeSchema(): void {
    this.db.run(`
      CREATE TABLE IF NOT EXISTS families (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        invite_code TEXT UNIQUE NOT NULL,
        encryption_salt TEXT NOT NULL,
        created_at INTEGER DEFAULT (strftime('%s', 'now'))
      );
      
      CREATE TABLE IF NOT EXISTS members (
        id TEXT PRIMARY KEY,
        family_id TEXT NOT NULL,
        display_name TEXT NOT NULL,
        public_key TEXT NOT NULL,
        device_id TEXT NOT NULL,
        last_seen INTEGER DEFAULT (strftime('%s', 'now')),
        created_at INTEGER DEFAULT (strftime('%s', 'now')),
        UNIQUE(family_id, device_id)
      );
      
      CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY,
        family_id TEXT NOT NULL,
        sender_id TEXT NOT NULL,
        type TEXT CHECK(type IN ('audio', 'video', 'text')),
        content TEXT NOT NULL,
        thumbnail_url TEXT,
        duration INTEGER,
        file_size INTEGER DEFAULT 0,
        created_at INTEGER DEFAULT (strftime('%s', 'now')),
        delivered_to TEXT DEFAULT '[]',
        seen_by TEXT DEFAULT '[]'
      );
    `);
  }

  private save(): void {
    const data = this.db.export();
    fs.writeFileSync(this.dbPath, Buffer.from(data));
  }

  async waitForReady(): Promise<void> {
    await this.ready;
  }

  createFamily(name: string): Family {
    const id = randomUUID();
    const inviteCode = this.generateInviteCode();
    const salt = randomUUID().replace(/-/g, '');
    
    this.db.run(
      'INSERT INTO families (id, name, invite_code, encryption_salt) VALUES (?, ?, ?, ?)',
      [id, name, inviteCode, salt]
    );
    this.save();
    
    return { id, name, inviteCode, createdAt: Date.now(), encryptionSalt: salt };
  }

  getFamilyByCode(code: string): Family | undefined {
    const stmt = this.db.prepare('SELECT * FROM families WHERE invite_code = ?');
    stmt.bind([code]);
    if (!stmt.step()) {
      stmt.free();
      return undefined;
    }
    const row = stmt.getAsObject();
    stmt.free();
    
    return {
      id: row.id,
      name: row.name,
      inviteCode: row.invite_code,
      createdAt: row.created_at * 1000,
      encryptionSalt: row.encryption_salt
    };
  }

  addMember(familyId: string, displayName: string, publicKey: string, deviceId: string): any {
    const id = randomUUID();
    const now = Math.floor(Date.now() / 1000);
    
    this.db.run(
      'INSERT INTO members (id, family_id, display_name, public_key, device_id, last_seen, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [id, familyId, displayName, publicKey, deviceId, now, now]
    );
    this.save();
    
    return { id, familyId, displayName, publicKey, deviceId, lastSeen: now * 1000, createdAt: now * 1000 };
  }

  getFamilyMembers(familyId: string): any[] {
    const stmt = this.db.prepare('SELECT * FROM members WHERE family_id = ?');
    stmt.bind([familyId]);
    
    const members: any[] = [];
    while (stmt.step()) {
      const row = stmt.getAsObject();
      members.push({
        id: row.id,
        familyId: row.family_id,
        displayName: row.display_name,
        publicKey: row.public_key,
        deviceId: row.device_id,
        lastSeen: row.last_seen * 1000,
        createdAt: row.created_at * 1000
      });
    }
    stmt.free();
    return members;
  }

  storeMessage(msg: any): Message {
    const id = randomUUID();
    const now = Math.floor(Date.now() / 1000);
    
    this.db.run(
      `INSERT INTO messages (id, family_id, sender_id, type, content, thumbnail_url, duration, file_size, created_at, delivered_to, seen_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, msg.familyId, msg.senderId, msg.type, msg.content, msg.thumbnailUrl || null, msg.duration || null, msg.fileSize, now, JSON.stringify([]), JSON.stringify([])]
    );
    this.save();
    
    return {
      ...msg,
      id,
      createdAt: now * 1000,
      deliveredTo: [],
      seenBy: []
    };
  }

  getMessages(familyId: string, afterId?: string, limit: number = 50): Message[] {
    const stmt = this.db.prepare(
      'SELECT * FROM messages WHERE family_id = ? ORDER BY created_at DESC LIMIT ?'
    );
    stmt.bind([familyId, limit]);
    
    const messages: Message[] = [];
    while (stmt.step()) {
      const row = stmt.getAsObject();
      messages.push({
        id: row.id,
        familyId: row.family_id,
        senderId: row.sender_id,
        type: row.type,
        content: row.content,
        thumbnailUrl: row.thumbnail_url,
        duration: row.duration,
        fileSize: row.file_size,
        createdAt: row.created_at * 1000,
        deliveredTo: JSON.parse(row.delivered_to || '[]'),
        seenBy: JSON.parse(row.seen_by || '[]')
      });
    }
    stmt.free();
    return messages;
  }

  markDelivered(messageId: string, memberId: string): void {
    const stmt = this.db.prepare('SELECT delivered_to FROM messages WHERE id = ?');
    stmt.bind([messageId]);
    
    if (!stmt.step()) {
      stmt.free();
      return;
    }
    
    const row = stmt.getAsObject();
    stmt.free();
    
    let delivered = [];
    try {
      delivered = JSON.parse(row.delivered_to || '[]');
    } catch(e) {
      delivered = [];
    }
    
    if (!delivered.includes(memberId)) {
      delivered.push(memberId);
      this.db.run('UPDATE messages SET delivered_to = ? WHERE id = ?', [JSON.stringify(delivered), messageId]);
      this.save();
    }
  }

  markSeen(messageId: string, memberId: string): void {
    const stmt = this.db.prepare('SELECT seen_by FROM messages WHERE id = ?');
    stmt.bind([messageId]);
    
    if (!stmt.step()) {
      stmt.free();
      return;
    }
    
    const row = stmt.getAsObject();
    stmt.free();
    
    let seen = [];
    try {
      seen = JSON.parse(row.seen_by || '[]');
    } catch(e) {
      seen = [];
    }
    
    if (!seen.includes(memberId)) {
      seen.push(memberId);
      this.db.run('UPDATE messages SET seen_by = ? WHERE id = ?', [JSON.stringify(seen), messageId]);
      this.save();
    }
  }

  getMessageSenderId(messageId: string): string | undefined {
    const stmt = this.db.prepare('SELECT sender_id FROM messages WHERE id = ?');
    stmt.bind([messageId]);
    
    if (!stmt.step()) {
      stmt.free();
      return undefined;
    }
    
    const row = stmt.getAsObject();
    stmt.free();
    return row.sender_id;
  }

  private generateInviteCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  close(): void {
    if (this.db) {
      this.save();
      this.db.close();
    }
  }
}
