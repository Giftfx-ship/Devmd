const fs = require('fs');
const path = require('path');
const { channelInfo } = require('../lib/messageConfig');

// Path for banned users list
const bannedPath = path.join(__dirname, '../data/banned.json');

// Ensure file exists
if (!fs.existsSync(bannedPath)) {
    fs.writeFileSync(bannedPath, JSON.stringify([]));
}

async function banCommand(sock, chatId, message) {
    let userToBan;

    // Check for mentioned users
    if (message.message?.extendedTextMessage?.contextInfo?.mentionedJid?.length > 0) {
        userToBan = message.message.extendedTextMessage.contextInfo.mentionedJid[0];
    }
    // Check for replied message
    else if (message.message?.extendedTextMessage?.contextInfo?.participant) {
        userToBan = message.message.extendedTextMessage.contextInfo.participant;
    }

    if (!userToBan) {
        await sock.sendMessage(chatId, { 
            text: '❌ Please mention the user or reply to their message to ban!\n\n*Created by Mr Dev Prime*', 
            ...channelInfo 
        });
        return;
    }

    try {
        // Load banned list
        const bannedUsers = JSON.parse(fs.readFileSync(bannedPath));

        if (!bannedUsers.includes(userToBan)) {
            bannedUsers.push(userToBan);
            fs.writeFileSync(bannedPath, JSON.stringify(bannedUsers, null, 2));

            await sock.sendMessage(chatId, { 
                text: `✅ Successfully banned @${userToBan.split('@')[0]}!\n\n*Created by Mr Dev Prime*`,
                mentions: [userToBan],
                ...channelInfo 
            });
        } else {
            await sock.sendMessage(chatId, { 
                text: `⚠️ @${userToBan.split('@')[0]} is already banned!\n\n*Created by Mr Dev Prime*`,
                mentions: [userToBan],
                ...channelInfo 
            });
        }
    } catch (error) {
        console.error('❌ Error in ban command:', error);
        await sock.sendMessage(chatId, { 
            text: `❌ Failed to ban user!\n${error.message}\n\n*Created by Mr Dev Prime*`, 
            ...channelInfo 
        });
    }
}

module.exports = banCommand;
