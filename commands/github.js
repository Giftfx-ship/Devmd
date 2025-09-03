import moment from "moment-timezone";
import fetch from "node-fetch";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import settings from "../settings.js"; // 🔗 central settings

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default async function githubCommand(sock, chatId, message) {
  try {
    // 🔹 Fetch repo info
    const res = await fetch("https://api.github.com/repos/Giftfx-ship/Devmd");
    if (!res.ok) throw new Error("Error fetching repository data");
    const json = await res.json();

    let txt = `*${settings.botName} GitHub Repo*\n\n`;
    txt += `✩ *Name* : ${json.name}\n`;
    txt += `✩ *Watchers* : ${json.watchers_count}\n`;
    txt += `✩ *Size* : ${(json.size / 1024).toFixed(2)} MB\n`;
    txt += `✩ *Last Updated* : ${moment(json.updated_at).format("DD/MM/YY - HH:mm:ss")}\n`;
    txt += `✩ *URL* : ${json.html_url}\n`;
    txt += `✩ *Forks* : ${json.forks_count}\n`;
    txt += `✩ *Stars* : ${json.stargazers_count}\n\n`;
    txt += `💥 *${settings.botName}*`;

    // 🔹 Image asset
    const imgPath = path.join(__dirname, "../assets/bot_image.jpg");
    const imgBuffer = fs.readFileSync(imgPath);

    await sock.sendMessage(
      chatId,
      {
        image: imgBuffer,
        caption: txt,
      },
      { quoted: message }
    );
  } catch (error) {
    console.error("❌ GitHub command error:", error.message);
    await sock.sendMessage(
      chatId,
      {
        text: `❌ Error fetching repository information.\n\nCreated by ${settings.botName}\n📢 Channel: ${settings.channel}`,
      },
      { quoted: message }
    );
  }
}
