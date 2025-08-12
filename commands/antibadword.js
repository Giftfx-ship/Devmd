const { handleAntiBadwordCommand } = require('../lib/antibadword');
const isAdminHelper = require('../lib/isAdmin');

const DEV_NAME = 'Mr Dev Prime'; // Hardcoded dev name

async function antibadwordCommand(sock, chatId, message, senderId, isSenderAdmin) {
  try {
    if (!isSenderAdmin) {
      await sock.sendMessage(chatId, { 
        text: `\`\`\`For Group Admins Only!\`\`\`\n\n_Developed by ${DEV_NAME}_` 
      }, { quoted: message });
      return;
    }

    // Extract command argument text after command name
    const text =
      message.message?.conversation ||
      message.message?.extendedTextMessage?.text ||
      '';

    const match = text.split(' ').slice(1).join(' ').trim();

    await handleAntiBadwordCommand(sock, chatId, message, match);
  } catch (error) {
    console.error('Error in antibadword command:', error);
    await sock.sendMessage(chatId, { 
      text: `*Error processing antibadword command*\n\n_Developed by ${DEV_NAME}_` 
    }, { quoted: message });
  }
}

module.exports = antibadwordCommand;
