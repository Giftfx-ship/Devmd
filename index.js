/**
 * DEVMD - index.js
 * Developer: 𝐌𝐑ܮ𝐃𝐄𝐕『ᴾᴿᴵ́ᴹᴱ́』
 */

const fs = require('fs');
const chalk = require('chalk');
const readline = require('readline');
const pino = require('pino');
const NodeCache = require('node-cache');
const { exec } = require('child_process');
const {
    default: makeWASocket,
    useMultiFileAuthState,
    fetchLatestBaileysVersion,
    makeCacheableSignalKeyStore
} = require("@whiskeysockets/baileys");

const { handleMessages, handleGroupParticipantUpdate, handleStatus } = require('./main'); // your commands

// ======== Console Banner ========
function showBanner() {
    console.clear();
    console.log(chalk.cyan.bold("══════════════════════════════════════════"));
    console.log(chalk.magenta.bold("            💠 𝐃𝐄𝐕𝐌𝐃 𝐖𝐡𝐚𝐭𝐬𝐀𝐩𝐩 𝐁𝐨𝐭 💠"));
    console.log(chalk.cyan.bold("══════════════════════════════════════════\n"));
}

// ======== Silent GitHub Auto-Updater ========
function checkForUpdates() {
    exec('git fetch origin main', (err) => {
        if (err) return;
        exec('git rev-list HEAD...origin/main --count', (err, stdout) => {
            if (err) return;
            const changes = parseInt(stdout.trim());
            if (changes > 0) {
                console.log("\n📦 DEVMD: Update found. Pulling latest changes...\n");
                exec('git pull origin main', (err) => {
                    if (!err) {
                        console.log("✅ DEVMD: Updated successfully. Restarting...");
                        process.exit(0);
                    }
                });
            }
        });
    });
}
setInterval(checkForUpdates, 10 * 60 * 1000);

// ======== Readline for Number ========
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});
const ask = (q) => new Promise(res => rl.question(q, res));

// ======== Start Bot ========
async function startBot(isReconnect = false) {
    showBanner();

    const { version } = await fetchLatestBaileysVersion();
    const { state, saveCreds } = await useMultiFileAuthState('./session');
    const msgRetryCounterCache = new NodeCache();

    const sock = makeWASocket({
        version,
        logger: pino({ level: 'silent' }),
        printQRInTerminal: false,
        auth: {
            creds: state.creds,
            keys: makeCacheableSignalKeyStore(state.keys, pino({ level: 'fatal' }).child({ level: 'fatal' }))
        },
        markOnlineOnConnect: true,
        generateHighQualityLinkPreview: true,
        getMessage: async () => ''
    });

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === 'open') {
            console.clear();
            console.log(chalk.cyan.bold("══════════════════════════════════════════"));
            console.log(chalk.green.bold(`✅ DEVMD Bot ${isReconnect ? 'Reconnected' : 'Connected'} Successfully!`));
            console.log(chalk.yellow(`🤖 Logged in as: ${sock.user.id}`));
            console.log(chalk.yellow(`📅 Date: ${new Date().toLocaleString()}`));
            console.log(chalk.cyan.bold("══════════════════════════════════════════\n"));

            await sock.sendMessage(sock.user.id, {
                text:
`💠 *DEVMD BOT STATUS* 💠
━━━━━━━━━━━━━━━━━━━━━━
${isReconnect ? '♻️ Bot Reconnected' : '✅ Bot Connected'}  
📅 Date: *${new Date().toLocaleString()}*  
🤖 User: *${sock.user.id}*  
💾 Session: *Saved successfully*  
━━━━━━━━━━━━━━━━━━━━━━
© 𝐌𝐑ܮ𝐃𝐄𝐕『ᴾᴿᴵ́ᴹᴱ́』`
            });
        } else if (connection === 'close') {
            if (lastDisconnect.error?.output?.statusCode !== 401) {
                console.log(chalk.red(`❌ Disconnected unexpectedly, reconnecting...`));
                await startBot(true);
            } else {
                console.log(chalk.red(`Connection closed: Unauthorized (401). Delete ./session and try again.`));
                process.exit(0);
            }
        }
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('messages.upsert', async (m) => {
        if (!m.messages?.length) return;
        const msg = m.messages[0];
        if (!msg.message) return;
        try {
            await handleMessages(sock, m, true);
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

    sock.ev.on('messages.reaction', async (reaction) => {
        try {
            await handleStatus(sock, reaction);
        } catch (e) {
            console.error('Error handling message reaction:', e);
        }
    });

    if (!state.creds.registered) {
        const phone = await ask(chalk.cyan('📱 Enter your phone number with country code (e.g. 15551234567): '));
        const cleanedPhone = phone.replace(/\D/g, '');
        if (!cleanedPhone) {
            console.log(chalk.red('❌ Invalid phone number input. Exiting.'));
            process.exit(1);
        }
        try {
            const code = await sock.requestPairingCode(cleanedPhone);
            const formattedCode = code.match(/.{1,4}/g).join('-');
            console.log(chalk.green(`\n🔗 Your pairing code is: ${formattedCode}`));
            console.log(chalk.yellow('\n📌 Open WhatsApp > Settings > Linked Devices > Link a Device > Enter this code.'));
            rl.close();
        } catch (err) {
            console.error(chalk.red('❌ Failed to request pairing code:'), err);
            rl.close();
            process.exit(1);
        }
    }
}

startBot().catch(e => {
    console.error('Fatal error:', e);
    process.exit(1);
});

process.on('uncaughtException', e => console.error('Uncaught Exception:', e));
process.on('unhandledRejection', e => console.error('Unhandled Rejection:', e));
