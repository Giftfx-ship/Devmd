// commands/viewonce.js
import { downloadContentFromMessage } from "@whiskeysockets/baileys";

async function viewonceCommand(sock, chatId, message) {
  try {
    // Extract quoted message
    const quoted = message.message?.extendedTextMessage?.contextInfo?.quotedMessage;

    if (!quoted) {
      await sock.sendMessage(
        chatId,
        { text: "❌ Please reply to a view-once image or video." },
        { quoted: message }
      );
      return;
    }

    // Unwrap if it's a viewOnce wrapper
    const viewOnce = quoted.viewOnceMessageV2 || quoted.viewOnceMessageV2Extension;
    const actualMsg = viewOnce ? viewOnce.message : quoted;

    const quotedImage = actualMsg?.imageMessage;
    const quotedVideo = actualMsg?.videoMessage;

    if (quotedImage) {
      // Download the image
      const stream = await downloadContentFromMessage(quotedImage, "image");
      let buffer = Buffer.from([]);
      for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk]);

      await sock.sendMessage(
        chatId,
        { image: buffer, caption: quotedImage.caption || "", fileName: "media.jpg" },
        { quoted: message }
      );
    } else if (quotedVideo) {
      // Download the video
      const stream = await downloadContentFromMessage(quotedVideo, "video");
      let buffer = Buffer.from([]);
      for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk]);

      await sock.sendMessage(
        chatId,
        { video: buffer, caption: quotedVideo.caption || "", fileName: "media.mp4" },
        { quoted: message }
      );
    } else {
      await sock.sendMessage(
        chatId,
        { text: "❌ That is not a view-once media." },
        { quoted: message }
      );
    }
  } catch (err) {
    console.error("Error in viewonceCommand:", err);
    await sock.sendMessage(
      chatId,
      { text: "⚠️ Failed to retrieve view-once media." },
      { quoted: message }
    );
  }
}

export default viewonceCommand;
