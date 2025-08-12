const { checkAndHandleAntilink } = require('../lib/antilinkHelper');

module.exports = {
  name: 'antilink',
  alias: ['antilnk', 'antilinks'],
  desc: 'Toggle Anti-Link protection in groups',
  group: true,
  admin: true,
  botAdmin: true,
  async execute(sock, message, { groupMetadata }) {
    const chatId = message.chat;
    const senderId = message.sender;
    const text = message.text || '';

    // Parse command args (e.g., ".antilink on" or ".antilink off")
    const args = text.trim().split(/\s+/);
    const toggle = args[1]?.toLowerCase();

    if (!['on', 'off'].includes(toggle)) {
      return sock.sendMessage(chatId, { 
        text: 'Usage:\n.antilink on\n.antilink off\n\nOnly group admins can toggle Anti-Link.' 
      }, { quoted: message });
    }

    try {
      const result = await checkAndHandleAntilink(sock, chatId, toggle === 'on');

      if (result.success) {
        await sock.sendMessage(chatId, { text: `✅ Anti-Link has been *${toggle}abled*.` }, { quoted: message });
      } else {
        await sock.sendMessage(chatId, { text: `❌ Failed to update Anti-Link setting.` }, { quoted: message });
      }
    } catch (error) {
      console.error('Error toggling antilink:', error);
      await sock.sendMessage(chatId, { text: '❌ An error occurred.' }, { quoted: message });
    }
  }
};
