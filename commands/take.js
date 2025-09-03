// commands/take.js
import { downloadMediaMessage } from "@whiskeysockets/baileys";
import webp from "node-webpmux";
import crypto from "crypto";
import settings from "../settings.js";

async function takeCommand(sock, chatId, message, args) {
  try {
    // Ensure the message is a reply to a sticker
    const quotedMsg = message.message?.extendedTextMessage?.contextInfo?.quotedMessage;
    if (!quotedMsg?.stickerMessage) {
      await sock.sendMessage(
        chatId,
        { text: "❌ Please reply to a sticker with `.take <packname>`" },
        { quoted: message }
      );
      return;
    }

    // Use custom packname or fallback to bot name from settings
    const packname = args.length ? args.join(" ") : settings.botName || "MRDEV";

    // Download sticker buffer
    const stickerBuffer = await downloadMediaMessage(
      { message: quotedMsg },
      "buffer",
      {},
      { logger: console, reuploadRequest: sock.updateMediaMessage }
    );

    if (!stickerBuffer) {
      await sock.sendMessage(chatId, { text: "❌ Failed to download sticker" }, { quoted: message });
      return;
    }

    // Load sticker into webpmux
    const img = new webp.Image();
    await img.load(stickerBuffer);

    // Metadata
    const json = {
      "sticker-pack-id": crypto.randomBytes(16).toString("hex"),
      "sticker-pack-name": packname,
      "emojis": ["🤖"]
    };

    // Build EXIF header
    const exifAttr = Buffer.from([
      0x49, 0x49, 0x2A, 0x00, 0x08, 0x00, 0x00, 0x00,
      0x01, 0x00, 0x41, 0x57, 0x07, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x16, 0x00, 0x00, 0x00
    ]);
    const jsonBuffer = Buffer.from(JSON.stringify(json), "utf8");
    const exif = Buffer.concat([exifAttr, jsonBuffer]);
    exif.writeUIntLE(jsonBuffer.length, 14, 4);

    img.exif = exif;

    // Save back with metadata
    const finalBuffer = await img.save(null);

    // Send sticker
    await sock.sendMessage(chatId, { sticker: finalBuffer }, { quoted: message });

  } catch (error) {
    console.error("❌ Error in take command:", error);
    await sock.sendMessage(chatId, { text: "❌ Error processing sticker" }, { quoted: message });
  }
}

export default takeCommand;
