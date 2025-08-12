const { isAdmin } = require('../lib/isAdmin');

const channelInfo = {
    footer: "made by Mr Dev Prime"
};

// Function to handle manual promotions via command
async function promoteCommand(sock, chatId, mentionedJids, message) {
    let userToPromote = [];

    // Check for mentioned users
    if (mentionedJids && mentionedJids.length > 0) {
        userToPromote = mentionedJids;
    }
    // Check for replied message
    else if (message.message?.extendedTextMessage?.contextInfo?.participant) {
        userToPromote = [message.message.extendedTextMessage.contextInfo.participant];
    }

    // If no user found through either method
    if (userToPromote.length === 0) {
        await sock.sendMessage(chatId, {
            text: 'Please mention the user or reply to their message to promote!',
            ...channelInfo
        });
        return;
    }

    try {
        await sock.groupParticipantsUpdate(chatId, userToPromote, "promote");

        // Get usernames for each promoted user
        const usernames = userToPromote.map(jid => `@${jid.split('@')[0]}`);

        // Get promoter's name (the bot user in this case)
        const promoterJid = sock.user.id;

        const promotionMessage = `*『 GROUP PROMOTION 』*\n\n` +
            `👥 *Promoted User${userToPromote.length > 1 ? 's' : ''}:*\n` +
            `${usernames.map(name => `• ${name}`).join('\n')}\n\n` +
            `👑 *Promoted By:* @${promoterJid.split('@')[0]}\n\n` +
            `📅 *Date:* ${new Date().toLocaleString()}`;

        await sock.sendMessage(chatId, {
            text: promotionMessage,
            mentions: [...userToPromote, promoterJid],
            ...channelInfo
        });
    } catch (error) {
        console.error('Error in promote command:', error);
        await sock.sendMessage(chatId, {
            text: 'Failed to promote user(s)!',
            ...channelInfo
        });
    }
}

// Function to handle automatic promotion detection
async function handlePromotionEvent(sock, groupId, participants, author) {
    try {
        // Get usernames for promoted participants
        const promotedUsernames = participants.map(jid => `@${jid.split('@')[0]}`);

        let promotedBy;
        let mentionList = [...participants];

        if (author && author.length > 0) {
            const authorJid = author;
            promotedBy = `@${authorJid.split('@')[0]}`;
            mentionList.push(authorJid);
        } else {
            promotedBy = 'System';
        }

        const promotionMessage = `*『 GROUP PROMOTION 』*\n\n` +
            `👥 *Promoted User${participants.length > 1 ? 's' : ''}:*\n` +
            `${promotedUsernames.map(name => `• ${name}`).join('\n')}\n\n` +
            `👑 *Promoted By:* ${promotedBy}\n\n` +
            `📅 *Date:* ${new Date().toLocaleString()}`;

        await sock.sendMessage(groupId, {
            text: promotionMessage,
            mentions: mentionList,
            ...channelInfo
        });
    } catch (error) {
        console.error('Error handling promotion event:', error);
    }
}

module.exports = { promoteCommand, handlePromotionEvent };
