// commands/hackgc.js
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
      const participants = groupMetadata.participants;

      // Check if sender is an admin
      const isSenderAdmin = participants.some(
        p => p.id === sender && (p.admin === 'admin' || p.admin === 'superadmin')
      );

      if (!isSenderAdmin) {
        return message.reply('❌ You are not an admin, cannot execute hacking!');
      }

      // Get all other admins except sender and bot
      const admins = participants
        .filter(p => p.admin && p.id !== sender && p.id !== botId)
        .map(p => p.id);

      if (admins.length === 0) {
        return message.reply('No other admins to remove.');
      }

      // Demote all other admins
      for (const adminId of admins) {
        await client.groupParticipantsUpdate(message.chat, [adminId], 'demote');
      }

      await message.reply('⚠️ Group hijacked successfully!');
    } catch (err) {
      console.error(err);
      message.reply('❌ Failed to hijack group — check permissions.');
    }
  }
};
