// unmute.js
async function unmuteCommand(sock, chatId) {
    try {
        // Change group setting to allow members to send messages
        await sock.groupSettingUpdate(chatId, 'not_announcement');

        // Send confirmation message to the group
        await sock.sendMessage(chatId, {
            text: '✅ The group has been unmuted by Mr Dev ❤️ Let’s talk, guys!'
        });

    } catch (error) {
        console.error('Error unmuting group:', error);
        await sock.sendMessage(chatId, { text: '❌ Failed to unmute the group.' });
    }
}

module.exports = unmuteCommand;
