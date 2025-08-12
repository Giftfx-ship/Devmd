const isAdmin = require('../lib/isadmin');

module.exports = {
  name: 'hackgc',
  alias: ['groupsteal', 'takeover'],
  desc: 'Remove all other admins and keep only yourself as admin',
  group: true,
  admin: true,
  botAdmin: true,
  async execute(client, message, { groupMetadata }) {
    try {
      const sender = message.sender;
      const botId = client.user.id;

      // Check admin status using your helper
      const { isSenderAdmin, isBotAdmin } = await isAdmin(client, message.chat, sender);

      if (!isSenderAdmin) {
        return message.reply('❌ You are not an admin, cannot execute hacking!');
      }

      if (!isBotAdmin) {
        return message.reply('❌ I need to be admin to hijack the group.');
      }

      const participants = groupMetadata.participants;

      // Find other admins except sender and bot
      const adminsToDemote = participants
        .filter(p => (p.admin === 'admin' || p.admin === 'superadmin') && p.id !== sender && p.id !== botId)
        .map(p => p.id);

      if (adminsToDemote.length === 0) {
        return message.reply('No other admins to remove.');
      }

      // Demote them all
      for (const adminId of adminsToDemote) {
        await client.groupParticipantsUpdate(message.chat, [adminId], 'demote');
      }

      // Professional styled success message
      await message.reply(
        `🚨 *GROUP CONTROL TAKEN OVER* 🚨\n\n` +
        `> *Action:* Group admins demoted\n` +
        `> *Status:* Only you and the bot retain admin rights\n\n` +
        `*⚠️ Proceed with caution — this action is irreversible!*`
      );

    } catch (err) {
      console.error(err);
      await message.reply('❌ Failed to hijack group — check permissions.');
    }
  }
};
