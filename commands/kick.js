// commands/kick.js
import isAdmin from "../lib/isadmin.js";
import settings from "../settings.js";

const channelInfo = {
  footer: `Created by ${settings.botName} | Join our channel: ${settings.channel}`,
};

async function kickCommand(sock, chatId, senderId, message) {
  try {
    const isOwner = message.key.fromMe;

    // Extract mentioned users
    const mentionedJids =
      message.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];

    // Check permissions if not owner
    if (!isOwner) {
      const { isSenderAdmin, isBotAdmin } = await isAdmin(sock, chatId, senderId);

      if (!isBotAdmin) {
        await sock.sendMessage(
          chatId,
          { text: "❌ Please make the bot an admin first.", ...channelInfo },
          { quoted: message }
        );
        return;
      }

      if (!isSenderAdmin) {
        await sock.sendMessage(
          chatId,
          { text: "❌ Only group admins can use the kick command.", ...channelInfo },
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
      await sock.sendMessage(
        chatId,
        { text: "⚠️ Please mention or reply to a user to kick.", ...channelInfo },
        { quoted: message }
      );
      return;
    }

    // Remove users one by one
    for (const userId of usersToKick) {
      await sock.groupParticipantsUpdate(chatId, [userId], "remove");
    }

    await sock.sendMessage(chatId, {
      text: `✅ Removed ${usersToKick.length} user(s) from the group.`,
      ...channelInfo,
    });
  } catch (error) {
    console.error("❌ Kick command error:", error);
    await sock.sendMessage(
      chatId,
      { text: "❌ Failed to kick user(s). Make sure I am admin.", ...channelInfo },
      { quoted: message }
    );
  }
}

export default kickCommand;
