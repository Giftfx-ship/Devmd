/**
 * DEVMD - index.js (keeps original base logic)
 * DEVMD (developer: MRDEV-PRIME)
 */

require('./settings')
const { Boom } = require('@hapi/boom')
const fs = require('fs')
const chalk = require('chalk')
const FileType = require('file-type')
const path = require('path')
const axios = require('axios')
const { handleMessages, handleGroupParticipantUpdate, handleStatus } = require('./main')
const PhoneNumber = require('awesome-phonenumber')
const { imageToWebp, videoToWebp, writeExifImg, writeExifVid } = require('./lib/exif')
const { smsg, isUrl, generateMessageTag, getBuffer, getSizeMedia, fetch, sleep, reSize } = require('./lib/myfunc')
const { 
    default: makeWASocket,
    useMultiFileAuthState, 
    DisconnectReason, 
    fetchLatestBaileysVersion,
    generateForwardMessageContent,
    prepareWAMessageMedia,
    generateWAMessageFromContent,
    generateMessageID,
    downloadContentFromMessage,
    jidDecode,
    proto,
    jidNormalizedUser,
    makeCacheableSignalKeyStore,
    delay
} = require("@whiskeysockets/baileys")
const NodeCache = require("node-cache")
const pino = require("pino")
const readline = require("readline")

// Create a store object with required methods
const store = {
    messages: {},
    contacts: {},
    chats: {},
    groupMetadata: async (jid) => {
        return {}
    },
    bind: function(ev) {
        ev.on('messages.upsert', ({ messages }) => {
            messages.forEach(msg => {
                if (msg.key && msg.key.remoteJid) {
                    this.messages[msg.key.remoteJid] = this.messages[msg.key.remoteJid] || {}
                    this.messages[msg.key.remoteJid][msg.key.id] = msg
                }
            })
        })
        
        ev.on('contacts.update', (contacts) => {
            contacts.forEach(contact => {
                if (contact.id) {
                    this.contacts[contact.id] = contact
                }
            })
        })
        
        ev.on('chats.set', (chats) => {
            this.chats = chats
        })
    },
    loadMessage: async function(jid, id) {
        return this.messages[jid]?.[id] || null
    }
}

// --- PAIRING PHONE RESOLUTION (robust) ---
let owner
try {
    owner = JSON.parse(fs.readFileSync('./data/owner.json'))
} catch (e) {
    owner = null
}

const settings = require('./settings')

let phoneNumber = ''
if (settings && (settings.ownerNumber || settings.owner)) {
    phoneNumber = String(settings.ownerNumber || settings.owner).replace(/\D/g,'')
} else if (Array.isArray(owner) && owner.length) {
    phoneNumber = String(owner[0]).replace(/\D/g,'')
} else if (owner && typeof owner === 'string') {
    phoneNumber = owner.replace(/\D/g,'')
} else if (owner && owner.number) {
    phoneNumber = String(owner.number).replace(/\D/g,'')
}

const pairingCode = !!phoneNumber || process.argv.includes("--pairing-code")
const useMobile = process.argv.includes("--mobile")

global.botname = "DEVMD"
global.themeemoji = "•"

const rl = process.stdin.isTTY ? readline.createInterface({ input: process.stdin, output: process.stdout }) : null
const question = (text) => {
    if (rl) {
        return new Promise((resolve) => rl.question(text, resolve))
    } else {
        return Promise.resolve(settings.ownerNumber || phoneNumber)
    }
}

