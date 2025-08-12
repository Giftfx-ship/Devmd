// commands/tagall.js
const isAdmin = require('../lib/isadmin');

async function tagAllCommand(sock, chatId, senderId) {
  try {
    const { isSenderAdmin, isBotAdmin } = await isAdmin(sock, chatId, senderId);

    if (!isSenderAdmin) {
      await sock.sendMessage(chatId, {
        text: 'Only group admins can use the .tagall command.'
      });
      return;
    }

    if (!isBotAdmin) {
      await sock.sendMessage(chatId, {
        text: 'I need to be an admin to tag all members.'
      });
      return;
    }

    const groupMetadata = await sock.groupMetadata(chatId);
    const participants = groupMetadata.participants;

    if (!participants || participants.length === 0) {
      await sock.sendMessage(chatId, { text: 'No participants found in this group.' });
      return;
    }

    let message = '🔊 *ATTENTION CREW!*\n\n';
    participants.forEach(participant => {
      message += `@${participant.id.split('@')[0]}\n`;
    });

    await sock.sendMessage(chatId, {
      text: message,
      mentions: participants.map(p => p.id)
    });

  } catch (error) {
    console.error('Error in tagall command:', error);
    await sock.sendMessage(chatId, { text: 'Failed to tag all members.' });
  }
}

module.exports = tagAllCommand;
