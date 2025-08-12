async function clearCommand(sock, chatId) {
    try {
        const message = await sock.sendMessage(chatId, { text: '🧹 Clearing bot messages...\n\n© Created by Mr Dev Prime' });
        const messageKey = message.key; // Get the key of the message the bot just sent
        
        // Now delete the bot's message
        await sock.sendMessage(chatId, { delete: messageKey });
        
    } catch (error) {
        console.error('Error clearing messages:', error);
        await sock.sendMessage(chatId, { text: '❌ An error occurred while clearing messages.\n\n© Created by Mr Dev Prime' });
    }
}

module.exports = { clearCommand };