async function startXeonBotInc() {
    let { version, isLatest } = await fetchLatestBaileysVersion()
    const { state, saveCreds } = await useMultiFileAuthState(`./session`)
    const msgRetryCounterCache = new NodeCache()

    const XeonBotInc = makeWASocket({
        version,
        logger: pino({ level: 'silent' }),
        printQRInTerminal: !pairingCode,
        browser: ["Ubuntu", "Chrome", "20.0.04"],
        auth: {
            creds: state.creds,
            keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "fatal" }).child({ level: "fatal" })),
        },
        markOnlineOnConnect: true,
        generateHighQualityLinkPreview: true,
        getMessage: async (key) => {
            let jid = jidNormalizedUser(key.remoteJid)
            let msg = await store.loadMessage(jid, key.id)
            return msg?.message || ""
        },
        msgRetryCounterCache,
        defaultQueryTimeoutMs: undefined,
    })

    store.bind(XeonBotInc.ev)

    XeonBotInc.ev.on('messages.upsert', async chatUpdate => {
        try {
            const mek = chatUpdate.messages[0]
            if (!mek.message) return
            mek.message = (Object.keys(mek.message)[0] === 'ephemeralMessage') ? mek.message.ephemeralMessage.message : mek.message
            if (mek.key && mek.key.remoteJid === 'status@broadcast') {
                await handleStatus(XeonBotInc, chatUpdate)
                return
            }
            if (!XeonBotInc.public && !mek.key.fromMe && chatUpdate.type === 'notify') return
            if (mek.key.id && mek.key.id.startsWith('BAE5') && mek.key.id.length === 16) return
            
            try {
                await handleMessages(XeonBotInc, chatUpdate, true)
            } catch (err) {
                console.error("Error in handleMessages:", err)
                if (mek.key && mek.key.remoteJid) {
                    await XeonBotInc.sendMessage(mek.key.remoteJid, { 
                        text: '❌ An error occurred while processing your message.',
                        contextInfo: {
                            forwardingScore: 1,
                            isForwarded: true,
                            forwardedNewsletterMessageInfo: {
                                newsletterJid: '12036316151365998@newsletter',
                                newsletterName: `${global.botname} status`,
                                serverMessageId: -1
                            }
                        }
                    }).catch(console.error)
                }
            }
        } catch (err) {
            console.error("Error in messages.upsert:", err)
        }
    })

    XeonBotInc.decodeJid = (jid) => {
        if (!jid) return jid
        if (/:\d+@/gi.test(jid)) {
            let decode = jidDecode(jid) || {}
            return decode.user && decode.server && decode.user + '@' + decode.server || jid
        } else return jid
    }

    XeonBotInc.ev.on('contacts.update', update => {
        for (let contact of update) {
            let id = XeonBotInc.decodeJid(contact.id)
            if (store && store.contacts) store.contacts[id] = { id, name: contact.notify }
        }
    })

    XeonBotInc.getName = (jid, withoutContact = false) => {
        const id = XeonBotInc.decodeJid(jid)
        withoutContact = XeonBotInc.withoutContact || withoutContact 
        let v
        if (id.endsWith("@g.us")) return new Promise(async (resolve) => {
            v = store.contacts[id] || {}
            if (!(v.name || v.subject)) v = await XeonBotInc.groupMetadata(id) || {}
            resolve(v.name || v.subject || PhoneNumber('+' + id.replace('@s.whatsapp.net', '')).getNumber('international'))
        })
        else v = id === '0@s.whatsapp.net' ? {
            id,
            name: 'WhatsApp'
        } : id === XeonBotInc.decodeJid(XeonBotInc.user.id) ?
            XeonBotInc.user :
            (store.contacts[id] || {})
        return (withoutContact ? '' : v.name) || v.subject || v.verifiedName || PhoneNumber('+' + jid.replace('@s.whatsapp.net', '')).getNumber('international')
    }

    XeonBotInc.public = true
    XeonBotInc.serializeM = (m) => smsg(XeonBotInc, m, store)

    if (pairingCode && !XeonBotInc.authState.creds.registered) {
        if (useMobile) throw new Error('Cannot use pairing code with mobile api')

        let pn
        if (phoneNumber) {
            pn = phoneNumber
        } else {
            pn = await question(chalk.bgBlack(chalk.greenBright(`Input your phone number to connect (without + or spaces): `)))
        }

        pn = pn.toString().replace(/[^0-9]/g, '')

        const pnlib = require('awesome-phonenumber')
        if (!pnlib('+' + pn).isValid()) {
            console.log(chalk.red('Invalid phone number. Please enter your full international number (e.g., 15551234567).'))
            process.exit(1)
        }

        setTimeout(async () => {
            try {
                let code = await XeonBotInc.requestPairingCode(pn)
                code = code?.match(/.{1,4}/g)?.join("-") || code
                console.log(chalk.black(chalk.bgGreen(`Your Pairing Code : `)), chalk.black(chalk.white(code)))
                console.log(chalk.yellow(`\nPlease enter this code in your WhatsApp app:\n1. Open WhatsApp\n2. Go to Settings > Linked Devices\n3. Tap "Link a Device"\n4. Enter the code shown above`))
            } catch (error) {
                console.error('Error requesting pairing code:', error)
                console.log(chalk.red('Failed to get pairing code. Please check your phone number and try again.'))
            }
        }, 3000)
    }

    XeonBotInc.ev.on('connection.update', async (s) => {
        const { connection, lastDisconnect } = s
        if (connection === "open") {
            console.log(chalk.magenta(` `))
            console.log(chalk.yellow(`🌿Connected to => ` + JSON.stringify(XeonBotInc.user, null, 2)))
            
            const botNumber = XeonBotInc.user.id.split(':')[0] + '@s.whatsapp.net'
            await XeonBotInc.sendMessage(botNumber, { 
                text: `
DEVMD is now connected!
Time: ${new Date().toLocaleString()}
Status: ALIVE & READY ✅

Developer: MRDEV-PRIME
GitHub: https://github.com/Giftfx-ship/Devmd
Channel: https://whatsapp.com/channel/0029VbB3zXu9Gv7LXS62GA1F
                `,
                contextInfo: {
                    forwardingScore: 1,
                    isForwarded: true,
                    forwardedNewsletterMessageInfo: {
                        newsletterJid: '12036316513685998@newsletter',
                        newsletterName: `${global.botname} status`,
                        serverMessageId: -1
                    }
                }
            }).catch(() => {})
            
            await delay(1999)
            console.log(chalk.yellow(`\n\n                  ${chalk.bold.blue(`[ ${global.botname || 'DEVMD'} ]`)}\n\n`))
            console.log(chalk.cyan(`< ================================================== >`))
            console.log(chalk.magenta(`${global.themeemoji || '•'} GITHUB: https://github.com/Giftfx-ship/Devmd `))
            console.log(chalk.magenta(`${global.themeemoji || '•'} WA NUMBER: ${Array.isArray(owner) ? owner[0] : owner}`))
            console.log(chalk.magenta(`${global.themeemoji || '•'} CREDIT: MRDEV-PRIME`))
            console.log(chalk.green(`${global.themeemoji || '•'} _ _ _  DEVMD connected successfully. 🛰️`))
        }
        if (
            connection === "close" &&
            lastDisconnect &&
            lastDisconnect.error &&
            lastDisconnect.error.output.statusCode != 401
        ) {
            startXeonBotInc()
        }
    })

    XeonBotInc.ev.on('creds.update', saveCreds)
    
    XeonBotInc.ev.on('group-participants.update', async (update) => {
        await handleGroupParticipantUpdate(XeonBotInc, update)
    })

    XeonBotInc.ev.on('messages.upsert', async (m) => {
        if (m.messages[0].key && m.messages[0].key.remoteJid === 'status@broadcast') {
            await handleStatus(XeonBotInc, m)
        }
    })

    XeonBotInc.ev.on('status.update', async (status) => {
        await handleStatus(XeonBotInc, status)
    })

    XeonBotInc.ev.on('messages.reaction', async (status) => {
        await handleStatus(XeonBotInc, status)
    })

    return XeonBotInc
}

// Start the bot with error handling
startXeonBotInc().catch(error => {
    console.error('Fatal error:', error)
    process.exit(1)
})

process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err)
})

process.on('unhandledRejection', (err) => {
    console.error('Unhandled Rejection:', err)
})

let file = require.resolve(__filename)
fs.watchFile(file, () => {
    fs.unwatchFile(file)
    console.log(chalk.redBright(`Update ${__filename}`))
    delete require.cache[file]
    require(file)
})
