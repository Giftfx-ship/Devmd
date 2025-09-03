// commands/sticker.js
import { downloadMediaMessage } from "@whiskeysockets/baileys";
import { exec } from "child_process";
import fs from "fs";
import path from "path";
import settings from "../settings.js";
import webp from "node-webpmux";
import crypto from "crypto";
import { promisify } from "util";

const execPromise = promisify(exec);

async function stickerCommand(sock, chatId, message) {
  const messageToQuote = message;
  let targetMessage = message;

  // Handle reply case
  if (message.message?.extendedTextMessage?.contextInfo?.quotedMessage) {
    const quotedInfo = message.message.extendedTextMessage.contextInfo;
    targetMessage = {
      key: {
        remoteJid: chatId,
        id: quotedInfo.stanzaId,
        participant: quotedInfo.participant,
      },
      message: quotedInfo.quotedMessage,
    };
  }

  const mediaMessage =
    targetMessage.message?.imageMessage ||
    targetMessage.message?.videoMessage ||
    targetMessage.message?.documentMessage;

  if (!mediaMessage) {
    await sock.sendMessage(
      chatId,
      {
        text: `❌ Please reply to or send an image/video with *.${settings.prefix}sticker* as caption.`,
        contextInfo: {
          forwardingScore: 999,
          isForwarded: true,
          forwardedNewsletterMessageInfo: {
            newsletterJid: `${settings.channel}@newsletter`,
            newsletterName: settings.botName,
            serverMessageId: -1,
          },
        },
      },
      { quoted: messageToQuote }
    );
    return;
  }

  try {
    const mediaBuffer = await downloadMediaMessage(
      targetMessage,
      "buffer",
      {},
      {
        logger: undefined,
        reuploadRequest: sock.updateMediaMessage,
      }
    );

    if (!mediaBuffer) {
      await sock.sendMessage(chatId, {
        text: "❌ Failed to download media. Try again.",
      });
      return;
    }

    // Create tmp dir
    const tmpDir = path.join(process.cwd(), "tmp");
    if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

    const tempInput = path.join(tmpDir, `input_${Date.now()}`);
    const tempOutput = path.join(tmpDir, `sticker_${Date.now()}.webp`);

    fs.writeFileSync(tempInput, mediaBuffer);

    // Animated or not?
    const isAnimated =
      mediaMessage.mimetype?.includes("gif") ||
      mediaMessage.mimetype?.includes("video") ||
      mediaMessage.seconds > 0;

    const ffmpegCommand = isAnimated
      ? `ffmpeg -i "${tempInput}" -vf "scale=512:512:force_original_aspect_ratio=decrease,fps=15,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=#00000000" -c:v libwebp -preset default -loop 0 -vsync 0 -pix_fmt yuva420p -quality 75 -compression_level 6 "${tempOutput}"`
      : `ffmpeg -i "${tempInput}" -vf "scale=512:512:force_original_aspect_ratio=decrease,format=rgba,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=#00000000" -c:v libwebp -preset default -loop 0 -vsync 0 -pix_fmt yuva420p -quality 75 -compression_level 6 "${tempOutput}"`;

    await execPromise(ffmpegCommand);

    const webpBuffer = fs.readFileSync(tempOutput);

    // Metadata
    const img = new webp.Image();
    await img.load(webpBuffer);

    const json = {
      "sticker-pack-id": crypto.randomBytes(16).toString("hex"),
      "sticker-pack-name": settings.packname || settings.botName,
      emojis: ["🤖"],
    };

    const exifAttr = Buffer.from([
      0x49, 0x49, 0x2a, 0x00, 0x08, 0x00, 0x00, 0x00, 0x01, 0x00, 0x41, 0x57,
      0x07, 0x00, 0x00, 0x00, 0x00, 0x00, 0x16, 0x00, 0x00, 0x00,
    ]);
    const jsonBuffer = Buffer.from(JSON.stringify(json), "utf8");
    const exif = Buffer.concat([exifAttr, jsonBuffer]);
    exif.writeUIntLE(jsonBuffer.length, 14, 4);
    img.exif = exif;

    const finalBuffer = await img.save(null);

    await sock.sendMessage(
      chatId,
      { sticker: finalBuffer },
      { quoted: messageToQuote }
    );

    // Cleanup
    [tempInput, tempOutput].forEach((f) => {
      if (fs.existsSync(f)) fs.unlinkSync(f);
    });
  } catch (error) {
    console.error("❌ Sticker error:", error);
    await sock.sendMessage(chatId, {
      text: "⚠️ Failed to create sticker. Try again later.",
    });
  }
}

export default stickerCommand;
