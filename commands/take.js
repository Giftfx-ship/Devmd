const fs = require('fs');
const path = require('path');
const { downloadMediaMessage } = require('@whiskeysockets/baileys');
const webp = require('node-webpmux');
const crypto = require('crypto');

async function takeCommand(sock, chatId, message, args) {
    try {
        // Check if message is a reply to a sticker
        const quotedMessage = message.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        if (!quotedMessage?.stickerMessage) {
            await sock.sendMessage(chatId, { text: '❌ Please reply to a sticker with .take <packname>' }, { quoted: message });
            return;
        }

        // Get the packname from args or use default
        const packname = args.length ? args.join(' ') : 'MRDEV';

        // Download the sticker media buffer correctly
        const stickerBuffer = await downloadMediaMessage(
            quotedMessage.stickerMessage,
            'buffer',
            {},
            {
                logger: console,
                reuploadRequest: sock.updateMediaMessage
            }
        );

        if (!stickerBuffer) {
            await sock.sendMessage(chatId, { text: '❌ Failed to download sticker' }, { quoted: message });
            return;
        }

        // Add metadata using webpmux
        const img = new webp.Image();
        await img.load(stickerBuffer);

        // Create metadata json
        const json = {
            'sticker-pack-id': crypto.randomBytes(16).toString('hex'),
            'sticker-pack-name': packname,
            'emojis': ['🤖']
        };

        // Create exif buffer header + json
        const exifAttr = Buffer.from([
            0x49,0x49,0x2A,0x00,0x08,0x00,0x00,0x00,
            0x01,0x00,0x41,0x57,0x07,0x00,0x00,0x00,
            0x00,0x00,0x16,0x00,0x00,0x00
        ]);
        const jsonBuffer = Buffer.from(JSON.stringify(json), 'utf8');
        const exif = Buffer.concat([exifAttr, jsonBuffer]);
        exif.writeUIntLE(jsonBuffer.length, 14, 4);

        img.exif = exif;

        const finalBuffer = await img.save(null);

        // Send the new sticker with metadata
        await sock.sendMessage(chatId, {
            sticker: finalBuffer
        }, { quoted: message });

    } catch (error) {
        console.error('Error in take command:', error);
        await sock.sendMessage(chatId, { text: '❌ Error processing sticker' }, { quoted: message });
    }
}

module.exports = takeCommand;
