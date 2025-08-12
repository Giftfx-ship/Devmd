// help.js
const fs = require('fs').promises;
const path = require('path');
const config = require('../config');

module.exports = {
  name: 'menu',
  alias: ['help'],
  description: 'Show bot command list',
  async execute(sock, chatId, message, args) {

    let commandSections = '';
    for (const [category, cmds] of Object.entries(config.commands)) {
      const categoryName = category.charAt(0).toUpperCase() + category.slice(1);
      commandSections += `\n*${categoryName} Commands:*\n` +
        cmds.map(cmd => `.${cmd}`).join(' | ') + '\n';
    }

    const helpMessage = `
🪐 *「 ${config.botName} 」* 🪐

╭───❏ *STATS* ❏
│👨‍💻 *Developer:* ${config.ownerName}
│📚 *Library:* Bailey's
│⌨️ *Prefix:* ${config.prefix}
│🖥 *Host:* Linux
│📞 *Contact:* ${config.ownerContactLink}
│🌐 *GitHub:* ${config.github.replace(/^https?:\/\//, '')}
│📢 *Channel:* ${config.channel.replace(/^https?:\/\//, '')}
╰───────────────
${commandSections}

> © 2025 ${config.botName} | ${config.ownerName}
`;

    try {
      const imagePath = path.join(__dirname, '../assets/bot_image.jpg');
      let imageExists = false;
      try {
        await fs.access(imagePath);
        imageExists = true;
      } catch {}

      const contextInfo = {
        forwardingScore: 1,
        isForwarded: true,
        forwardedNewsletterMessageInfo: {
          newsletterJid: `${config.channel.replace(/^https?:\/\//, '')}@newsletter`,
          newsletterName: `${config.botName} 𝕏Ɽ`,
          serverMessageId: -1,
        },
      };

      if (imageExists) {
        const imageBuffer = await fs.readFile(imagePath);
        await sock.sendMessage(chatId, {
          image: imageBuffer,
          caption: helpMessage,
          contextInfo,
        }, { quoted: message });
      } else {
        await sock.sendMessage(chatId, {
          text: helpMessage,
          contextInfo,
        }, { quoted: message });
      }
    } catch (error) {
      console.error('Error in help command:', error);
      await sock.sendMessage(chatId, { text: helpMessage }, { quoted: message });
    }
  }
};
