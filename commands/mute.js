const isAdmin = require('../lib/isadmin');

const channelInfo = {
    footer: "Created by Mr Dev Prime"
};

async function muteCommand(sock, chatId, senderId, durationInMinutes) {
    console.log(`Attempting to mute the group for ${durationInMinutes} minutes.`);

    const { isSenderAdmin, isBotAdmin } = await isAdmin(sock, chatId, senderId);
    if (!isBotAdmin) {
        await sock.sendMessage(chatId, { text: 'Please make the bot an admin first.', ...channelInfo });
        return;
    }

    if (!isSenderAdmin) {
        await sock.sendMessage(chatId, { text: 'Only group admins can use the mute command.', ...channelInfo });
        return;
    }

    const durationInMilliseconds = durationInMinutes * 60 * 1000;
    try {
        await sock.groupSettingUpdate(chatId, 'announcement'); // Mute the group
        await sock.sendMessage(chatId, { text: `The spacecraft has been hibernated for: ${durationInMinutes} minutes.`, ...channelInfo });

        setTimeout(async () => {
            await sock.groupSettingUpdate(chatId, 'not_announcement'); // Unmute after the duration
            await sock.sendMessage(chatId, { text: 'The spacecraft is now alive!', ...channelInfo });
        }, durationInMilliseconds);
    } catch (error) {
        console.error('Error muting/unmuting the group:', error);
        await sock.sendMessage(chatId, { text: 'An error occurred while muting/unmuting the group. Please try again.', ...channelInfo });
    }
}

module.exports = muteCommand;
