export interface Family {
    id: string;
    name: string;
    inviteCode: string;
    createdAt: number;
    encryptionSalt: string;
}
export interface Member {
    id: string;
    familyId: string;
    displayName: string;
    publicKey: string;
    deviceId: string;
    lastSeen: number;
    createdAt: number;
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
export declare class DatabaseManager {
    private db;
    private dbPath;
    private SQL;
    private initialized;
    ready: Promise<void>;
    constructor(dbPath?: string);
    private init;
    private initializeSchema;
    private save;
    private ensureReady;
    waitForReady(): Promise<void>;
    createFamily(name: string): Family;
    getFamilyByCode(code: string): Family | undefined;
    addMember(familyId: string, displayName: string, publicKey: string, deviceId: string): Member;
    getFamilyMembers(familyId: string): Member[];
    storeMessage(msg: Omit<Message, 'id' | 'createdAt'>): Message;
    getMessages(familyId: string, afterId?: string, limit?: number): Message[];
    markDelivered(messageId: string, memberId: string): void;
    markSeen(messageId: string, memberId: string): void;
    getMessageSenderId(messageId: string): string | undefined;
    private generateInviteCode;
    close(): void;
}
//# sourceMappingURL=DatabaseManager.d.ts.map