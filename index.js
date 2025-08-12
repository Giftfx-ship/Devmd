/**
 * DEVMD - index.js
 * Developer: 𝐌𝐑ܮ𝐃𝐄𝐕『ᴾᴿᴵ́ᴹᴱ́』
 */

const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const pino = require('pino');
const readline = require('readline');
const { spawn } = require('child_process');
const simpleGit = require('simple-git');
const {
  default: makeWASocket,
  useMultiFileAuthState,
  makeCacheableSignalKeyStore,
  fetchLatestBaileysVersion,
} = require('@whiskeysockets/baileys');

const { handleMessages, handleGroupParticipantUpdate, handleStatus } = require('./main');

const sessionFolder = path.resolve('./session');
const git = simpleGit();

function showBanner() {
  console.clear();
  console.log(chalk.cyan.bold("══════════════════════════════════════════"));
  console.log(chalk.magenta.bold("            💠 𝐃𝐄𝐕𝐌𝐃 𝐖𝐡𝐚𝐭𝐬𝐀𝐩𝐩 𝐁𝐨𝐭 💠"));
  console.log(chalk.cyan.bold("══════════════════════════════════════════\n"));
}

async function askPhoneNumber() {
  return new Promise(resolve => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    rl.question('📞 Enter your WhatsApp number with country code (e.g. 2348123456789): ', (number) => {
      rl.close();
      resolve(number.trim());
    });
  });
}

// Function to restart the bot process internally
function restartBot() {
  console.log(chalk.blue('♻️ Restarting bot internally...'));
  const nodePath = process.argv[0]; // node executable path
  const scriptPath = process.argv[1]; // this script path

  const child = spawn(nodePath, [scriptPath], {
    stdio: 'inherit',
  });

  child.on('close', (code) => {
    process.exit(code);
  });

  process.exit(0);
}

async function startBot() {
  showBanner();

  const sessionExists = fs.existsSync(sessionFolder) && fs.readdirSync(sessionFolder).length > 0;

  if (!sessionExists) {
    const phoneNumber = await askPhoneNumber();

    const { state, saveCreds } = await useMultiFileAuthState(sessionFolder, { reauthenticate: true });
    const { version } = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
      version,
      logger: pino({ level: 'silent' }),
      printQRInTerminal: false,
      auth: state,
      markOnlineOnConnect: true,
      generateHighQualityLinkPreview: true,
      getMessage: async () => '',
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', (update) => {
      const { connection, lastDisconnect, ref } = update;

      if (ref) {
        console.log(chalk.green(`\n🔢 Your 6-digit pairing code is: ${ref}\n`));
        console.log(chalk.yellow('📌 Open WhatsApp > Linked Devices > Link a Device > Enter this code.'));
      }

      if (connection === 'open') {
        console.log(chalk.green('✅ Connected! Saving session now...'));
        console.log(chalk.green('💾 Session saved! Restarting bot automatically...'));
        restartBot();
      }

      if (connection === 'close') {
        const statusCode = lastDisconnect?.error?.output?.statusCode;
        if (statusCode === 401) {
          console.log(chalk.red('❌ Unauthorized! Please delete the ./session folder and try again.'));
          process.exit(0);
        } else {
          console.log(chalk.yellow('🔄 Connection closed, exiting...'));
          process.exit(1);
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

    // GitHub update check (runs hourly)
    setInterval(checkForUpdates, 60 * 60 * 1000);
    checkForUpdates();

  } else {
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
      const { connection, lastDisconnect, ref } = update;

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

    // GitHub update check (runs hourly)
    setInterval(checkForUpdates, 60 * 60 * 1000);
    checkForUpdates();
  }
}

async function checkForUpdates() {
  try {
    await git.fetch();
    const status = await git.status();
    if (status.behind > 0) {
      console.log(chalk.blue('🔄 Update detected! Pulling latest changes from GitHub...'));
      await git.pull();
      console.log(chalk.green('✅ Bot updated. Restarting...'));
      restartBot();
    }
  } catch {
    // ignore update errors silently
  }
}

startBot().catch(e => {
  console.error('Fatal error:', e);
  process.exit(1);
});

process.on('uncaughtException', e => console.error('Uncaught Exception:', e));
process.on('unhandledRejection', e => console.error('Unhandled Rejection:', e));
