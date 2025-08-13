const fs = require("fs").promises;
const path = require("path");
const config = require("../config");

module.exports = {
  name: "help",
  alias: ["menu", "cmd"],
  description: "Show all commands grouped by category",
  async execute(sock, msg, args) {
    const chatId = msg.key.remoteJid;

    // Generate the command list
    let menuText = `╭────⟪ *${config.botName} Help Menu* ⟫─────⬣
│ 👑 *Owner:* ${config.ownerName}
│ 🔗 *Contact:* ${config.ownerContactLink}
│ ⚙️ *Prefix:* ${config.prefix}
│ 📢 *Channel:* ${config.channel}
│ 🧑‍💻 *GitHub:* ${config.github}
╰───────────────────────────⬣\n`;

    for (const [category, cmds] of Object.entries(config.commands)) {
      const title = category.charAt(0).toUpperCase() + category.slice(1);
      menuText += `\n📁 *${title} Commands:*\n`;
      cmds.forEach(cmd => {
        menuText += `  ➤ ${config.prefix}${cmd}\n`;
      });
    }

    menuText += `\n📅 ${new Date().toLocaleString()}\n©️ ${config.botName} by ${config.ownerName}`;

    try {
      const imagePath = path.join(__dirname, "../assets/bot_image.jpg");
      let imageBuffer;

      try {
        imageBuffer = await fs.readFile(imagePath); // Try to load image
      } catch {
        imageBuffer = null; // Fallback if image missing
      }

      if (imageBuffer) {
        await sock.sendMessage(chatId, {
          image: imageBuffer,
          caption: menuText,
          contextInfo: {
            forwardingScore: 1,
            isForwarded: true,
          }
        }, { quoted: msg });
      } else {
        await sock.sendMessage(chatId, {
          text: menuText,
          contextInfo: {
            forwardingScore: 1,
            isForwarded: true,
          }
        }, { quoted: msg });
      }

    } catch (err) {
      console.error("❌ Failed to send help menu:", err);
      await sock.sendMessage(chatId, {
        text: "⚠️ Failed to display help menu."
      }, { quoted: msg });
    }
  }
};
