const sharp = require('sharp');
const fs = require('fs');
const path = require('path');
const Jimp = require('jimp');

async function attpCommand(sock, chatId, message) {
    const userMessage = message.message?.conversation || message.message?.extendedTextMessage?.text || '';
    const text = userMessage.split(' ').slice(1).join(' ');

    if (!text.trim()) {
        await sock.sendMessage(chatId, {
            text: '*Please provide text after the .attp command.*\n\n_Created by: Dev Prime_'
        });
        return;
    }

    const width = 512;
    const height = 512;
    const tempDir = path.join(__dirname, 'temp');
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);

    const stickerPath = path.join(tempDir, `sticker-${Date.now()}.png`);

    try {
        const font = await Jimp.loadFont(Jimp.FONT_SANS_64_BLACK);
        const image = new Jimp(width, height, '#FFFFFF');

        const textWidth = Jimp.measureText(font, text);
        const textHeight = Jimp.measureTextHeight(font, text, width);

        const x = Math.max(0, (width - textWidth) / 2);
        const y = Math.max(0, (height - textHeight) / 2);

        image.print(font, x, y, {
            text,
            alignmentX: Jimp.HORIZONTAL_ALIGN_CENTER,
            alignmentY: Jimp.VERTICAL_ALIGN_MIDDLE
        }, width, height);

        await image.writeAsync(stickerPath);

        const stickerBuffer = await sharp(stickerPath)
            .resize(512, 512, { fit: 'cover' })
            .webp({ quality: 100 })
            .toBuffer();

        await sock.sendMessage(chatId, {
            sticker: stickerBuffer,
            mimetype: 'image/webp',
            packname: 'Andromeda Xʀ Stickers',
            author: 'Dev Prime'
        });

        fs.unlinkSync(stickerPath);
    } catch (error) {
        console.error('Error generating sticker:', error);
        await sock.sendMessage(chatId, {
            text: '*Failed to generate the sticker. Please try again later.*\n\n_Created by: Dev Prime_'
        });
    }
}

module.exports = attpCommand;
