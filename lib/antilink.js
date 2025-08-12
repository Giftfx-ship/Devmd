const { isJidGroup } = require('@whiskeysockets/baileys');

function containsURL(str) {
    const urlRegex = /(https?:\/\/)?([a-z0-9-]+\.)+[a-z]{2,}(\/[^\s]*)?/i;
    return urlRegex.test(str);
}

async function Antilink(sock, msg) {
    const jid = msg.key.remoteJid;
    if (!isJidGroup(jid)) return;

    const textMsg =
        msg.message?.conversation ||
        msg.message?.extendedTextMessage?.text ||
        '';
    if (!textMsg || typeof textMsg !== 'string') return;

    const sender = msg.key.participant;
    if (!sender) return;

    // Check if sender is group admin
    const metadata = await sock.groupMetadata(jid);
    const isAdmin = metadata.participants.some(p => p.id === sender && (p.admin === 'admin' || p.admin === 'superadmin'));
    if (isAdmin) return;

    // If no link, exit
    if (!containsURL(textMsg)) return;

    try {
        // Delete message
        await sock.sendMessage(jid, { delete: msg.key });

        // Kick sender
        await sock.groupParticipantsUpdate(jid, [sender], 'remove');

        // Send warning
        await sock.sendMessage(jid, {
            text: `@${sender.split('@')[0]} was removed for sending links.`,
            mentions: [sender]
        });
    } catch (error) {
        console.error('Error in Antilink:', error);
    }
}

module.exports = { Antilink };
