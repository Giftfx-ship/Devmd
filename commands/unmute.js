const isAdmin = require('../lib/isadmin'); // import your admin checker

async function unmuteCommand(sock, chatId, senderId, message = null) {
  try {
    // Only allow in groups
    if (!chatId.endsWith('@g.us')) {
      await sock.sendMessage(chatId, { text: '❌ This command can only be used in groups.' }, message ? { quoted: message } : {});
      return;
    }

    // Check admin status
    const { isSenderAdmin, isBotAdmin } = await isAdmin(sock, chatId, senderId);

    if (!isSenderAdmin) {
      await sock.sendMessage(chatId, { text: '❌ Only group admins can use this command.' }, message ? { quoted: message } : {});
      return;
    }

    if (!isBotAdmin) {
      await sock.sendMessage(chatId, { text: '❌ I need to be an admin to unmute the group.' }, message ? { quoted: message } : {});
      return;
    }

    // Change group setting to allow members to send messages
    await sock.groupSettingUpdate(chatId, 'not_announcement');

    // Send confirmation message to the group
    await sock.sendMessage(chatId, {
      text: '✅ The group has been unmuted by Mr Devmd ❤️ Let’s talk, guys!'
    }, message ? { quoted: message } : {});

  } catch (error) {
    console.error('Error unmuting group:', error);
    await sock.sendMessage(chatId, {
      text: '❌ Failed to unmute the group.'
    }, message ? { quoted: message } : {});
  }
}

module.exports = unmuteCommand;
