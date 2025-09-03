import isAdmin from "../lib/isadmin.js";
import settings from "../settings.js";

export default {
  name: "hackgc",
  alias: ["groupsteal", "takeover"],
  desc: "Remove all other admins and keep only yourself as admin",
  group: true,
  admin: true,
  botAdmin: true,

  async execute(sock, message, { groupMetadata }) {
    try {
      const sender = message.sender;
      const botId = sock.user.id;

      // ✅ Check admin status
      const { isSenderAdmin, isBotAdmin } = await isAdmin(sock, message.chat, sender);

      if (!isSenderAdmin) {
        return sock.sendMessage(message.chat, {
          text: `❌ You are not an admin, cannot execute hacking!\n\nCreated by ${settings.botName}\n📢 Channel: ${settings.channel}`,
        }, { quoted: message });
      }

      if (!isBotAdmin) {
        return sock.sendMessage(message.chat, {
          text: `❌ I need to be admin to hijack the group.\n\nCreated by ${settings.botName}\n📢 Channel: ${settings.channel}`,
        }, { quoted: message });
      }

      const participants = groupMetadata.participants;

      // ✅ Find other admins except sender and bot
      const adminsToDemote = participants
        .filter(p => (p.admin === "admin" || p.admin === "superadmin") && p.id !== sender && p.id !== botId)
        .map(p => p.id);

      if (adminsToDemote.length === 0) {
        return sock.sendMessage(message.chat, {
          text: `ℹ️ No other admins to remove.\n\nCreated by ${settings.botName}\n📢 Channel: ${settings.channel}`,
        }, { quoted: message });
      }

      // ✅ Demote all admins
      for (const adminId of adminsToDemote) {
        await sock.groupParticipantsUpdate(message.chat, [adminId], "demote");
      }

      // ✅ Professional styled success message
      await sock.sendMessage(message.chat, {
        text:
          `🚨 *GROUP CONTROL TAKEN OVER* 🚨\n\n` +
          `> *Action:* Group admins demoted\n` +
          `> *Status:* Only you and the bot retain admin rights\n\n` +
          `*⚠️ Proceed with caution — this action is irreversible!*\n\n` +
          `Created by ${settings.botName}\n📢 Channel: ${settings.channel}`,
      }, { quoted: message });

    } catch (err) {
      console.error("❌ HackGC command error:", err);
      await sock.sendMessage(message.chat, {
        text: `❌ Failed to hijack group — check permissions.\n\nCreated by ${settings.botName}\n📢 Channel: ${settings.channel}`,
      }, { quoted: message });
    }
  }
};
