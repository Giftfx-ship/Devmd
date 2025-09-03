// commands/ping.js
import { performance } from "perf_hooks";
import settings from "../settings.js";

const channelInfo = {
  footer: `Created by ${settings.botName} | Join channel: ${settings.channel}`,
};

export default {
  name: "ping",
  alias: ["speed", "pong"],
  category: "general",
  desc: "Checks the bot response speed.",
  async run(m, { conn }) {
    try {
      const start = performance.now();
      await m.reply("🏓 *Pinging...*");
      const end = performance.now();
      const speed = (end - start).toFixed(2);

      await m.reply(
        `*Pong!*\n⏱️ Response speed: *${speed} ms*\n\n💠 ${settings.botName}\n${settings.channel}`
      );
    } catch (error) {
      console.error("Error in ping command:", error);
      await m.reply("❌ Failed to check speed. Please try again.");
    }
  },
};
