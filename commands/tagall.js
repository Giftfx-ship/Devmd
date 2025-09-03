// commands/tagall.js
import isAdmin from "../lib/isadmin.js";
import settings from "../settings.js";

const channelInfo = {
  footer: `Created by ${settings.botName} | Join: ${settings.channel}`
};

async function tagAllCommand(sock, chatId, senderId) {
  try {
    const { isSenderAdmin, isBotAdmin } = await isAdmin(sock, chatId, senderId);

    if (!isSenderAdmin) {
      await sock.sendMessage(chatId, {
        text: "🚫 Only group admins can use the .tagall command.",
        ...channelInfo
      });
      return;
    }

    if (!isBotAdmin) {
      await sock.sendMessage(chatId, {
        text: "⚠️ Please make me an admin to tag all members.",
        ...channelInfo
      });
      return;
    }

    const groupMetadata = await sock.groupMetadata(chatId);
    const participants = groupMetadata.participants || [];

    if (participants.length === 0) {
      await sock.sendMessage(chatId, {
        text: "⚠️ No participants found in this group.",
        ...channelInfo
      });
      return;
    }

    // Build mention text
    const header = "🔊 *ATTENTION CREW!*\n\n";
    const mentionList = participants.map((p) => `@${p.id.split("@")[0]}`).join("\n");

    await sock.sendMessage(chatId, {
      text: header + mentionList,
      mentions: participants.map((p) => p.id),
      ...channelInfo
    });
  } catch (error) {
    console.error("❌ Error in tagall command:", error);
    await sock.sendMessage(chatId, {
      text: "⚠️ Failed to tag all members.",
      ...channelInfo
    });
  }
}

export default tagAllCommand;
