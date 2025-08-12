/**
 * DEVMD - index.js
 * Developer: 𝐌𝐑ܮ𝐃𝐄𝐕『ᴾᴿᴵ́ᴹᴱ́』
 */

const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const pino = require('pino');
const simpleGit = require('simple-git');
const {
  default: makeWASocket,
  useMultiFileAuthState,
  makeCacheableSignalKeyStore,
  fetchLatestBaileysVersion,
} = require('@whiskeysockets/baileys');

const { handleMessages, handleGroupParticipantUpdate, handleStatus } = require('./main'); // your commands

const sessionFolder = path.resolve('./session');
const git = simpleGit();

function showBanner() {
  console.clear();
  console.log(chalk.cyan.bold("══════════════════════════════════════════"));
  console.log(chalk.magenta.bold("            💠 𝐃𝐄𝐕𝐌𝐃 𝐖𝐡𝐚𝐭𝐬𝐀𝐩𝐩 𝐁𝐨𝐭 💠"));
  console.log(chalk.cyan.bold("══════════════════════════════════════════\n"));
}

async function startBot() {
  showBanner();

  // Ensure session folder exists or create it on the fly (won't crash if missing)
  if (!fs.existsSync(sessionFolder)) {
    fs.mkdirSync(sessionFolder, { recursive: true });
  }

  // Load or create auth state
  const { state, saveCreds } = await useMultiFileAuthState(sessionFolder);
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    version,
    logger: pino({ level: 'silent' }),
    printQRInTerminal: false,
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, pino({ level: 'fatal' }).child({ level: 'fatal' })),
    },
    markOnlineOnConnect: true,
    generateHighQualityLinkPreview: true,
    getMessage: async () => '',
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', (update) => {
    const { ref, connection } = update;

    if (ref) {
      console.log(chalk.green(`\n🔢 Your 6-digit pairing code is: ${ref}\n`));
      console.log(chalk.yellow('📌 Open WhatsApp > Linked Devices > Link a Device > Enter this code.'));
    }

    if (connection === 'open') {
      console.clear();
      console.log(chalk.cyan.bold("══════════════════════════════════════════"));
      console.log(chalk.green.bold('✅ DEVMD Bot Connected Successfully!'));
      console.log(chalk.yellow(`🤖 Logged in as: ${sock.user.id}`));
      console.log(chalk.yellow(`📅 Date: ${new Date().toLocaleString()}`));
      console.log(chalk.cyan.bold("══════════════════════════════════════════\n"));
    }

    if (connection === 'close') {
      // Silent reconnect on disconnect without error message spam
      startBot();
    }
  });

  sock.ev.on('messages.upsert', async (m) => {
    try {
      await handleMessages(sock, m);
    } catch (e) {
      console.error('Error handling message:', e);
    }
  });

  sock.ev.on('group-participants.update', async (update) => {
    try {
      await handleGroupParticipantUpdate(sock, update);
    } catch (e) {
      console.error('Error handling group participant update:', e);
    }
  });

  sock.ev.on('status.update', async (status) => {
    try {
      await handleStatus(sock, status);
    } catch (e) {
      console.error('Error handling status update:', e);
    }
  });

  // Silent auto-update check — logs only when update is pulled
  async function checkForUpdates() {
    try {
      await git.fetch();
      const status = await git.status();
      if (status.behind > 0) {
        console.log(chalk.blue('🔄 Update detected! Pulling latest changes from GitHub...'));
        await git.pull();
        console.log(chalk.green('✅ Bot updated. Restarting...'));
        process.exit(0); // restart bot with latest code
      }
      // No logs if no updates
    } catch (err) {
      // Optional: silently ignore fetch errors (or log if you want)
      // console.error('Update check failed:', err.message);
    }
  }

  setInterval(checkForUpdates, 10 * 60 * 1000); // every 10 minutes
  checkForUpdates(); // initial check on start
}

startBot().catch(e => {
  console.error('Fatal error:', e);
  process.exit(1);
});

process.on('uncaughtException', e => console.error('Uncaught Exception:', e));
process.on('unhandledRejection', e => console.error('Unhandled Rejection:', e));
