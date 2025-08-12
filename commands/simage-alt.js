// commands/simage-alt.js
const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
const { exec } = require('child_process');
const fs = require('fs');

let ffmpeg;
try {
    ffmpeg = require('ffmpeg-static'); // safer import
} catch (err) {
    console.error("⚠ ffmpeg-static is not installed. Run: npm install ffmpeg-static");
    ffmpeg = null;
}

async function simageCommand(sock, quotedMessage, chatId) {
    try {
        if (!quotedMessage?.stickerMessage) {
            await sock.sendMessage(chatId, { text: 'Please reply to a sticker!' });
            return;
        }

        if (!ffmpeg) {
            await sock.sendMessage(chatId, { text: 'FFmpeg is missing. Install it with: npm install ffmpeg-static' });
            return;
        }

        const stream = await downloadContentFromMessage(quotedMessage.stickerMessage, 'sticker');
        const buffer = [];
        for await (const chunk of stream) buffer.push(chunk);
        const stickerPath = './temp_sticker.webp';
        fs.writeFileSync(stickerPath, Buffer.concat(buffer));

        const imagePath = './temp_image.png';
        exec(`"${ffmpeg}" -i ${stickerPath} ${imagePath}`, async (err) => {
            if (err) {
                console.error(err);
                await sock.sendMessage(chatId, { text: 'Error converting sticker to image.' });
                return;
            }

            const imageBuffer = fs.readFileSync(imagePath);
            await sock.sendMessage(chatId, { image: imageBuffer });

            // Clean up
            fs.unlinkSync(stickerPath);
            fs.unlinkSync(imagePath);
        });

    } catch (error) {
        console.error(error);
        await sock.sendMessage(chatId, { text: 'An error occurred while processing your sticker.' });
    }
}

module.exports = simageCommand;
