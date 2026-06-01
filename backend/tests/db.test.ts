import { DatabaseManager } from '../src/services/DatabaseManager';

describe('DatabaseManager', () => {
  let db: DatabaseManager;

  beforeEach(async () => {
    db = new DatabaseManager(':memory:');
    await db.waitForReady();
  });

  afterEach(() => {
    db.close();
  });

  test('creates family with invite code', () => {
    const family = db.createFamily('Test Family');
    expect(family.inviteCode).toHaveLength(6);
    expect(family.encryptionSalt).toBeDefined();
  });

  test('joins family by code', () => {
    const family = db.createFamily('Test Family');
    const found = db.getFamilyByCode(family.inviteCode);
    expect(found?.id).toBe(family.id);
  });

  test('stores and retrieves messages', () => {
    const family = db.createFamily('Test Family');
    const member = db.addMember(family.id, 'Dad', 'pubkey123', 'device1');
    
    const msg = db.storeMessage({
      familyId: family.id,
      senderId: member.id,
      type: 'audio',
      content: 'encrypted-blob-url',
      fileSize: 1024,
      deliveredTo: [],
      seenBy: []
    });
    
    expect(msg.id).toBeDefined();
    
    const messages = db.getMessages(family.id);
    expect(messages).toHaveLength(1);
    expect(messages[0].type).toBe('audio');
  });
});
