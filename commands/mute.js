// commands/mute.js
import isAdmin from "../lib/isadmin.js";
import settings from "../settings.js";

const channelInfo = {
  footer: `Created by ${settings.botName} | Join channel: ${settings.channel}`,
};

async function muteCommand(sock, chatId, senderId, durationInMinutes) {
  console.log(`Attempting to mute group ${chatId} for ${durationInMinutes} minutes.`);

  try {
    // Validate input
    if (!durationInMinutes || isNaN(durationInMinutes) || durationInMinutes <= 0) {
      await sock.sendMessage(chatId, {
        text: "⚠️ Please provide a valid duration in minutes. Example: `.mute 10`",
        ...channelInfo,
      });
      return;
    }

    const { isSenderAdmin, isBotAdmin } = await isAdmin(sock, chatId, senderId);

    if (!isBotAdmin) {
      await sock.sendMessage(chatId, {
        text: "❌ Please make the bot an admin first.",
        ...channelInfo,
      });
      return;
    }

    if (!isSenderAdmin) {
      await sock.sendMessage(chatId, {
        text: "❌ Only group admins can use the mute command.",
        ...channelInfo,
      });
      return;
    }

    const durationInMilliseconds = durationInMinutes * 60 * 1000;

    // Mute group
    await sock.groupSettingUpdate(chatId, "announcement");
    await sock.sendMessage(chatId, {
      text: `🔇 The group has been muted for *${durationInMinutes} minute(s)*.`,
      ...channelInfo,
    });

    // Schedule unmute
    setTimeout(async () => {
      try {
        await sock.groupSettingUpdate(chatId, "not_announcement");
        await sock.sendMessage(chatId, {
          text: "🔊 The group is now unmuted!",
          ...channelInfo,
        });
      } catch (err) {
        console.error("Error unmuting group:", err);
      }
    }, durationInMilliseconds);
  } catch (error) {
    console.error("❌ Error in mute command:", error);
    await sock.sendMessage(chatId, {
      text: "❌ An error occurred while muting/unmuting the group. Please try again.",
      ...channelInfo,
    });
  }
}

export default muteCommand;
