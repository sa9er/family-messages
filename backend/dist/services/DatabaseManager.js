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
exports.DatabaseManager = void 0;
const sql_js_1 = __importDefault(require("sql.js"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const crypto_1 = require("crypto");
class DatabaseManager {
    db;
    dbPath;
    SQL;
    initialized = false;
    ready;
    constructor(dbPath = 'data/family-messages.db') {
        this.dbPath = dbPath;
        this.ready = this.init();
    }
    async init() {
        const dir = path.dirname(this.dbPath);
        if (!fs.existsSync(dir))
            fs.mkdirSync(dir, { recursive: true });
        this.SQL = await (0, sql_js_1.default)();
        if (fs.existsSync(this.dbPath)) {
            const filebuffer = fs.readFileSync(this.dbPath);
            this.db = new this.SQL.Database(filebuffer);
        }
        else {
            this.db = new this.SQL.Database();
        }
        this.initializeSchema();
        this.initialized = true;
        this.save();
    }
    initializeSchema() {
        this.db.run(`
      CREATE TABLE IF NOT EXISTS families (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        invite_code TEXT UNIQUE NOT NULL,
        encryption_salt TEXT NOT NULL,
        created_at INTEGER DEFAULT (strftime('%s', 'now'))
      );
      
      CREATE INDEX IF NOT EXISTS idx_families_code ON families(invite_code);
    `);
        this.db.run(`
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
      
      CREATE INDEX IF NOT EXISTS idx_members_family ON members(family_id);
    `);
        this.db.run(`
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
      
      CREATE INDEX IF NOT EXISTS idx_messages_family ON messages(family_id, created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id, created_at DESC);
    `);
        this.db.run(`
      CREATE TABLE IF NOT EXISTS sync_checkpoints (
        member_id TEXT PRIMARY KEY,
        last_message_id TEXT,
        updated_at INTEGER DEFAULT (strftime('%s', 'now'))
      );
    `);
    }
    save() {
        const data = this.db.export();
        fs.writeFileSync(this.dbPath, Buffer.from(data));
    }
    ensureReady() {
        if (!this.initialized) {
            throw new Error('Database not initialized yet');
        }
    }
    async waitForReady() {
        await this.ready;
    }
    createFamily(name) {
        this.ensureReady();
        const id = (0, crypto_1.randomUUID)();
        const inviteCode = this.generateInviteCode();
        const salt = (0, crypto_1.randomUUID)().replace(/-/g, '');
        this.db.run('INSERT INTO families (id, name, invite_code, encryption_salt) VALUES (?, ?, ?, ?)', [id, name, inviteCode, salt]);
        this.save();
        return {
            id,
            name,
            inviteCode,
            createdAt: Date.now(),
            encryptionSalt: salt
        };
    }
    getFamilyByCode(code) {
        this.ensureReady();
        const stmt = this.db.prepare('SELECT * FROM families WHERE invite_code = ?');
        const row = stmt.getAsObject([code]);
        stmt.free();
        if (!row.id)
            return undefined;
        return {
            id: row.id,
            name: row.name,
            inviteCode: row.invite_code,
            createdAt: row.created_at * 1000,
            encryptionSalt: row.encryption_salt
        };
    }
    addMember(familyId, displayName, publicKey, deviceId) {
        this.ensureReady();
        const id = (0, crypto_1.randomUUID)();
        const now = Math.floor(Date.now() / 1000);
        this.db.run('INSERT INTO members (id, family_id, display_name, public_key, device_id, last_seen, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)', [id, familyId, displayName, publicKey, deviceId, now, now]);
        this.save();
        return {
            id,
            familyId,
            displayName,
            publicKey,
            deviceId,
            lastSeen: now * 1000,
            createdAt: now * 1000
        };
    }
    getFamilyMembers(familyId) {
        this.ensureReady();
        const stmt = this.db.prepare('SELECT * FROM members WHERE family_id = ? ORDER BY created_at');
        const members = [];
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
    storeMessage(msg) {
        this.ensureReady();
        const id = (0, crypto_1.randomUUID)();
        const now = Math.floor(Date.now() / 1000);
        this.db.run(`INSERT INTO messages 
      (id, family_id, sender_id, type, content, thumbnail_url, duration, file_size, created_at, delivered_to, seen_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [id, msg.familyId, msg.senderId, msg.type, msg.content, msg.thumbnailUrl || null, msg.duration || null, msg.fileSize, now, JSON.stringify(msg.deliveredTo), JSON.stringify(msg.seenBy)]);
        this.save();
        return {
            ...msg,
            id,
            createdAt: now * 1000
        };
    }
    getMessages(familyId, afterId, limit = 50) {
        this.ensureReady();
        let stmt;
        let messages = [];
        if (afterId) {
            stmt = this.db.prepare(`
        SELECT * FROM messages 
        WHERE family_id = ? AND created_at > (SELECT created_at FROM messages WHERE id = ?)
        ORDER BY created_at DESC
        LIMIT ?
      `);
            stmt.bind([familyId, afterId, limit]);
        }
        else {
            stmt = this.db.prepare('SELECT * FROM messages WHERE family_id = ? ORDER BY created_at DESC LIMIT ?');
            stmt.bind([familyId, limit]);
        }
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
                deliveredTo: JSON.parse(row.delivered_to),
                seenBy: JSON.parse(row.seen_by)
            });
        }
        stmt.free();
        return messages;
    }
    markDelivered(messageId, memberId) {
        this.ensureReady();
        const stmt = this.db.prepare('SELECT delivered_to FROM messages WHERE id = ?');
        stmt.bind([messageId]);
        if (!stmt.step()) {
            stmt.free();
            return;
        }
        const row = stmt.getAsObject();
        stmt.free();
        const delivered = JSON.parse(row.delivered_to);
        if (!delivered.includes(memberId)) {
            delivered.push(memberId);
            this.db.run('UPDATE messages SET delivered_to = ? WHERE id = ?', [JSON.stringify(delivered), messageId]);
            this.save();
        }
    }
    markSeen(messageId, memberId) {
        this.ensureReady();
        const stmt = this.db.prepare('SELECT seen_by FROM messages WHERE id = ?');
        stmt.bind([messageId]);
        if (!stmt.step()) {
            stmt.free();
            return;
        }
        const row = stmt.getAsObject();
        stmt.free();
        const seen = JSON.parse(row.seen_by);
        if (!seen.includes(memberId)) {
            seen.push(memberId);
            this.db.run('UPDATE messages SET seen_by = ? WHERE id = ?', [JSON.stringify(seen), messageId]);
            this.save();
        }
    }
    getMessageSenderId(messageId) {
        this.ensureReady();
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
    generateInviteCode() {
        this.ensureReady();
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        let code = '';
        for (let i = 0; i < 6; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        const stmt = this.db.prepare('SELECT 1 FROM families WHERE invite_code = ?');
        stmt.bind([code]);
        const exists = stmt.step();
        stmt.free();
        if (exists)
            return this.generateInviteCode();
        return code;
    }
    close() {
        if (this.db) {
            this.save();
            this.db.close();
        }
    }
}
exports.DatabaseManager = DatabaseManager;
//# sourceMappingURL=DatabaseManager.js.map