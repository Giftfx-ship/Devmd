// commands/help.js
const fs = require("fs").promises;
const path = require("path");
const config = require("../config"); // Make sure this path is correct

module.exports = {
  name: "help",
  alias: ["menu", "cmd"],
  description: "Show bot command list",
  async execute(sock, msg, args) {
    const chatId = msg.key.remoteJid;

    // Build command menu from config.commands
    let commandSections = "";
    for (const [category, cmds] of Object.entries(config.commands)) {
      const categoryName = category.charAt(0).toUpperCase() + category.slice(1);
      commandSections += `\n*${categoryName} Commands:*\n` +
        cmds.map(cmd => `${config.prefix}${cmd}`).join(" | ") + "\n";
    }

    const helpMessage = `
🪐 「 ${config.botName} 」 🪐

╭───❏ BOT INFO ❏
│👨‍💻 Developer: ${config.ownerName}
│⌨️ Prefix: ${config.prefix}
│📞 Contact: ${config.ownerContactLink}
│🌐 GitHub: ${config.github}
│📢 Channel: ${config.channel}
╰───────────────
${commandSections}

> ©️ 2025 ${config.botName} | ${config.ownerName}
`.trim();

    try {
      const imagePath = path.join(__dirname, "../assets/bot_image.jpg");
      let imageExists = false;
      try {
        await fs.access(imagePath);
        imageExists = true;
      } catch { /* No image found, fallback to text */ }

      const contextInfo = {
        forwardingScore: 1,
        isForwarded: true,
      };

      if (imageExists) {
        const imageBuffer = await fs.readFile(imagePath);
        await sock.sendMessage(chatId, {
          image: imageBuffer,
          caption: helpMessage,
          contextInfo
        }, { quoted: msg });
      } else {
        await sock.sendMessage(chatId, {
          text: helpMessage,
          contextInfo
        }, { quoted: msg });
      }

    } catch (err) {
      console.error("❌ Error in help command:", err);
      await sock.sendMessage(chatId, {
        text: helpMessage
      }, { quoted: msg });
    }
  }
};
