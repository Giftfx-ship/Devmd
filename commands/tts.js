const gTTS = require('gtts');
const fs = require('fs');
const path = require('path');

async function ttsCommand(sock, chatId, text, message, language = 'en') {
    if (!text) {
        await sock.sendMessage(chatId, { text: 'Please provide the text for TTS conversion.' }, { quoted: message });
        return;
    }

    const fileName = `tts-${Date.now()}.mp3`;
    const filePath = path.join(__dirname, '..', 'assets', fileName);

    const gtts = new gTTS(text, language);
    gtts.save(filePath, async function (err) {
        if (err) {
            console.error('TTS save error:', err);
            await sock.sendMessage(chatId, { text: '❌ Error generating TTS audio.' }, { quoted: message });
            return;
        }

        try {
            await sock.sendMessage(chatId, {
                audio: { url: filePath },
                mimetype: 'audio/mpeg'
            }, { quoted: message });
        } catch (sendError) {
            console.error('Error sending TTS audio:', sendError);
            await sock.sendMessage(chatId, { text: '❌ Failed to send TTS audio.' }, { quoted: message });
        }

        // Cleanup the audio file after sending
        fs.unlink(filePath, (unlinkErr) => {
            if (unlinkErr) console.error('Failed to delete TTS audio file:', unlinkErr);
        });
    });
}

module.exports = ttsCommand;
