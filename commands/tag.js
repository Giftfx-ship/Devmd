// commands/tag.js
import { downloadContentFromMessage } from "@whiskeysockets/baileys";
import fs from "fs";
import path from "path";
import isAdmin from "../lib/isadmin.js";
import settings from "../settings.js";

const channelInfo = {
  footer: `Created by ${settings.botName} | Join: ${settings.channel}`
};

// Helper: download media to buffer (no temp files)
async function downloadMediaBuffer(message, mediaType) {
  const stream = await downloadContentFromMessage(message, mediaType);
  let buffer = Buffer.from([]);
  for await (const chunk of stream) {
    buffer = Buffer.concat([buffer, chunk]);
  }
  return buffer;
}

async function tagCommand(sock, chatId, senderId, messageText, replyMessage) {
  const { isSenderAdmin, isBotAdmin } = await isAdmin(sock, chatId, senderId);

  // Bot must be admin
  if (!isBotAdmin) {
    await sock.sendMessage(chatId, { text: "⚠️ Please make the bot an admin first.", ...channelInfo });
    return;
  }

  // If user not admin → send fallback sticker (if exists)
  if (!isSenderAdmin) {
    const stickerPath = path.join("assets", "sticktag.webp");
    if (fs.existsSync(stickerPath)) {
      const stickerBuffer = fs.readFileSync(stickerPath);
      await sock.sendMessage(chatId, { sticker: stickerBuffer });
    } else {
      await sock.sendMessage(chatId, { text: "🚫 Only admins can use the tag command.", ...channelInfo });
    }
    return;
  }

  const groupMetadata = await sock.groupMetadata(chatId);
  const participants = groupMetadata.participants;
  const mentionedJidList = participants.map((p) => p.id);

  try {
    let messageContent = null;

    if (replyMessage) {
      // Handle different media types
      if (replyMessage.imageMessage) {
        const buffer = await downloadMediaBuffer(replyMessage.imageMessage, "image");
        messageContent = {
          image: buffer,
          caption: messageText || replyMessage.imageMessage.caption || "",
          mentions: mentionedJidList
        };
      } else if (replyMessage.videoMessage) {
        const buffer = await downloadMediaBuffer(replyMessage.videoMessage, "video");
        messageContent = {
          video: buffer,
          caption: messageText || replyMessage.videoMessage.caption || "",
          mentions: mentionedJidList
        };
      } else if (replyMessage.documentMessage) {
        const buffer = await downloadMediaBuffer(replyMessage.documentMessage, "document");
        messageContent = {
          document: buffer,
          fileName: replyMessage.documentMessage.fileName || "file",
          caption: messageText || "",
          mentions: mentionedJidList
        };
      } else if (replyMessage.audioMessage) {
        const buffer = await downloadMediaBuffer(replyMessage.audioMessage, "audio");
        messageContent = {
          audio: buffer,
          mimetype: "audio/mp4",
          ptt: true,
          mentions: mentionedJidList
        };
      } else if (replyMessage.conversation || replyMessage.extendedTextMessage) {
        messageContent = {
          text: replyMessage.conversation || replyMessage.extendedTextMessage.text,
          mentions: mentionedJidList
        };
      }
    }

    // If no reply → normal text tag
    if (!messageContent) {
      messageContent = {
        text: messageText || "📢 Attention everyone!",
        mentions: mentionedJidList
      };
    }

    await sock.sendMessage(chatId, { ...messageContent, ...channelInfo });
  } catch (error) {
    console.error("❌ Error in tag command:", error);
    await sock.sendMessage(chatId, { text: "⚠️ Failed to tag group.", ...channelInfo });
  }
}

export default tagCommand;
