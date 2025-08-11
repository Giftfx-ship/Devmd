const fs = require('fs');
const path = require('path');

module.exports = {
    name: 'menu',
    alias: ['help'],
    description: 'Show bot command list',
    async execute(sock, chatId, message) {
        const helpMessage = `
🪐 *「 𝐃𝐄𝐕𝐌𝐃 𝕏Ɽ 」* 🪐

╭───❏ *STATS* ❏
│👨‍💻 *Developer:* 𝐌𝐑ܮ𝐃𝐄𝐕
│📚 *Library:* Bailey's
│⌨️ *Prefix:* .
│🛠 *Tools:* 2500
│💽 *RAM:* 24.93GB / 61.79GB
│🖥 *Host:* Linux
│📞 *Contact:* wa.me/2349164624021
│🌐 *GitHub:* github.com/Giftfx-ship/Devmd
│📢 *Channel:* whatsapp.com/channel/0029VbB3zXu9Gv7LXS62GA1F
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

> © 2025 𝐃𝐄𝐕𝐌𝐃 | 𝐌𝐑ܮ𝐃𝐄𝐕
`;

        try {
            const imagePath = path.join(__dirname, '../assets/bot_image.jpg');
            if (fs.existsSync(imagePath)) {
                const imageBuffer = fs.readFileSync(imagePath);
                await sock.sendMessage(chatId, {
                    image: imageBuffer,
                    caption: helpMessage,
                    contextInfo: {
                        forwardingScore: 1,
                        isForwarded: true,
                        forwardedNewsletterMessageInfo: {
                            newsletterJid: '0029VbB3zXu9Gv7LXS62GA1F@newsletter',
                            newsletterName: '𝐃𝐄𝐕𝐌𝐃 𝕏Ɽ',
                            serverMessageId: -1
                        }
                    }
                }, { quoted: message });
            } else {
                await sock.sendMessage(chatId, { 
                    text: helpMessage,
                    contextInfo: {
                        forwardingScore: 1,
                        isForwarded: true,
                        forwardedNewsletterMessageInfo: {
                            newsletterJid: '0029VbB3zXu9Gv7LXS62GA1F@newsletter',
                            newsletterName: '𝐃𝐄𝐕𝐌𝐃 𝕏Ɽ',
                            serverMessageId: -1
                        }
                    }
                });
            }
        } catch (error) {
            console.error('Error in help command:', error);
            await sock.sendMessage(chatId, { text: helpMessage });
        }
    }
};