const fs = require('fs').promises;
const path = require('path');
const config = require('../config'); // adjust if your config path differs

module.exports = {
  name: 'menu',
  alias: ['help'],
  description: 'Show bot command list',
  async execute(sock, chatId, message, args) {
    // Hardcoded developer name here - not editable via config
    const developerName = "𝐌𝐑ܮ𝐃𝐄𝐕『ᴾᴿᴵ́ᴹᴱ́』";

    const helpMessage = `
🪐 *「 ${config.botName} 𝕏Ɽ 」* 🪐

╭───❏ *STATS* ❏
│👨‍💻 *Developer:* ${developerName}
│📚 *Library:* Bailey's
│⌨️ *Prefix:* ${config.prefix}
│🛠 *Tools:* 2500
│💽 *RAM:* 24.93GB / 61.79GB
│🖥 *Host:* Linux
│📞 *Contact:* ${config.ownerContactLink}
│🌐 *GitHub:* ${config.github.replace(/^https?:\/\//, '')}
│📢 *Channel:* ${config.channel.replace(/^https?:\/\//, '')}
╰───────────────

🚀 *MAIN COMMANDS*
.menu | .ping | .runtime | .owner | .repo | .source | .grouplink | .blocklist

👑 *GROUP MANAGEMENT*
.promote | .demote | .kick | .add | .mute | .unmute | .lockgc | .unlockgc
.tagall | .hidetag | .warn | .resetwarn | .setppgc | .delppgc
.setnamegc | .setdesc | .invite | .ban | .unban

🎯 *FUN & GAMES*
.joke | .meme | .quote | .trivia | .tictactoe | .dice | .rps | .truth | .dare

🔍 *SEARCH & TOOLS*
.google | .wikipedia | .yts | .weather | .time | .translate | .imdb | .covid | .currency | .calc

🎵 *MEDIA & DOWNLOADS*
.play | .song | .video | .instagram | .facebook | .twitter | .tiktok | .pinterest | .soundcloud | .github

🛡 *OWNER ONLY*
.broadcast | .setppbot | .delppbot | .join | .leave | .eval | .exec | .shutdown | .restart

> © 2025 ${config.botName} | ${developerName}
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
