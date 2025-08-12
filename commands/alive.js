const settings = require("../settings");

async function aliveCommand(sock, chatId, message) {
  try {
    const messageText = `
💠 *${settings.botName}* is online and responsive!
👤 Created by 𝐌𝐑ܮ𝐃𝐄𝐕『ᴾᴿᴵ́ᴹᴱ́』
⚡ Its signals travel faster than light itself.

📢 Channel: ${settings.channel}
    `;

    await sock.sendMessage(chatId, {
      text: messageText.trim(),
      contextInfo: {
        forwardingScore: 999,
        isForwarded: true,
        forwardedNewsletterMessageInfo: {
          newsletterJid: `${settings.channel}@newsletter`,
          newsletterName: settings.botName,
          serverMessageId: -1,
        },
      },
    }, { quoted: message });
  } catch (error) {
    console.error('Error in alive command:', error);
    await sock.sendMessage(chatId, {
      text: `💠 *${settings.botName}* is alive and running!\n📢 Channel: ${settings.channel}`
    }, { quoted: message });
  }
}

module.exports = aliveCommand;
