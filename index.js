/**
 * DEVMD - index.js
 * Developer: 𝐌𝐑ܮ𝐃𝐄𝐕『ᴾᴿᴵ́ᴹᴱ́』
 */

const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const pino = require('pino');
const readline = require('readline');
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

  const sessionExists = fs.existsSync(sessionFolder) && fs.readdirSync(sessionFolder).length > 0;

  if (!sessionExists) {
    console.log(chalk.yellow('⚠️ No session found. Starting pairing with 6-digit code...'));

    // Create socket without auth for pairing
    const sock = makeWASocket({
      logger: pino({ level: 'silent' }),
      printQRInTerminal: false,
    });

    // Ask for phone number
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    const phoneNumber = await new Promise((resolve) => {
      rl.question('📞 Enter your WhatsApp number with country code (e.g. 2348123456789): ', resolve);
    });
    rl.close();

    // Request 6-digit pairing code
    try {
      const code = await sock.requestPairingCode(phoneNumber);
      console.log(chalk.green(`\n🔗 Your 6-digit pairing code is: ${code}`));
      console.log(chalk.yellow('📌 Open WhatsApp > Linked Devices > Link a Device > Enter this code.'));
    } catch (err) {
      console.error(chalk.red('❌ Failed to request pairing code:'), err);
      process.exit(1);
    }

    // Wait for connection open to save session
    sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect } = update;

      if (connection === 'open') {
        console.log(chalk.green('✅ Connected! Saving session...'));

        // Save credentials now
        const { saveCreds } = await useMultiFileAuthState('./session');
        await saveCreds();

        console.log(chalk.green('💾 Session saved! Please restart the bot now.'));
        process.exit(0); // exit so user restarts and loads saved session
      }

      if (connection === 'close') {
        const statusCode = lastDisconnect?.error?.output?.statusCode;
        if (statusCode === 401) {
          console.log(chalk.red('❌ Unauthorized! Please delete the ./session folder and try again.'));
          process.exit(0);
        }
      }
    });

    // Setup basic handlers to prevent crashes
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

  } else {
    // Session exists - load it
    console.log(chalk.green('✅ Session found. Loading session and connecting...'));

    const { state, saveCreds } = await useMultiFileAuthState('./session');
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

    sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect } = update;

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
          await startBot(); // reconnect
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
}

startBot().catch(e => {
  console.error('Fatal error:', e);
  process.exit(1);
});

// Catch errors globally
process.on('uncaughtException', e => console.error('Uncaught Exception:', e));
process.on('unhandledRejection', e => console.error('Unhandled Rejection:', e));
