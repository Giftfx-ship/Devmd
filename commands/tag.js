const isAdmin = require('../lib/isadmin');
const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
const fs = require('fs');
const path = require('path');

async function downloadMediaMessage(message, mediaType) {
    // Ensure temp directory exists
    const tempDir = path.join(__dirname, '../temp');
    if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
    }

    const stream = await downloadContentFromMessage(message, mediaType);
    let buffer = Buffer.from([]);
    for await (const chunk of stream) {
        buffer = Buffer.concat([buffer, chunk]);
    }

    const filePath = path.join(tempDir, `${Date.now()}.${mediaType}`);
    fs.writeFileSync(filePath, buffer);
    return filePath;
}

async function tagCommand(sock, chatId, senderId, messageText, replyMessage) {
    const { isSenderAdmin, isBotAdmin } = await isAdmin(sock, chatId, senderId);

    if (!isBotAdmin) {
        await sock.sendMessage(chatId, { text: 'Please make the bot an admin first.' });
        return;
    }

    if (!isSenderAdmin) {
        const stickerPath = './assets/sticktag.webp';  // Path to your sticker
        if (fs.existsSync(stickerPath)) {
            const stickerBuffer = fs.readFileSync(stickerPath);
            await sock.sendMessage(chatId, { sticker: stickerBuffer });
        }
        return;
    }

    const groupMetadata = await sock.groupMetadata(chatId);
    const participants = groupMetadata.participants;
    const mentionedJidList = participants.map(p => p.id);

    try {
        if (replyMessage) {
            let messageContent = {};

            // Handle image messages
            if (replyMessage.imageMessage) {
                const filePath = await downloadMediaMessage(replyMessage, 'image');
                const imageBuffer = fs.readFileSync(filePath);

                messageContent = {
                    image: imageBuffer,
                    caption: messageText || replyMessage.imageMessage.caption || '',
                    mentions: mentionedJidList
                };

                // Clean up
                fs.unlinkSync(filePath);
            }
            // Handle video messages
            else if (replyMessage.videoMessage) {
                const filePath = await downloadMediaMessage(replyMessage, 'video');
                const videoBuffer = fs.readFileSync(filePath);

                messageContent = {
                    video: videoBuffer,
                    caption: messageText || replyMessage.videoMessage.caption || '',
                    mentions: mentionedJidList
                };

                fs.unlinkSync(filePath);
            }
            // Handle text messages
            else if (replyMessage.conversation || replyMessage.extendedTextMessage) {
                messageContent = {
                    text: replyMessage.conversation || replyMessage.extendedTextMessage.text,
                    mentions: mentionedJidList
                };
            }
            // Handle document messages
            else if (replyMessage.documentMessage) {
                const filePath = await downloadMediaMessage(replyMessage, 'document');
                const docBuffer = fs.readFileSync(filePath);

                messageContent = {
                    document: docBuffer,
                    fileName: replyMessage.documentMessage.fileName || 'file',
                    caption: messageText || '',
                    mentions: mentionedJidList
                };

                fs.unlinkSync(filePath);
            }

            if (Object.keys(messageContent).length > 0) {
                await sock.sendMessage(chatId, messageContent);
            }
        } else {
            await sock.sendMessage(chatId, {
                text: messageText || "Tagged message",
                mentions: mentionedJidList
            });
        }
    } catch (error) {
        console.error('Error in tag command:', error);
        await sock.sendMessage(chatId, { text: 'An error occurred while tagging the group.' });
    }
}

module.exports = tagCommand;
