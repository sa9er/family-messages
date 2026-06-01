"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.familyRoutes = void 0;
const express_1 = require("express");
const familyRoutes = (db) => {
    const router = (0, express_1.Router)();
    router.post('/create', (req, res) => {
        const { name } = req.body;
        if (!name || name.length < 2) {
            return res.status(400).json({ error: 'Family name required' });
        }
        const family = db.createFamily(name);
        // Create the first member (creator)
        const deviceId = req.body.deviceId || 'creator-device';
        const member = db.addMember(family.id, 'Creator', 'creator-key', deviceId);
        res.json({
            familyId: family.id,
            memberId: member.id,
            inviteCode: family.inviteCode,
            encryptionSalt: family.encryptionSalt
        });
    });
    router.post('/join', (req, res) => {
        const { inviteCode, displayName, publicKey, deviceId } = req.body;
        if (!inviteCode || !displayName || !publicKey || !deviceId) {
            return res.status(400).json({ error: 'Missing required fields' });
        }
        const family = db.getFamilyByCode(inviteCode.toUpperCase());
        if (!family) {
            return res.status(404).json({ error: 'Invalid invite code' });
        }
        const member = db.addMember(family.id, displayName, publicKey, deviceId);
        res.json({
            familyId: family.id,
            memberId: member.id,
            familyName: family.name,
            encryptionSalt: family.encryptionSalt
        });
    });
    router.get('/:familyId/members', (req, res) => {
        const members = db.getFamilyMembers(req.params.familyId);
        res.json(members.map(m => ({
            id: m.id,
            displayName: m.displayName,
            lastSeen: m.lastSeen
        })));
    });
    return router;
};
exports.familyRoutes = familyRoutes;
//# sourceMappingURL=family.js.map