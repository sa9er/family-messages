"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SocketManager = void 0;
class SocketManager {
    io;
    db;
    memberSockets = new Map();
    constructor(io, db) {
        this.io = io;
        this.db = db;
    }
    initialize() {
        this.io.on('connection', (socket) => {
            console.log(`Socket connected: ${socket.id}`);
            socket.on('auth', (data) => {
                socket.memberId = data.memberId;
                socket.familyId = data.familyId;
                socket.join(data.familyId);
                const existing = this.memberSockets.get(data.memberId) || [];
                this.memberSockets.set(data.memberId, [...existing, socket.id]);
                this.sendPendingMessages(socket);
                console.log(`Member ${data.memberId} joined family ${data.familyId}`);
            });
            socket.on('message:sent', (data) => {
                if (!socket.familyId || !socket.memberId)
                    return;
                socket.to(socket.familyId).emit('message:new', {
                    messageId: data.messageId,
                    senderId: socket.memberId
                });
            });
            socket.on('message:delivered', (data) => {
                if (!socket.memberId)
                    return;
                this.db.markDelivered(data.messageId, socket.memberId);
                this.notifySender(data.messageId, 'delivered', socket.memberId);
            });
            socket.on('message:seen', (data) => {
                if (!socket.memberId)
                    return;
                this.db.markSeen(data.messageId, socket.memberId);
                this.notifySender(data.messageId, 'seen', socket.memberId);
            });
            socket.on('typing:start', () => {
                if (socket.familyId) {
                    socket.to(socket.familyId).emit('typing', { memberId: socket.memberId, typing: true });
                }
            });
            socket.on('typing:stop', () => {
                if (socket.familyId) {
                    socket.to(socket.familyId).emit('typing', { memberId: socket.memberId, typing: false });
                }
            });
            socket.on('disconnect', () => {
                if (socket.memberId) {
                    const sockets = this.memberSockets.get(socket.memberId) || [];
                    const filtered = sockets.filter(id => id !== socket.id);
                    if (filtered.length === 0) {
                        this.memberSockets.delete(socket.memberId);
                    }
                    else {
                        this.memberSockets.set(socket.memberId, filtered);
                    }
                }
                console.log(`Socket disconnected: ${socket.id}`);
            });
        });
    }
    sendPendingMessages(socket) {
        if (!socket.memberId || !socket.familyId)
            return;
        const messages = this.db.getMessages(socket.familyId, undefined, 100);
        const pending = messages.filter(m => !m.deliveredTo.includes(socket.memberId) && m.senderId !== socket.memberId);
        if (pending.length > 0) {
            socket.emit('messages:pending', pending);
        }
    }
    notifySender(messageId, event, byMemberId) {
        const senderId = this.db.getMessageSenderId(messageId);
        if (!senderId)
            return;
        const senderSockets = this.memberSockets.get(senderId);
        if (senderSockets) {
            senderSockets.forEach(socketId => {
                this.io.to(socketId).emit(`message:${event}`, { messageId, by: byMemberId });
            });
        }
    }
    broadcastToFamily(familyId, event, data) {
        this.io.to(familyId).emit(event, data);
    }
    isMemberOnline(memberId) {
        return this.memberSockets.has(memberId);
    }
}
exports.SocketManager = SocketManager;
//# sourceMappingURL=SocketManager.js.map