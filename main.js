const fs = require('fs');
const path = require('path');

let isPublic = true;
// Load access mode once at startup
function loadAccessMode() {
  try {
    const data = JSON.parse(fs.readFileSync(path.resolve('./data/messageCount.json')));
    isPublic = data.isPublic ?? true;
  } catch (error) {
    console.error('Error reading access mode:', error);
  }
}
loadAccessMode();

// Reload access mode every 5 minutes (optional)
setInterval(loadAccessMode, 5 * 60 * 1000);

// Command handlers map
const commandHandlers = {
  '.simage': async (sock, chatId, message, userMessage) => {
    const quotedMsg = message.message?.extendedTextMessage?.contextInfo?.quotedMessage;
    if (quotedMsg?.stickerMessage) {
      await simageCommand(sock, quotedMsg, chatId);
    } else {
      await sock.sendMessage(chatId, { text: 'Please reply to a sticker with .simage command.', ...channelInfo });
    }
  },

  '.kick': async (sock, chatId, message, userMessage, senderId) => {
    const mentioned = message.message.extendedTextMessage?.contextInfo?.mentionedJid || [];
    await kickCommand(sock, chatId, senderId, mentioned, message);
  },

  '.mute': async (sock, chatId, message, userMessage, senderId) => {
    const parts = userMessage.split(' ');
    const muteDuration = parseInt(parts[1]);
    if (isNaN(muteDuration)) {
      await sock.sendMessage(chatId, { text: 'Please provide valid mute duration in minutes, e.g. .mute 10', ...channelInfo });
    } else {
      await muteCommand(sock, chatId, senderId, muteDuration);
    }
  },

  '.unmute': async (sock, chatId, message, userMessage, senderId) => {
    await unmuteCommand(sock, chatId, senderId);
  },

  '.ban': async (sock, chatId, message) => {
    await banCommand(sock, chatId, message);
  },

  '.unban': async (sock, chatId, message) => {
    await unbanCommand(sock, chatId, message);
  },

  '.help': async (sock, chatId, message) => {
    await helpCommand(sock, chatId, message);
  },

  '.menu': async (sock, chatId, message) => {
    await helpCommand(sock, chatId, message);
  },

  '.bot': async (sock, chatId, message) => {
    await helpCommand(sock, chatId, message);
  },

  '.list': async (sock, chatId, message) => {
    await helpCommand(sock, chatId, message);
  },

  '.sticker': async (sock, chatId, message) => {
    await stickerCommand(sock, chatId, message);
  },

  '.s': async (sock, chatId, message) => {
    await stickerCommand(sock, chatId, message);
  },

  '.warnings': async (sock, chatId, message) => {
    const mentioned = message.message.extendedTextMessage?.contextInfo?.mentionedJid || [];
    await warningsCommand(sock, chatId, mentioned);
  },

  '.warn': async (sock, chatId, message, userMessage, senderId) => {
    const mentioned = message.message.extendedTextMessage?.contextInfo?.mentionedJid || [];
    await warnCommand(sock, chatId, senderId, mentioned, message);
  },

  '.tts': async (sock, chatId, message, userMessage) => {
    const text = userMessage.slice(4).trim();
    await ttsCommand(sock, chatId, text, message);
  },

  '.delete': async (sock, chatId, message, userMessage, senderId) => {
    await deleteCommand(sock, chatId, message, senderId);
  },

  '.del': async (sock, chatId, message, userMessage, senderId) => {
    await deleteCommand(sock, chatId, message, senderId);
  },

  '.attp': async (sock, chatId, message) => {
    await attpCommand(sock, chatId, message);
  },

  '.mode': async (sock, chatId, message, userMessage) => {
    if (!message.key.fromMe) {
      await sock.sendMessage(chatId, { text: '❌ This command is only available for the owner!', ...channelInfo });
      return;
    }
    // Your mode command logic here
    await sock.sendMessage(chatId, { text: 'Mode command executed.', ...channelInfo });
  },

  // Add other commands here...
};

