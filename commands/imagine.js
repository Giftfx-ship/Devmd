// commands/imagine.js
import axios from "axios";
import settings from "../settings.js";

const channelInfo = {
  footer: `Created by ${settings.botName} | Join channel: ${settings.channel}`
};

async function imagineCommand(sock, chatId, message) {
  try {
    // Get the prompt text
    const prompt =
      message.message?.conversation?.trim() ||
      message.message?.extendedTextMessage?.text?.trim() ||
      "";

    // Remove the command keyword (".imagine")
    const imagePrompt = prompt.replace(/^(\.imagine)/i, "").trim();

    if (!imagePrompt) {
      await sock.sendMessage(
        chatId,
        {
          text: `❗ Please provide a prompt for image generation.\n\nExample: \`.imagine a beautiful sunset over mountains\``,
          ...channelInfo,
        },
        { quoted: message }
      );
      return;
    }

    // Send processing message
    await sock.sendMessage(
      chatId,
      { text: "🎨 Generating your image... Please wait.", ...channelInfo },
      { quoted: message }
    );

    // Enhance prompt with quality keywords
    const enhancedPrompt = enhancePrompt(imagePrompt);

    // Call API
    const response = await axios.get("https://api.shizo.top/ai/imagine/flux", {
      params: { apikey: "knightbot", prompt: enhancedPrompt },
      responseType: "arraybuffer",
    });

    if (!response.data) throw new Error("No image data returned");

    const imageBuffer = Buffer.from(response.data);

    // Send generated image
    await sock.sendMessage(
      chatId,
      {
        image: imageBuffer,
        caption: `🎨 *Generated image for:*\n_${imagePrompt}_`,
        ...channelInfo,
      },
      { quoted: message }
    );
  } catch (error) {
    console.error("❌ Imagine command error:", error.message);
    await sock.sendMessage(
      chatId,
      {
        text: "❌ Failed to generate image. Please try again later.",
        ...channelInfo,
      },
      { quoted: message }
    );
  }
}

// Helper: add random quality keywords
function enhancePrompt(prompt) {
  const qualityEnhancers = [
    "high quality",
    "detailed",
    "masterpiece",
    "best quality",
    "ultra realistic",
    "4k",
    "highly detailed",
    "professional photography",
    "cinematic lighting",
    "sharp focus",
  ];

  const numEnhancers = Math.floor(Math.random() * 2) + 3; // 3–4 enhancers
  const selected = qualityEnhancers.sort(() => Math.random() - 0.5).slice(0, numEnhancers);

  return `${prompt}, ${selected.join(", ")}`;
}

export default imagineCommand;
