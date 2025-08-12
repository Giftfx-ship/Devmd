// lib/isadmin.js

/**
 * Check if sender and bot are admins in the group
 * @param {object} sock - Baileys socket instance
 * @param {string} chatId - Group chat ID
 * @param {string} senderId - Message sender ID
 * @returns {Promise<{isSenderAdmin: boolean, isBotAdmin: boolean}>}
 */
async function isAdmin(sock, chatId, senderId) {
  try {
    const groupMetadata = await sock.groupMetadata(chatId);
    const participants = groupMetadata.participants;

    let isSenderAdmin = false;
    let isBotAdmin = false;
    const botId = sock.user?.id || sock.user?.jid || '';

    for (const participant of participants) {
      if (participant.id === senderId) {
        isSenderAdmin = participant.admin === 'admin' || participant.admin === 'superadmin';
      }
      if (participant.id === botId) {
        isBotAdmin = participant.admin === 'admin' || participant.admin === 'superadmin';
      }
      if (isSenderAdmin && isBotAdmin) break;
    }

    return { isSenderAdmin, isBotAdmin };
  } catch (error) {
    console.error('Error in isAdmin helper:', error);
    return { isSenderAdmin: false, isBotAdmin: false };
  }
}

module.exports = isAdmin;
