import fs from "fs/promises";
import path from "path";
import settings from "../settings.js";

export default {
  name: "help",
  alias: ["menu", "cmd"],
  description: "Show all commands grouped by category",

  async execute(sock, msg, args) {
    const chatId = msg.key.remoteJid;

    // ✅ Build the menu text dynamically
    let menuText = `╭────⟪ *${settings.botName} Help Menu* ⟫─────⬣
│ 👑 *Owner:* ${settings.ownerName}
│ 🔗 *Contact:* ${settings.ownerContactLink}
│ ⚙️ *Prefix:* ${settings.prefix}
│ 📢 *Channel:* ${settings.channel}
│ 🧑‍💻 *GitHub:* ${settings.github}
╰───────────────────────────⬣\n`;

    for (const [category, cmds] of Object.entries(settings.commands)) {
      const title = category.charAt(0).toUpperCase() + category.slice(1);
      menuText += `\n📁 *${title} Commands:*\n`;
      cmds.forEach(cmd => {
        menuText += `  ➤ ${settings.prefix}${cmd}\n`;
      });
    }

    menuText += `\n📅 ${new Date().toLocaleString()}\n©️ ${settings.botName} by ${settings.ownerName}`;

    try {
      // ✅ Try to attach bot image
      const imagePath = path.join(process.cwd(), "assets", "bot_image.jpg");
      let imageBuffer = null;

      try {
        imageBuffer = await fs.readFile(imagePath);
      } catch {
        console.log("⚠️ No bot image found, sending text-only menu.");
      }

      if (imageBuffer) {
        await sock.sendMessage(
          chatId,
          { image: imageBuffer, caption: menuText },
          { quoted: msg }
        );
      } else {
        await sock.sendMessage(chatId, { text: menuText }, { quoted: msg });
      }
    } catch (err) {
      console.error("❌ Failed to send help menu:", err);
      await sock.sendMessage(
        chatId,
        { text: "⚠️ Failed to display help menu." },
        { quoted: msg }
      );
    }
  }
};
