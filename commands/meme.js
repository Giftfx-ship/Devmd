// commands/meme.js
import fetch from "node-fetch";
import settings from "../settings.js";

const channelInfo = {
  contextInfo: {
    forwardingScore: 1,
    isForwarded: true,
    forwardedNewsletterMessageInfo: {
      newsletterJid: "120363161513685998@newsletter", // your channel JID
      newsletterName: settings.botName,
      serverMessageId: -1,
    },
  },
};

async function memeCommand(sock, chatId, message) {
  try {
    const response = await fetch(
      "https://shizoapi.onrender.com/api/memes/cheems?apikey=shizo"
    );

    // Validate API response
    if (!response.ok) throw new Error(`API error: ${response.status}`);

    const contentType = response.headers.get("content-type");

    if (contentType && contentType.includes("image")) {
      const imageBuffer = await response.buffer();

      const buttons = [
        { buttonId: ".meme", buttonText: { displayText: "🎭 Another Meme" }, type: 1 },
        { buttonId: ".joke", buttonText: { displayText: "😄 Joke" }, type: 1 },
      ];

      await sock.sendMessage(
        chatId,
        {
          image: imageBuffer,
          caption: `🐕 Here's your Cheems meme!\n\n🔗 ${settings.channel}`,
          buttons,
          headerType: 1,
          ...channelInfo,
        },
        { quoted: message }
      );
    } else {
      throw new Error("Invalid response type from API (not an image)");
    }
  } catch (error) {
    console.error("❌ Meme command error:", error);
    await sock.sendMessage(
      chatId,
      {
        text: "❌ Failed to fetch meme. Please try again later.",
        ...channelInfo,
      },
      { quoted: message }
    );
  }
}

export default memeCommand;
