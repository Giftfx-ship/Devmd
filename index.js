/**
 * DEVMD - index.js
 * Developer: 𝐌𝐑ܮ𝐃𝐄𝐕『ᴾᴿᴵ́ᴹᴱ́』
 */

const fs = require('fs')
const path = require('path')
const chalk = require('chalk')
const readline = require('readline')
const pino = require('pino')
const NodeCache = require('node-cache')
const { Boom } = require('@hapi/boom')
const {
    default: makeWASocket,
    useMultiFileAuthState,
    fetchLatestBaileysVersion,
    jidDecode,
    jidNormalizedUser,
    makeCacheableSignalKeyStore,
    delay
} = require("@whiskeysockets/baileys")

const { handleMessages, handleGroupParticipantUpdate, handleStatus } = require('./main') // your main file with commands

// Create readline interface to ask for phone number every time
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
})

const question = (text) => new Promise(resolve => rl.question(text, resolve))

async function startBot() {
    // Always fetch latest Baileys version for compatibility
    const { version, isLatest } = await fetchLatestBaileysVersion()

    // Use multi-file auth state for session saving in ./session folder
    const { state, saveCreds } = await useMultiFileAuthState('./session')

    const msgRetryCounterCache = new NodeCache()

    const sock = makeWASocket({
        version,
        logger: pino({ level: 'silent' }),
        printQRInTerminal: false, // We handle pairing code manually
        auth: {
            creds: state.creds,
            keys: makeCacheableSignalKeyStore(state.keys, pino({ level: 'fatal' }).child({ level: 'fatal' }))
        },
        markOnlineOnConnect: true,
        generateHighQualityLinkPreview: true,
        getMessage: async key => {
            // You can implement store loading messages if needed
            return ''
        },
        msgRetryCounterCache,
    })

    // Bind events to store or cache here if needed (optional)

    // Listen for connection updates
    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect } = update
        if (connection === 'open') {
            console.log(chalk.green.bold(`✅ Connected as ${sock.user.id}`))
        } else if (connection === 'close') {
            if (lastDisconnect.error?.output?.statusCode !== 401) {
                console.log(chalk.red(`Disconnected unexpectedly, reconnecting...`))
                await startBot() // reconnect on all disconnects except auth failure
            } else {
                console.log(chalk.red(`Connection closed: Unauthorized (401). Please delete ./session and try again.`))
                process.exit(0)
            }
        }
    })

    // Listen for creds updates and save them
    sock.ev.on('creds.update', saveCreds)

    // Handle incoming messages by calling your main handler
    sock.ev.on('messages.upsert', async (m) => {
        if (!m.messages || m.messages.length === 0) return
        const msg = m.messages[0]
        if (!msg.message) return
        try {
            await handleMessages(sock, m, true)
        } catch (e) {
            console.error('Error handling message:', e)
        }
    })

    // Group participant updates
    sock.ev.on('group-participants.update', async (update) => {
        try {
            await handleGroupParticipantUpdate(sock, update)
        } catch (e) {
            console.error('Error handling group participant update:', e)
        }
    })

    // Status updates
    sock.ev.on('status.update', async (status) => {
        try {
            await handleStatus(sock, status)
        } catch (e) {
            console.error('Error handling status update:', e)
        }
    })

    // Messages reactions (optional)
    sock.ev.on('messages.reaction', async (reaction) => {
        try {
            await handleStatus(sock, reaction)
        } catch (e) {
            console.error('Error handling message reaction:', e)
        }
    })

    // Always ask for phone number and print pairing code on first run or if not registered
    if (!state.creds.registered) {
        rl.question(chalk.cyan('Enter your phone number with country code (e.g. 15551234567): '), async (phone) => {
            const cleanedPhone = phone.replace(/\D/g, '')
            if (!cleanedPhone) {
                console.log(chalk.red('Invalid phone number input. Exiting.'))
                process.exit(1)
            }
            try {
                const code = await sock.requestPairingCode(cleanedPhone)
                const formattedCode = code.match(/.{1,4}/g).join('-')
                console.log(chalk.green(`\nYour pairing code is: ${formattedCode}`))
                console.log(chalk.yellow('\nOpen WhatsApp > Settings > Linked Devices > Link a Device > Enter this code'))
                rl.close()
            } catch (err) {
                console.error(chalk.red('Failed to request pairing code:'), err)
                rl.close()
                process.exit(1)
            }
        })
    }
}

startBot().catch(e => {
    console.error('Fatal error:', e)
    process.exit(1)
})

process.on('uncaughtException', e => {
    console.error('Uncaught Exception:', e)
})

process.on('unhandledRejection', e => {
    console.error('Unhandled Rejection:', e)
})
