const isAdmin = require('../lib/isadmin');

const channelInfo = {
  footer: "Created by MR DEV | Join our channel: https://whatsapp.com/channel/0029VbB3zXu9Gv7LXS62GA1F"
};

async function kickCommand(sock, chatId, senderId, message) {
  try {
    const isOwner = message.key.fromMe;

    // Extract mentioned JIDs if any
    const mentionedJids = message.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];

    // Check if sender is admin if not owner
    if (!isOwner) {
      const { isSenderAdmin, isBotAdmin } = await isAdmin(sock, chatId, senderId);

      if (!isBotAdmin) {
        await sock.sendMessage(chatId, 
          { text: 'Please make the bot an admin first.', ...channelInfo }, 
          { quoted: message }
        );
        return;
      }

      if (!isSenderAdmin) {
        await sock.sendMessage(chatId, 
          { text: 'Only group admins can use the kick command.', ...channelInfo }, 
          { quoted: message }
        );
        return;
      }
    }

    let usersToKick = [];

    if (mentionedJids.length > 0) {
      usersToKick = mentionedJids;
    } else if (message.message?.extendedTextMessage?.contextInfo?.participant) {
      usersToKick = [message.message.extendedTextMessage.contextInfo.participant];
    }

    if (usersToKick.length === 0) {
      await sock.sendMessage(chatId, 
        { text: 'Please mention or reply to a user to kick.', ...channelInfo }, 
        { quoted: message }
      );
      return;
    }

    // Kick users one by one
    for (const userId of usersToKick) {
      await sock.groupParticipantsUpdate(chatId, [userId], 'remove');
    }

    await sock.sendMessage(chatId, 
      { text: `✅ Kicked ${usersToKick.length} user(s) from the group.`, ...channelInfo }
    );

  } catch (error) {
    console.error('Error in kick command:', error);
    await sock.sendMessage(chatId, 
      { text: '❌ Failed to kick user(s).', ...channelInfo }, 
      { quoted: message }
    );
  }
}

module.exports = kickCommand;
