/**
 * devmd - A WhatsApp agent 
 * Copyright (c) 2025 mr dev 
 * 
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the MIT License.
 * 
 * Credits:
 * - Baileys Library by @adiwajshing
 * - Pair Code implementation inspired by dev 
 */

import './githubupdate.js'

import crypto from 'crypto'
import { Boom } from '@hapi/boom'
import fs from 'fs'
import chalk from 'chalk'
import FileType from 'file-type'
import path from 'path'
import axios from 'axios'
import PhoneNumber from 'awesome-phonenumber'
import NodeCache from 'node-cache'
import pino from 'pino'
import readline from 'readline'
import { parsePhoneNumber } from 'libphonenumber-js'
import { fileURLToPath } from 'url'

import {
  default as makeWASocket,
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
  delay,
} from '@whiskeysockets/baileys'

import { PHONENUMBER_MCC } from '@whiskeysockets/baileys/lib/Utils/generics.js'
import { rmSync, existsSync } from 'fs'
import { join } from 'path'

// === Import Custom Libs ===
import { handleMessages, handleGroupParticipantUpdate, handleStatus } from './main.js'
import { imageToWebp, videoToWebp, writeExifImg, writeExifVid } from './lib/exif.js'
import { smsg, isUrl, generateMessageTag, getBuffer, getSizeMedia, fetch, sleep, reSize } from './lib/myfunc.js'

// === Import Settings ===
import settings from './settings.js'

// ============ NODE VERSION GUARD ============
const [major] = process.versions.node.split('.').map(Number)
if (major < 18 || major >= 21) {
  console.error(`❌ Unsupported Node.js version: ${process.versions.node}`)
  console.error(`👉 Please use Node.js 18, 19, or 20`)
  process.exit(1)
}

// ============ SESSION DIR ============
if (!fs.existsSync('./session')) fs.mkdirSync('./session', { recursive: true })

// ============ READLINE PROMPT ============
const rl = process.stdin.isTTY ? readline.createInterface({ input: process.stdin, output: process.stdout }) : null
const ask = (q) =>
  new Promise((resolve) => {
    if (rl) rl.question(q, (a) => resolve(a))
    else resolve('') // fallback when no TTY
  })

// ============ STORE (original) ============
const store = {
  messages: {},
  contacts: {},
  chats: {},
  groupMetadata: async (jid) => {
    return {}
  },
  bind: function (ev) {
    ev.on('messages.upsert', ({ messages }) => {
      messages.forEach((msg) => {
        if (msg.key && msg.key.remoteJid) {
          this.messages[msg.key.remoteJid] = this.messages[msg.key.remoteJid] || {}
          this.messages[msg.key.remoteJid][msg.key.id] = msg
        }
      })
    })

    ev.on('contacts.update', (contacts) => {
      contacts.forEach((contact) => {
        if (contact.id) {
          this.contacts[contact.id] = contact
        }
      })
    })

    ev.on('chats.set', (chats) => {
      this.chats = chats
    })
  },
  loadMessage: async (jid, id) => {
    return this.messages[jid]?.[id] || null
  },
}

// Global configs (preserve)
global.botname = settings.botName
global.themeemoji = settings.themeEmoji

// Helper: encode/decode session (full state object)
const encodeSession = (state) => Buffer.from(JSON.stringify(state)).toString('base64')
const decodeSession = (b64) => JSON.parse(Buffer.from(b64, 'base64').toString('utf-8'))

