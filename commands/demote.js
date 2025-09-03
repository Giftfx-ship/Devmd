// commands/demote.js (ESM-ready)

import isAdmin from "../lib/isadmin.js";
import settings from "../settings.js";

const channelInfo = {
  footer: `Created by ${settings.botName} | Join channel: ${settings.channel}`,
};

export async function demoteCommand(sock, chatId, mentionedJids, message) {
  try {
    if (!chatId.endsWith("@g.us")) {
      await sock.sendMessage(chatId, {
        text: "This command can only be used in groups!",
        ...channelInfo,
      });
      return;
    }

    // ✅ Admin checks
    try {
      const adminStatus = await isAdmin(
        sock,
        chatId,
        message.key.participant || message.key.remoteJid
      );

      if (!adminStatus.isBotAdmin) {
        await sock.sendMessage(chatId, {
          text: "❌ Error: Please make the bot an admin first to use this command.",
          ...channelInfo,
        });
        return;
      }

      if (!adminStatus.isSenderAdmin) {
        await sock.sendMessage(chatId, {
          text: "❌ Error: Only group admins can use the demote command.",
          ...channelInfo,
        });
        return;
      }
    } catch (adminError) {
      console.error("Error checking admin status:", adminError);
      await sock.sendMessage(chatId, {
        text: "❌ Error: Please make sure the bot is an admin of this group.",
        ...channelInfo,
      });
      return;
    }

    // ✅ Resolve target user(s)
    let userToDemote = [];

    if (mentionedJids && mentionedJids.length > 0) {
      userToDemote = mentionedJids;
    } else if (message.message?.extendedTextMessage?.contextInfo?.participant) {
      userToDemote = [message.message.extendedTextMessage.contextInfo.participant];
    }

    if (userToDemote.length === 0) {
      await sock.sendMessage(chatId, {
        text: "❌ Error: Please mention the user or reply to their message to demote!",
        ...channelInfo,
      });
      return;
    }

    await new Promise((resolve) => setTimeout(resolve, 1000));

    // ✅ Perform demotion
    await sock.groupParticipantsUpdate(chatId, userToDemote, "demote");

    const usernames = userToDemote.map((jid) => `@${jid.split("@")[0]}`);

    await new Promise((resolve) => setTimeout(resolve, 1000));

    const demotionMessage =
      `*『 GROUP DEMOTION 』*\n\n` +
      `👤 *Demoted User${userToDemote.length > 1 ? "s" : ""}:*\n` +
      `${usernames.map((name) => `• ${name}`).join("\n")}\n\n` +
      `👑 *Demoted By:* @${
        message.key.participant
          ? message.key.participant.split("@")[0]
          : message.key.remoteJid.split("@")[0]
      }\n\n` +
      `📅 *Date:* ${new Date().toLocaleString()}`;

    await sock.sendMessage(chatId, {
      text: demotionMessage,
      mentions: [...userToDemote, message.key.participant || message.key.remoteJid],
      ...channelInfo,
    });
  } catch (error) {
    console.error("Error in demote command:", error);

    if (error?.data === 429) {
      // ✅ Handle rate limit
      await new Promise((resolve) => setTimeout(resolve, 2000));
      try {
        await sock.sendMessage(chatId, {
          text: "❌ Rate limit reached. Please try again in a few seconds.",
          ...channelInfo,
        });
      } catch (retryError) {
        console.error("Error sending retry message:", retryError);
      }
    } else {
      try {
        await sock.sendMessage(chatId, {
          text:
            "❌ Failed to demote user(s). Make sure the bot is admin and has sufficient permissions.",
          ...channelInfo,
        });
      } catch (sendError) {
        console.error("Error sending error message:", sendError);
      }
    }
  }
}

export async function handleDemotionEvent(sock, groupId, participants, author) {
  try {
    if (!groupId || !participants) {
      console.log("Invalid groupId or participants:", { groupId, participants });
      return;
    }

    await new Promise((resolve) => setTimeout(resolve, 1000));

    const demotedUsernames = participants.map((jid) => `@${jid.split("@")[0]}`);
    let demotedBy;
    let mentionList = [...participants];

    if (author && author.length > 0) {
      const authorJid = author;
      demotedBy = `@${authorJid.split("@")[0]}`;
      mentionList.push(authorJid);
    } else {
      demotedBy = "System";
    }

    await new Promise((resolve) => setTimeout(resolve, 1000));

    const demotionMessage =
      `*『 GROUP DEMOTION 』*\n\n` +
      `👤 *Demoted User${participants.length > 1 ? "s" : ""}:*\n` +
      `${demotedUsernames.map((name) => `• ${name}`).join("\n")}\n\n` +
      `👑 *Demoted By:* ${demotedBy}\n\n` +
      `📅 *Date:* ${new Date().toLocaleString()}`;

    await sock.sendMessage(groupId, {
      text: demotionMessage,
      mentions: mentionList,
      ...channelInfo,
    });
  } catch (error) {
    console.error("Error handling demotion event:", error);
    if (error?.data === 429) {
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }
}
