/**
 * DEVMD - index.js
 * Developer: 𝐌𝐑ܮ𝐃𝐄𝐕『ᴾᴿᴵ́ᴹᴱ́』
 */

const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const pino = require('pino');
const {
  default: makeWASocket,
  useMultiFileAuthState,
  makeCacheableSignalKeyStore,
  fetchLatestBaileysVersion,
} = require('@whiskeysockets/baileys');

const { handleMessages, handleGroupParticipantUpdate, handleStatus } = require('./main'); // your commands

const sessionFolder = path.resolve('./session');

// ======== Console Banner ========
function showBanner() {
  console.clear();
  console.log(chalk.cyan.bold("══════════════════════════════════════════"));
  console.log(chalk.magenta.bold("            💠 𝐃𝐄𝐕𝐌𝐃 𝐖𝐡𝐚𝐭𝐬𝐀𝐩𝐩 𝐁𝐨𝐭 💠"));
  console.log(chalk.cyan.bold("══════════════════════════════════════════\n"));
}

// ======== Start Bot ========
async function startBot() {
  showBanner();

  // Load or create auth state
  const { state, saveCreds } = await useMultiFileAuthState(sessionFolder);
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    version,
    logger: pino({ level: 'silent' }),
    printQRInTerminal: false, // disable QR ascii printing
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
    const { qr, ref, connection, lastDisconnect } = update;

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
      const statusCode = lastDisconnect?.error?.output?.statusCode;
      if (statusCode === 401) {
        console.log(chalk.red('❌ Unauthorized! Delete the ./session folder and restart the bot.'));
        process.exit(0);
      } else {
        console.log(chalk.yellow('🔄 Disconnected unexpectedly, reconnecting...'));
        startBot();
      }
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
}

startBot().catch(e => {
  console.error('Fatal error:', e);
  process.exit(1);
});

// Catch global errors
process.on('uncaughtException', e => console.error('Uncaught Exception:', e));
process.on('unhandledRejection', e => console.error('Unhandled Rejection:', e));
