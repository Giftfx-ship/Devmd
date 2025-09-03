// lib/isadmin.js

/**
 * Check if sender and bot are admins in the group
 * @param {object} sock - Baileys socket instance
 * @param {string} chatId - Group chat ID
 * @param {string} senderId - Message sender ID
 * @returns {Promise<{isSenderAdmin: boolean, isBotAdmin: boolean}>}
 */
export default async function isAdmin(sock, chatId, senderId) {
  try {
    const groupMetadata = await sock.groupMetadata(chatId);
    const participants = groupMetadata.participants;

    const botId = sock.user?.id || sock.user?.jid || "";

    const sender = participants.find(p => p.id === senderId);
    const bot = participants.find(p => p.id === botId);

    const isSenderAdmin = sender?.admin === "admin" || sender?.admin === "superadmin";
    const isBotAdmin = bot?.admin === "admin" || bot?.admin === "superadmin";

    return { isSenderAdmin, isBotAdmin };
  } catch (error) {
    console.error("❌ Error in isAdmin helper:", error);
    return { isSenderAdmin: false, isBotAdmin: false };
  }
}
