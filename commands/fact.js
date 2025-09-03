import axios from "axios";
import settings from "../settings.js"; // 🔗 central settings.js

export default async function factCommand(sock, chatId, message) {
  try {
    const response = await axios.get("https://uselessfacts.jsph.pl/random.json?language=en");
    const fact = response.data?.text || "Couldn't fetch a fact this time.";

    await sock.sendMessage(
      chatId,
      {
        text: `🤔 *Random Fact:*\n\n${fact}\n\nCreated by ${settings.botName}\n📢 Channel: ${settings.channel}`,
      },
      { quoted: message }
    );
  } catch (error) {
    console.error("❌ Error fetching fact:", error.message);
    await sock.sendMessage(
      chatId,
      {
        text: `⚠️ Sorry, I couldn't fetch a fact due to network issues.\n\nCreated by ${settings.botName}\n📢 Channel: ${settings.channel}`,
      },
      { quoted: message }
    );
  }
}
