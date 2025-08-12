const { bots } = require('../lib/antilink');
const { setAntilink, getAntilink, removeAntilink } = require('../lib/index');
const isAdmin = require('../lib/isAdmin');

async function handleAntilinkCommand(sock, chatId, userMessage, senderId, isSenderAdmin) {
    try {
        if (!isSenderAdmin) {
            await sock.sendMessage(chatId, { text: '```For Group Admins Only!```' });
            return;
        }

        const prefix = '.';
        const args = userMessage.slice(9).toLowerCase().trim().split(' ');
        const action = args[0];

        if (!action) {
            const usage = `\`\`\`ANTILINK SETUP
${prefix}antilink on
${prefix}antilink set delete | kick | warn
${prefix}antilink off
\`\`\`
*Created by: Dev Prime*`;
            await sock.sendMessage(chatId, { text: usage });
            return;
        }

        switch (action) {
            case 'on':
                const existingConfig = await getAntilink(chatId, 'on');
                if (existingConfig?.enabled) {
                    await sock.sendMessage(chatId, { text: '*_Antilink is already ON_*' });
                    return;
                }
                const result = await setAntilink(chatId, 'on', 'delete');
                await sock.sendMessage(chatId, {
                    text: result ? '*_Antilink has been turned ON_*' : '*_Failed to turn on Antilink_*'
                });
                break;

            case 'off':
                await removeAntilink(chatId, 'on');
                await sock.sendMessage(chatId, { text: '*_Antilink has been turned OFF_*' });
                break;

            case 'set':
                if (args.length < 2) {
                    await sock.sendMessage(chatId, {
                        text: `*_Please specify an action: ${prefix}antilink set delete | kick | warn_*`
                    });
                    return;
                }
                const setAction = args[1];
                if (!['delete', 'kick', 'warn'].includes(setAction)) {
                    await sock.sendMessage(chatId, {
                        text: '*_Invalid action. Choose delete, kick, or warn._*'
                    });
                    return;
                }
                const setResult = await setAntilink(chatId, 'on', setAction);
                await sock.sendMessage(chatId, {
                    text: setResult ? `*_Antilink action set to ${setAction}_*` : '*_Failed to set Antilink action_*'
                });
                break;

            case 'get':
                const status = await getAntilink(chatId, 'on');
                const actionConfig = await getAntilink(chatId, 'on');
                await sock.sendMessage(chatId, {
                    text: `*_Antilink Configuration:_*\nStatus: ${status ? 'ON' : 'OFF'}\nAction: ${actionConfig ? actionConfig.action : 'Not set'}\n\n*Created by: Dev Prime*`
                });
                break;

            default:
                await sock.sendMessage(chatId, { text: `*_Use ${prefix}antilink for usage._*\n\n*Created by: Dev Prime*` });
        }
    } catch (error) {
        console.error('Error in antilink command:', error);
        await sock.sendMessage(chatId, { text: '*_Error processing antilink command_*' });
    }
}

async function handleLinkDetection(sock, chatId, message, userMessage, senderId) {
    const config = await getAntilink(chatId, 'on'); // FIXED: use real getter
    if (!config || !config.enabled) return;

    let shouldDelete = false;

    const linkPatterns = {
        whatsappGroup: /chat\.whatsapp\.com\/[A-Za-z0-9]{20,}/,
        whatsappChannel: /wa\.me\/channel\/[A-Za-z0-9]{20,}/,
        telegram: /t\.me\/[A-Za-z0-9_]+/,
        allLinks: /https?:\/\/[^\s]+/,
    };

    if (linkPatterns.whatsappGroup.test(userMessage) ||
        linkPatterns.whatsappChannel.test(userMessage) ||
        linkPatterns.telegram.test(userMessage) ||
        linkPatterns.allLinks.test(userMessage)) {
        shouldDelete = true;
    }

    if (shouldDelete) {
        const quotedMessageId = message.key.id;
        const quotedParticipant = message.key.participant || senderId;

        try {
            await sock.sendMessage(chatId, {
                delete: { remoteJid: chatId, fromMe: false, id: quotedMessageId, participant: quotedParticipant },
            });
        } catch (error) {
            console.error('Failed to delete message:', error);
        }

        const mentionedJidList = [senderId];
        await sock.sendMessage(chatId, {
            text: `Warning! @${senderId.split('@')[0]}, posting links is not allowed.\n\n*Created by: Dev Prime*`,
            mentions: mentionedJidList
        });
    }
}

module.exports = {
    handleAntilinkCommand,
    handleLinkDetection,
};
