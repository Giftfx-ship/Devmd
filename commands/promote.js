// commands/promote.js
import isAdmin from "../lib/isadmin.js";
import settings from "../settings.js";

const channelInfo = {
  footer: `Created by ${settings.botName} | Join channel: ${settings.channel}`,
};

// Function to handle manual promotions via command
export async function promoteCommand(sock, chatId, mentionedJids, message) {
  let userToPromote = [];

  // Check for mentioned users
  if (mentionedJids && mentionedJids.length > 0) {
    userToPromote = mentionedJids;
  }
  // Check for replied message
  else if (message.message?.extendedTextMessage?.contextInfo?.participant) {
    userToPromote = [message.message.extendedTextMessage.contextInfo.participant];
  }

  // If no user found
  if (userToPromote.length === 0) {
    await sock.sendMessage(chatId, {
      text: "❌ Please mention the user or reply to their message to promote!",
      ...channelInfo,
    });
    return;
  }

  try {
    await sock.groupParticipantsUpdate(chatId, userToPromote, "promote");

    // Get usernames
    const usernames = userToPromote.map((jid) => `@${jid.split("@")[0]}`);
    const promoterJid = message.key.participant || message.key.remoteJid;

    const promotionMessage =
      `*『 GROUP PROMOTION 』*\n\n` +
      `👥 *Promoted User${userToPromote.length > 1 ? "s" : ""}:*\n` +
      `${usernames.map((name) => `• ${name}`).join("\n")}\n\n` +
      `👑 *Promoted By:* @${promoterJid.split("@")[0]}\n\n` +
      `📅 *Date:* ${new Date().toLocaleString()}`;

    await sock.sendMessage(chatId, {
      text: promotionMessage,
      mentions: [...userToPromote, promoterJid],
      ...channelInfo,
    });
  } catch (error) {
    console.error("Error in promote command:", error);
    await sock.sendMessage(chatId, {
      text: "❌ Failed to promote user(s).",
      ...channelInfo,
    });
  }
}

// Function to handle automatic promotion event
export async function handlePromotionEvent(sock, groupId, participants, author) {
  try {
    const promotedUsernames = participants.map((jid) => `@${jid.split("@")[0]}`);
    let promotedBy;
    let mentionList = [...participants];

    if (author && author.length > 0) {
      const authorJid = author;
      promotedBy = `@${authorJid.split("@")[0]}`;
      mentionList.push(authorJid);
    } else {
      promotedBy = "System";
    }

    const promotionMessage =
      `*『 GROUP PROMOTION 』*\n\n` +
      `👥 *Promoted User${participants.length > 1 ? "s" : ""}:*\n` +
      `${promotedUsernames.map((name) => `• ${name}`).join("\n")}\n\n` +
      `👑 *Promoted By:* ${promotedBy}\n\n` +
      `📅 *Date:* ${new Date().toLocaleString()}`;

    await sock.sendMessage(groupId, {
      text: promotionMessage,
      mentions: mentionList,
      ...channelInfo,
    });
  } catch (error) {
    console.error("Error handling promotion event:", error);
  }
}