async function handleMessages(sock, messageUpdate, printLog) {
  try {
    const { messages, type } = messageUpdate;
    if (type !== 'notify') return;

    const message = messages[0];
    if (!message?.message) return;

    // Store message for antidelete feature
    storeMessage(message);

    // Handle message revocation
    if (message.message?.protocolMessage?.type === 0) {
      await handleMessageRevocation(sock, message);
      return;
    }

    const chatId = message.key.remoteJid;
    const senderId = message.key.participant || chatId;
    const isGroup = chatId.endsWith('@g.us');

    const userMessage = (
      message.message?.conversation?.trim() ||
      message.message?.extendedTextMessage?.text?.trim() ||
      message.message?.imageMessage?.caption?.trim() ||
      message.message?.videoMessage?.caption?.trim() ||
      ''
    ).toLowerCase().replace(/\.\s+/g, '.').trim();

    if (userMessage.startsWith('.')) {
      console.log(`📝 Command used in ${isGroup ? 'group' : 'private'}: ${userMessage}`);
    }

    // Ban check
    if (isBanned(senderId) && !userMessage.startsWith('.unban')) {
      if (Math.random() < 0.1) {
        await sock.sendMessage(chatId, {
          text: '❌ You are banned from using the bot. Contact an admin to get unbanned.',
          ...channelInfo,
        });
      }
      return;
    }

    // Game moves first
    if (/^[1-9]$/.test(userMessage) || userMessage === 'surrender') {
      await handleTicTacToeMove(sock, chatId, senderId, userMessage);
      return;
    }

    if (!message.key.fromMe) incrementMessageCount(chatId, senderId);

    // Bad word check in group
    if (isGroup && userMessage) {
      await handleBadwordDetection(sock, chatId, message, userMessage, senderId);
    }

    // Non-command messages in groups
    if (!userMessage.startsWith('.')) {
      if (isGroup) {
        await handleChatbotResponse(sock, chatId, message, userMessage, senderId);
        await Antilink(message, sock);
        await handleBadwordDetection(sock, chatId, message, userMessage, senderId);
      }
      return;
    }

    // Admin and owner commands arrays
    const adminCommands = ['.mute', '.unmute', '.ban', '.unban', '.promote', '.demote', '.kick', '.tagall', '.antilink'];
    const ownerCommands = ['.mode', '.autostatus', '.antidelete', '.cleartmp', '.setpp', '.clearsession', '.areact', '.autoreact'];

    let isSenderAdmin = false;
    let isBotAdmin = false;

    // Admin permission check
    if (isGroup && adminCommands.some(cmd => userMessage.startsWith(cmd))) {
      const adminStatus = await isAdmin(sock, chatId, senderId, message);
      isSenderAdmin = adminStatus.isSenderAdmin;
      isBotAdmin = adminStatus.isBotAdmin;

      if (!isBotAdmin) {
        await sock.sendMessage(chatId, { text: 'Please make the bot an admin to use admin commands.', ...channelInfo }, { quoted: message });
        return;
      }

      if (
        ['.mute', '.unmute', '.ban', '.unban', '.promote', '.demote'].some(cmd => userMessage.startsWith(cmd)) &&
        !isSenderAdmin && !message.key.fromMe
      ) {
        await sock.sendMessage(chatId, { text: 'Sorry, only group admins can use this command.', ...channelInfo });
        return;
      }
    }

    // Owner commands permission check
    if (ownerCommands.some(cmd => userMessage.startsWith(cmd))) {
      if (!message.key.fromMe) {
        await sock.sendMessage(chatId, { text: '❌ This command is only available for the owner!', ...channelInfo });
        return;
      }
    }

    // Access mode check
    if (!isPublic && !message.key.fromMe) return;

    // Execute command handler if exists
    const commandKey = Object.keys(commandHandlers).find(cmd => userMessage.startsWith(cmd));
    if (commandKey) {
      await commandHandlers[commandKey](sock, chatId, message, userMessage, senderId);
      return;
    }

    // Unknown command or no action needed
  } catch (error) {
    console.error('Error in handleMessages:', error);
    // Optionally notify user here
    // await sock.sendMessage(chatId, { text: '❌ An error occurred while processing your command.' });
  }
}

module.exports = { handleMessages };
