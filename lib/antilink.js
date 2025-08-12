const { isJidGroup } = require('@whiskeysockets/baileys');
const { getAntilinkSetting } = require('./antilinkSettings'); // your settings file path

// Simple URL detection regex
function containsURL(str) {
  const urlRegex = /(https?:\/\/)?([a-z0-9-]+\.)+[a-z]{2,}(\/[^\s]*)?/i;
  return urlRegex.test(str);
}

/**
 * Antilink feature handler: deletes messages containing links from non-admins and kicks them.
 * @param {import('@whiskeysockets/baileys').AnyWASocket} sock - Baileys socket client
 * @param {import('@whiskeysockets/baileys').proto.IWebMessageInfo} msg - Incoming message object
 */
async function Antilink(sock, msg) {
  try {
    const jid = msg.key.remoteJid;
    if (!isJidGroup(jid)) return; // Only for groups

    if (getAntilinkSetting(jid) !== 'on') return; // Disabled for this group

    // Extract text content from different message types
    const textMsg =
      msg.message?.conversation ||
      msg.message?.extendedTextMessage?.text ||
      '';

    if (!textMsg || typeof textMsg !== 'string') return;

    const sender = msg.key.participant;
    if (!sender) return;

    // Fetch group metadata
    const metadata = await sock.groupMetadata(jid);

    // Check if sender is admin — admins are exempt
    const isAdmin = metadata.participants.some(
      (p) => p.id === sender && (p.admin === 'admin' || p.admin === 'superadmin')
    );
    if (isAdmin) return;

    // If no URL, ignore
    if (!containsURL(textMsg)) return;

    // Delete offending message
    await sock.sendMessage(jid, { delete: msg.key });

    // Kick the user who sent the link
    await sock.groupParticipantsUpdate(jid, [sender], 'remove');

    // Notify the group
    await sock.sendMessage(jid, {
      text: `@${sender.split('@')[0]} was removed for sending links.`,
      mentions: [sender],
    });
  } catch (error) {
    console.error('Antilink error:', error);
  }
}

module.exports = { Antilink };
