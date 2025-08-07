const isAdmin = require('../lib/isAdmin');

async function muteCommand(sock, chatId, senderId, durationInMinutes) {
    console.log(`Attempting to mute the group for ${durationInMinutes} minutes.`); // Log for debugging

    const { isSenderAdmin, isBotAdmin } = await isAdmin(sock, chatId, senderId);
    if (!isBotAdmin) {
        await sock.sendMessage(chatId, { text: 'Please make the bot an admin first.' });
        return;
    }

    if (!isSenderAdmin) {
        await sock.sendMessage(chatId, { text: 'Only group admins can use the mute command.' });
        return;
    }

    const durationInMilliseconds = durationInMinutes * 60 * 1000;
    try {
        await sock.groupSettingUpdate(chatId, 'announcement'); // Mute the group
        await sock.sendMessage(chatId, { text: `The spacecraft has been hibernated for: ${durationInMinutes} .` });

        setTimeout(async () => {
            await sock.groupSettingUpdate(chatId, 'not_announcement'); // Unmute after the duration
            await sock.sendMessage(chatId, { text: 'The spacecraft is now alive!' });
        }, durationInMilliseconds);
    } catch (error) {
        console.error('Error muting/unmuting the group:', error);
        await sock.sendMessage(chatId, { text: 'An error occurred while muting/unmuting the group. Please try again.' });
    }
}

module.exports = muteCommand;
