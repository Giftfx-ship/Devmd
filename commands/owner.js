const settings = require('../settings');

const channelInfo = {
    footer: "Created by Mr Dev Prime"
};

async function ownerCommand(sock, chatId) {
    const vcard = `
BEGIN:VCARD
VERSION:3.0
FN:${settings.botOwner}
TEL;waid=${settings.ownerNumber}:${settings.ownerNumber}
END:VCARD
`;

    await sock.sendMessage(chatId, {
        contacts: { displayName: settings.botOwner, contacts: [{ vcard }] },
        ...channelInfo
    });
}

module.exports = ownerCommand;
