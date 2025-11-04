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
import { parsePhoneNumber } from './lib/mini-libphonenumber.js'
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
    const inputSession = (await ask('Enter your SESSION_ID (press Enter to pair new): ')).trim()

    if (inputSession) {
      try {
        const parsed = decodeSession(inputSession)
        if (!fs.existsSync('./session')) fs.mkdirSync('./session', { recursive: true })
        fs.writeFileSync(path.join('./session', 'session.json'), JSON.stringify(parsed, null, 2), 'utf-8')
        if (parsed.creds) fs.writeFileSync(path.join('./session', 'creds.json'), JSON.stringify(parsed.creds, null, 2), 'utf-8')
        if (parsed.keys) fs.writeFileSync(path.join('./session', 'keys.json'), JSON.stringify(parsed.keys, null, 2), 'utf-8')
        console.log(chalk.green('✅ SESSION_ID loaded into ./session (fallback files written).'))
      } catch (e) {
        console.warn(chalk.yellow('⚠️ Provided SESSION_ID seems invalid — falling back to pairing flow.'))
      }
    }

    // Use multi-file auth state (recommended)
    const { state, saveCreds } = await useMultiFileAuthState('./session')
    const msgRetryCounterCache = new NodeCache()

    // fetch latest baileys version
    const { version } = await fetchLatestBaileysVersion()

    // Provide a logger that implements standard methods (trace, debug, info, warn, error)
    const logger = pino({ level: 'silent' })

    // make the keys store cacheable; pass the logger (important to have the methods)
    const cachedKeys = makeCacheableSignalKeyStore(state.keys, logger)

    const XeonBotInc = makeWASocket({
      version,
      logger,
      printQRInTerminal: false,
      browser: ['Ubuntu', 'Chrome', '20.0.04'],
      // pass the auth object (creds + keys)
      auth: {
        creds: state.creds,
        keys: cachedKeys,
      },
      markOnlineOnConnect: true,
      generateHighQualityLinkPreview: true,
      getMessage: async (key) => {
        const jid = jidNormalizedUser(key.remoteJid)
        const msg = await store.loadMessage(jid, key.id)
        return msg?.message || ''
      },
      msgRetryCounterCache,
      defaultQueryTimeoutMs: undefined,
    })

    // Persist credentials when they update
    XeonBotInc.ev.on('creds.update', saveCreds)

    store.bind(XeonBotInc.ev)

    // Pairing flow: check the state returned by useMultiFileAuthState (more reliable)
    if (!state.creds?.registered) {
      const rawNumber = (await ask('📱 No active session. Enter your phone number (country code then number, e.g. 2348012345678): ')) || ''
      const phoneNumber = rawNumber.replace(/[^0-9]/g, '')
      const pn = new PhoneNumber('+' + phoneNumber)
      if (!pn.isValid()) {
        console.error(chalk.red('❌ Invalid phone number. Exiting.'))
        if (rl) rl.close()
        process.exit(1)
      }
      try {
        await new Promise((r) => setTimeout(r, 1200))
        // requestPairingCode is part of the pairing API in modern Baileys builds
        const rawCode = await XeonBotInc.requestPairingCode(phoneNumber)
        const code = rawCode?.match(/.{1,4}/g)?.join('-') || rawCode
        console.log(chalk.green(`\n✅ Your Pairing Code: ${code}`))
        console.log(chalk.yellow('👉 Open WhatsApp → Linked Devices → Link with code'))
      } catch (err) {
        console.error('Error requesting pairing code:', err)
        if (rl) rl.close()
        process.exit(1)
      }
    }

    // Message upsert handler
    XeonBotInc.ev.on('messages.upsert', async (chatUpdate) => {
      try {
        const mek = chatUpdate.messages[0]
        if (!mek.message) return
        mek.message = Object.keys(mek.message)[0] === 'ephemeralMessage' ? mek.message.ephemeralMessage.message : mek.message
        if (mek.key && mek.key.remoteJid === 'status@broadcast') {
          await handleStatus(XeonBotInc, chatUpdate)
          return
        }
        if (!XeonBotInc.public && !mek.key.fromMe && chatUpdate.type === 'notify') return
        if (mek.key.id && mek.key.id.startsWith('BAE5') && mek.key.id.length === 16) return
        await handleMessages(XeonBotInc, chatUpdate, true)
      } catch (err) {
        console.error('Error in messages.upsert:', err)
      }
    })

    // decode jid helper
    XeonBotInc.decodeJid = (jid) => {
      if (!jid) return jid
      if (/:\d+@/gi.test(jid)) {
        const decode = jidDecode(jid) || {}
        return (decode.user && decode.server && decode.user + '@' + decode.server) || jid
      } else return jid
    }

    // contacts.update handler
    XeonBotInc.ev.on('contacts.update', (update) => {
      for (let contact of update) {
        const id = XeonBotInc.decodeJid(contact.id)
        if (store && store.contacts) store.contacts[id] = { id, name: contact.notify }
      }
    })

    // getName helper preserved and fixed (use 'new PhoneNumber' and correct variable)
    XeonBotInc.getName = async (jid, withoutContact = false) => {
      const id = XeonBotInc.decodeJid(jid)
      withoutContact = XeonBotInc.withoutContact || withoutContact
      let v
      try {
        if (id && id.endsWith('@g.us')) {
          v = store.contacts[id] || {}
          if (!(v.name || v.subject)) v = await XeonBotInc.groupMetadata(id) || {}
          // if no name/subject, attempt to format a phone-like fallback (group JIDs won't format)
          if (v.name || v.subject) return v.name || v.subject || ''
          return ''
        } else {
          v = id === '0@s.whatsapp.net' ? { id, name: 'WhatsApp' } : id === XeonBotInc.decodeJid(XeonBotInc.user?.id) ? XeonBotInc.user : store.contacts[id] || {}
          // For individual contacts, try contact name, subject, verifiedName, then phone format
          if ((withoutContact ? '' : v.name) || v.subject || v.verifiedName) {
            return (withoutContact ? '' : v.name) || v.subject || v.verifiedName
          }
          // fallback: extract number part and format internationally
          const numeric = (id && id.replace('@s.whatsapp.net', '')) || ''
          if (numeric) {
            const pn = new PhoneNumber('+' + numeric)
            if (pn.isValid && pn.isValid()) return pn.getNumber('international')
          }
          return ''
        }
      } catch (e) {
        // safe fallback
        return ''
      }
    }

    XeonBotInc.public = false
    XeonBotInc.serializeM = (m) => smsg(XeonBotInc, m, store)

    // connection update
    XeonBotInc.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect } = update
      if (connection === 'open') {
        console.log(chalk.yellow(`\n🌿 Connected as ${JSON.stringify(XeonBotInc.user, null, 2)}`))

        // startup message
        try {
          // guard against missing user object
          const rawId = XeonBotInc.user?.id || ''
          const botNumber = rawId ? rawId.split(':')[0] + '@s.whatsapp.net' : null
          if (botNumber) {
            await XeonBotInc.sendMessage(botNumber, {
              text: `
匚ㄖ几Ꮆ尺卂ㄒㄩㄥ卂ㄒ丨ㄖ几丂! 🚀
💠 *${settings.botName} Connected Successfully!*
⏰ *Time:* ${new Date().toLocaleString()}
✅ *Status:* Alive & Ready for Takeoff
📢 *Stay Updated:* ${settings.channelLink || ''}
💬 *Official Group:* ${settings.groupLink || ''}
© 2025 *${settings.botName}* — made by ${settings.ownerName || 'owner'}
              `
            })
          }
          console.log(chalk.green(`✅ ${settings.botName} is running!`))
        } catch (e) { console.error('Startup message error:', e) }

      }

      if (connection === 'close' && lastDisconnect?.error?.output?.statusCode != 401) {
        console.log(chalk.red('Connection closed unexpectedly — restarting...'))
        setTimeout(() => startXeonBotInc().catch(() => {}), 2000)
      }
    })

    // other events
    XeonBotInc.ev.on('group-participants.update', async (update) => await handleGroupParticipantUpdate(XeonBotInc, update))
    XeonBotInc.ev.on('status.update', async (status) => await handleStatus(XeonBotInc, status))
    XeonBotInc.ev.on('messages.reaction', async (status) => await handleStatus(XeonBotInc, status))

    return XeonBotInc

  } catch (err) {
    if (rl) rl.close()
    console.error('Fatal error starting bot:', err)
    process.exit(1)
  }
}

startXeonBotInc()

process.on('uncaughtException', (err) => console.error('Uncaught Exception:', err))
process.on('unhandledRejection', (err) => console.error('Unhandled Rejection:', err))

const __filename = fileURLToPath(import.meta.url)
fs.watchFile(__filename, () => {
  fs.unwatchFile(__filename)
  console.log(chalk.redBright(`Update ${__filename}`))
  import(`${import.meta.url}?update=${Date.now()}`)
})