// Main start function
async function startXeonBotInc() {
  try {
    // 1) Prompt for SESSION_ID first
    const inputSession = (await ask('Enter your SESSION_ID (press Enter to pair new): ')).trim()

    // If user provided SESSION_ID, try to decode and write into ./session
    if (inputSession) {
      try {
        const parsed = decodeSession(inputSession)
        // Write multi-file creds if possible: write creds.json (keys remain in files handled by useMultiFileAuthState later)
        if (!fs.existsSync('./session')) fs.mkdirSync('./session', { recursive: true })
        // Save a combined file for fallback
        fs.writeFileSync(path.join('./session', 'session.json'), JSON.stringify(parsed, null, 2), 'utf-8')
        // Also attempt to write creds.json if present
        if (parsed.creds) {
          fs.writeFileSync(path.join('./session', 'creds.json'), JSON.stringify(parsed.creds, null, 2), 'utf-8')
        }
        // If keys present, save keys as single file for fallback (Baileys multi-file expects multiple files; this is a convenience)
        if (parsed.keys) {
          fs.writeFileSync(path.join('./session', 'keys.json'), JSON.stringify(parsed.keys, null, 2), 'utf-8')
        }
        console.log(chalk.green('✅ SESSION_ID loaded into ./session (fallback files written).'))
      } catch (e) {
        console.warn(chalk.yellow('⚠️ Provided SESSION_ID seems invalid — falling back to pairing flow.'))
      }
    }

    // 2) Initialize Baileys multi-file auth state (will load files we may have written above)
    const { state, saveCreds } = await useMultiFileAuthState('./session')
    const msgRetryCounterCache = new NodeCache()
    let { version } = await fetchLatestBaileysVersion()

    // 3) Create socket
    const XeonBotInc = makeWASocket({
      version,
      logger: pino({ level: 'silent' }),
      printQRInTerminal: false, // we will use pairing code (digits) flow
      browser: ['Ubuntu', 'Chrome', '20.0.04'],
      auth: {
        creds: state.creds,
        keys: makeCacheableSignalKeyStore(state.keys, pino({ level: 'fatal' }).child({ level: 'fatal' })),
      },
      markOnlineOnConnect: true,
      generateHighQualityLinkPreview: true,
      getMessage: async (key) => {
        let jid = jidNormalizedUser(key.remoteJid)
        let msg = await store.loadMessage(jid, key.id)
        return msg?.message || ''
      },
      msgRetryCounterCache,
      defaultQueryTimeoutMs: undefined,
    })

    // bind store
    store.bind(XeonBotInc.ev)

    // 4) If not registered (no valid session), always ask phone number and request a pairing code
    if (!XeonBotInc.authState?.creds?.registered) {
      // always ask number (user requested this)
      const rawNumber =
        (await ask('📱 No active session. Enter your phone number (country code then number, e.g. 2348012345678): ')) ||
        ''
      const phoneNumber = rawNumber.replace(/[^0-9]/g, '')
      const pn = new PhoneNumber('+' + phoneNumber)
      if (!pn.isValid()) {
        console.error(chalk.red('❌ Invalid phone number. Exiting.'))
        try {
          if (rl) rl.close()
        } catch (e) {}
        process.exit(1)
      }

      // Ask Baileys for pairing code and print it
      try {
        // small delay to ensure socket ready
        await new Promise((r) => setTimeout(r, 1200))
        const rawCode = await XeonBotInc.requestPairingCode(phoneNumber)
        const code = rawCode?.match(/.{1,4}/g)?.join('-') || rawCode
        console.log(chalk.green(`\n✅ Your Pairing Code: ${code}`))
        console.log(chalk.yellow('👉 Open WhatsApp → Linked Devices → Link with code'))
      } catch (err) {
        console.error('Error requesting pairing code:', err)
        try {
          if (rl) rl.close()
        } catch (e) {}
        process.exit(1)
      }
    }

    // 5) event listeners (messages)
    XeonBotInc.ev.on('messages.upsert', async (chatUpdate) => {
      try {
        const mek = chatUpdate.messages[0]
        if (!mek.message) return
        mek.message =
          Object.keys(mek.message)[0] === 'ephemeralMessage' ? mek.message.ephemeralMessage.message : mek.message
        if (mek.key && mek.key.remoteJid === 'status@broadcast') {
          await handleStatus(XeonBotInc, chatUpdate)
          return
        }
        if (!XeonBotInc.public && !mek.key.fromMe && chatUpdate.type === 'notify') return
        if (mek.key.id.startsWith('BAE5') && mek.key.id.length === 16) return

        await handleMessages(XeonBotInc, chatUpdate, true)
      } catch (err) {
        console.error('Error in messages.upsert:', err)
      }
    })

    XeonBotInc.decodeJid = (jid) => {
      if (!jid) return jid
      if (/:\d+@/gi.test(jid)) {
        let decode = jidDecode(jid) || {}
        return (decode.user && decode.server && decode.user + '@' + decode.server) || jid
      } else return jid
    }

    XeonBotInc.ev.on('contacts.update', (update) => {
      for (let contact of update) {
        let id = XeonBotInc.decodeJid(contact.id)
        if (store && store.contacts) store.contacts[id] = { id, name: contact.notify }
      }
    })

    XeonBotInc.getName = (jid, withoutContact = false) => {
      id = XeonBotInc.decodeJid(jid)
      withoutContact = XeonBotInc.withoutContact || withoutContact
      let v
      if (id.endsWith('@g.us'))
        return new Promise(async (resolve) => {
          v = store.contacts[id] || {}
          if (!(v.name || v.subject)) v = XeonBotInc.groupMetadata(id) || {}
          resolve(
            v.name ||
              v.subject ||
              PhoneNumber('+' + id.replace('@s.whatsapp.net', '')).getNumber('international')
          )
        })
      else
        v =
          id === '0@s.whatsapp.net'
            ? { id, name: 'WhatsApp' }
            : id === XeonBotInc.decodeJid(XeonBotInc.user?.id)
            ? XeonBotInc.user
            : store.contacts[id] || {}
      return (
        (withoutContact ? '' : v.name) ||
        v.subject ||
        v.verifiedName ||
        PhoneNumber('+' + jid.replace('@s.whatsapp.net', '')).getNumber('international')
      )
    }

    XeonBotInc.public = false
    XeonBotInc.serializeM = (m) => smsg(XeonBotInc, m, store)

    // connection update handler
    XeonBotInc.ev.on('connection.update', async (update) => {
      try {
        const { connection, lastDisconnect } = update
        if (connection === 'open') {
          console.log(chalk.yellow(`\n🌿 Connected as ${JSON.stringify(XeonBotInc.user, null, 2)}`))

          // Build exportState (creds + keys). Prefer files saved by useMultiFileAuthState if present.
          let exportState = null
          try {
            const credsPath = path.join('./session', 'creds.json')
            if (fs.existsSync(credsPath)) {
              const creds = JSON.parse(fs.readFileSync(credsPath, 'utf-8'))
              exportState = { creds, keys: state.keys }
            } else {
              exportState = { creds: state.creds, keys: state.keys }
            }

            const exported = encodeSession(exportState)

            // Save exported session files for convenience
            try {
              fs.writeFileSync(path.join('./session', 'session.base64'), exported, 'utf-8')
              fs.writeFileSync('session.txt', exported, 'utf-8')
              fs.writeFileSync(path.join('./session', 'session.json'), JSON.stringify(exportState, null, 2), 'utf-8')
            } catch (e) {
              console.warn('Could not save session files locally:', e.message || e)
            }

            // Print exported base64 to console
            console.log(chalk.blueBright('\n🔐 SESSION_ID (base64) — copy/save this for deployment:'))
            console.log(exported)
            console.log('\n')

            // Send to owner (if provided) otherwise send to bot chat
            let ownerNumber = null
            if (Array.isArray(settings.ownerNumber) && settings.ownerNumber.length) ownerNumber = settings.ownerNumber[0]
            else if (typeof settings.ownerNumber === 'string' && settings.ownerNumber) ownerNumber = settings.ownerNumber
            else if (typeof settings.owner === 'string' && settings.owner) ownerNumber = settings.owner

            const target = ownerNumber ? ownerNumber.replace(/[^0-9]/g, '') + '@s.whatsapp.net' : (XeonBotInc.user.id.split(':')[0] + '@s.whatsapp.net')

            // small delay to ensure socket ready for sending
            await delay(1000)
            await XeonBotInc.sendMessage(target, {
              text: `✅ *${settings.botName || 'Bot'}* paired successfully!\n\n📌 SESSION_ID (base64):\n\n${exported}\n\nStore this value safely — use it as SESSION_ID env when deploying.`,
            })
            console.log(chalk.green(`📩 SESSION_ID sent to ${target}`))
          } catch (e) {
            console.error('Error exporting/sending SESSION_ID:', e)
          }

          // original startup message to bot chat (keeps old behavior)
          try {
            const botNumber = XeonBotInc.user.id.split(':')[0] + '@s.whatsapp.net'
            await XeonBotInc.sendMessage(botNumber, {
              text: `
匚ㄖ几Ꮆ尺卂ㄒㄩㄥ卂ㄒ丨ㄖ几丂! 🚀
\n💠 *${settings.botName} Connected Successfully!*
\n⏰ *Time:* ${new Date().toLocaleString()}
\n✅ *Status:* Alive & Ready for Takeoff
\n\n📢 *Stay Updated:*  
${settings.channelLink || ''}
\n💬 *Official Group:*  
${settings.groupLink || ''}
\n\n© 2025 *${settings.botName}* — made by ${settings.ownerName || 'owner'}
              `,
            })
            await delay(1200)
            console.log(chalk.green(`✅ ${settings.botName} is running!`))
          } catch (e) {
            // non-fatal
          }
        }

        // handle unexpected disconnects (except auth error 401)
        if (connection === 'close' && lastDisconnect?.error?.output?.statusCode != 401) {
          console.log(chalk.red('Connection closed unexpectedly — restarting...'))
          setTimeout(() => startXeonBotInc().catch(() => {}), 2000)
        }
      } catch (e) {
        console.error('Error in connection.update:', e)
      } finally {
        try {
          if (rl) rl.close()
        } catch (e) {}
      }
    })

    // save credentials updates
    XeonBotInc.ev.on('creds.update', saveCreds)

    // forward other events
    XeonBotInc.ev.on('group-participants.update', async (update) => {
      await handleGroupParticipantUpdate(XeonBotInc, update)
    })
    XeonBotInc.ev.on('status.update', async (status) => {
      await handleStatus(XeonBotInc, status)
    })
    XeonBotInc.ev.on('messages.reaction', async (status) => {
      await handleStatus(XeonBotInc, status)
    })

    return XeonBotInc
  } catch (err) {
    try {
      if (rl) rl.close()
    } catch (e) {}
    console.error('Fatal error starting bot:', err)
    process.exit(1)
  }
}

startXeonBotInc()

// global errors
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err)
})
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection:', err)
})

// ====== FIXED FILE WATCHER (ESM SAFE) ======
const __filename = fileURLToPath(import.meta.url)
fs.watchFile(__filename, () => {
  fs.unwatchFile(__filename)
  console.log(chalk.redBright(`Update ${__filename}`))
  import(`${import.meta.url}?update=${Date.now()}`)
})
