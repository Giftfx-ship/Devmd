// commands/tts.js
import gTTS from "gtts";
import fs from "fs";
import path from "path";

async function ttsCommand(sock, chatId, text, message, language = "en") {
  if (!text) {
    await sock.sendMessage(
      chatId,
      { text: "❌ Please provide the text for TTS conversion." },
      { quoted: message }
    );
    return;
  }

  // Ensure assets folder exists
  const assetsDir = path.resolve(process.cwd(), "assets");
  if (!fs.existsSync(assetsDir)) {
    fs.mkdirSync(assetsDir, { recursive: true });
  }

  const fileName = `tts-${Date.now()}.mp3`;
  const filePath = path.join(assetsDir, fileName);

  const gtts = new gTTS(text, language);

  gtts.save(filePath, async (err) => {
    if (err) {
      console.error("TTS save error:", err);
      await sock.sendMessage(
        chatId,
        { text: "❌ Error generating TTS audio." },
        { quoted: message }
      );
      return;
    }

    try {
      // Load file into buffer
      const audioBuffer = fs.readFileSync(filePath);

      await sock.sendMessage(
        chatId,
        {
          audio: audioBuffer,
          mimetype: "audio/mpeg",
          ptt: false // set true if you want it as a voice note
        },
        { quoted: message }
      );
    } catch (sendError) {
      console.error("Error sending TTS audio:", sendError);
      await sock.sendMessage(
        chatId,
        { text: "❌ Failed to send TTS audio." },
        { quoted: message }
      );
    } finally {
      // Always cleanup
      fs.unlink(filePath, (unlinkErr) => {
        if (unlinkErr) console.error("Failed to delete TTS file:", unlinkErr);
      });
    }
  });
}

export default ttsCommand;
