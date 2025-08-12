const fs = require('fs');
const path = require('path');
const settings = require('../settings');  // Import botName & channel

const channelInfo = {
  contextInfo: {
    forwardingScore: 1,
    isForwarded: true,
    forwardedNewsletterMessageInfo: {
      newsletterJid: '120363161513685998@newsletter',
      newsletterName: settings.botName,
      serverMessageId: -1
    }
  }
};

// Path to store auto status config
const configPath = path.join(__dirname, '../data/autoStatus.json');

// Initialize config file if missing
if (!fs.existsSync(configPath)) {
  fs.writeFileSync(configPath, JSON.stringify({ enabled: false }, null, 2));
}

// Developer tag text with dynamic name and channel link
const DEV_TAG = `*💠 ${settings.botName}*\n👨‍💻 Created by 𝐌𝐑ܮ𝐃𝐄𝐕『ᴾᴿᴵ́ᴹᴱ́』\n🔗 Channel: ${settings.channel}`;

/**
 * Handle .autostatus command
 * Only usable by the bot owner
 */
async function autoStatusCommand(sock, chatId, msg, args) {
  try {
    if (!msg.key.fromMe) {
      return await sock.sendMessage(chatId, {
        text: `❌ This command can only be used by the owner!\n\n${DEV_TAG}`,
        ...channelInfo
      });
    }

    // Load config
    let config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));

    if (!args || args.length === 0) {
      // Show current status
      const status = config.enabled ? 'enabled' : 'disabled';
      return await sock.sendMessage(chatId, {
        text:
          `🔄 *Auto Status View*\n\n` +
          `Current status: ${status}\n\n` +
          `Use:\n.autostatus on - Enable auto status view\n.autostatus off - Disable auto status view\n\n` +
          `${DEV_TAG}`,
        ...channelInfo
      });
    }

    // Parse and handle command argument
    const command = args[0].toLowerCase();
    if (command === 'on') {
      config.enabled = true;
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
      await sock.sendMessage(chatId, {
        text:
          '✅ Auto status view has been enabled!\n' +
          'Bot will now automatically view all contact statuses.\n\n' +
          `${DEV_TAG}`,
        ...channelInfo
      });
    } else if (command === 'off') {
      config.enabled = false;
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
      await sock.sendMessage(chatId, {
        text:
          '❌ Auto status view has been disabled!\n' +
          'Bot will no longer automatically view statuses.\n\n' +
          `${DEV_TAG}`,
        ...channelInfo
      });
    } else {
      await sock.sendMessage(chatId, {
        text:
          '❌ Invalid command! Use:\n.autostatus on - Enable auto status view\n.autostatus off - Disable auto status view\n\n' +
          `${DEV_TAG}`,
        ...channelInfo
      });
    }
  } catch (error) {
    console.error('Error in autostatus command:', error);
    await sock.sendMessage(chatId, {
      text: `❌ Error occurred while managing auto status!\n${error.message}\n\n${DEV_TAG}`,
      ...channelInfo
    });
  }
}

/**
 * Check if auto status viewing is enabled
 */
function isAutoStatusEnabled() {
  try {
    const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    return config.enabled;
  } catch (error) {
    console.error('Error reading auto status config:', error);
    return false;
  }
}

/**
 * Handle status update events to auto-view statuses
 */
async function handleStatusUpdate(sock, status) {
  try {
    if (!isAutoStatusEnabled()) return;

    // Avoid rate limiting by adding a small delay
    await new Promise((r) => setTimeout(r, 1000));

    // Handle status messages inside status.messages (upsert)
    if (status.messages && status.messages.length > 0) {
      const msg = status.messages[0];
      if (msg.key?.remoteJid === 'status@broadcast') {
        await safeReadMessage(sock, msg.key);
        return;
      }
    }

    // Handle direct status updates
    if (status.key?.remoteJid === 'status@broadcast') {
      await safeReadMessage(sock, status.key);
      return;
    }

    // Handle reactions to status updates
    if (status.reaction?.key.remoteJid === 'status@broadcast') {
      await safeReadMessage(sock, status.reaction.key);
      return;
    }
  } catch (error) {
    console.error('❌ Error in auto status view:', error.message);
  }
}

/**
 * Safely read a message key with rate-limit handling
 */
async function safeReadMessage(sock, key) {
  try {
    await sock.readMessages([key]);
    const sender = key.participant || key.remoteJid;
    console.log(`✅ Viewed status from: ${sender.split('@')[0]}`);
  } catch (err) {
    if (err.message?.includes('rate-overlimit')) {
      console.warn('⚠️ Rate limit hit, waiting before retrying...');
      await new Promise((r) => setTimeout(r, 2000));
      await sock.readMessages([key]);
    } else {
      throw err;
    }
  }
}

module.exports = {
  autoStatusCommand,
  handleStatusUpdate
};
