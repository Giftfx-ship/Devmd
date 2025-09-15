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

    const { state, saveCreds } = await useMultiFileAuthState('./session')
    const msgRetryCounterCache = new NodeCache()
    const { version } = await fetchLatestBaileysVersion()

    const XeonBotInc = makeWASocket({
      version,
      logger: pino({ level: 'silent' }),
      printQRInTerminal: false,
      browser: ['Ubuntu', 'Chrome', '20.0.04'],
      auth: {
        creds: state.creds,
        keys: makeCacheableSignalKeyStore(state.keys, pino({ level: 'fatal' }).child({ level: 'fatal' })),
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

    store.bind(XeonBotInc.ev)

    if (!XeonBotInc.authState?.creds?.registered) {
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
        if (mek.key.id.startsWith('BAE5') && mek.key.id.length === 16) return
        await handleMessages(XeonBotInc, chatUpdate, true)
      } catch (err) {
        console.error('Error in messages.upsert:', err)
      }
    })

    XeonBotInc.decodeJid = (jid) => {
      if (!jid) return jid
      if (/:\d+@/gi.test(jid)) {
        const decode = jidDecode(jid) || {}
        return (decode.user && decode.server && decode.user + '@' + decode.server) || jid
      } else return jid
    }

    XeonBotInc.ev.on('contacts.update', (update) => {
      for (let contact of update) {
        const id = XeonBotInc.decodeJid(contact.id)
        if (store && store.contacts) store.contacts[id] = { id, name: contact.notify }
      }
    })

    XeonBotInc.getName = async (jid, withoutContact = false) => {
      const id = XeonBotInc.decodeJid(jid)
      withoutContact = XeonBotInc.withoutContact || withoutContact
      let v
      if (id.endsWith('@g.us')) {
        v = store.contacts[id] || {}
        if (!(v.name || v.subject)) v = await XeonBotInc.groupMetadata(id) || {}
        return v.name || v.subject || PhoneNumber('+' + id.replace('@s.whatsapp.net', '')).getNumber('international')
      } else {
        v = id === '0@s.whatsapp.net' ? { id, name: 'WhatsApp' } : id === XeonBotInc.decodeJid(XeonBotInc.user?.id) ? XeonBotInc.user : store.contacts[id] || {}
        return (withoutContact ? '' : v.name) || v.subject || v.verifiedName || PhoneNumber('+' + jid.replace('@s.whatsapp.net', '')).getNumber('international')
      }
    }

    XeonBotInc.public = false
    XeonBotInc.serializeM = (m) => smsg(XeonBotInc, m, store)

    XeonBotInc.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect } = update
      if (connection === 'open') {
        console.log(chalk.yellow(`\n🌿 Connected as ${JSON.stringify(XeonBotInc.user, null, 2)}`))

        // --- Startup message preserved ---
        try {
          const botNumber = XeonBotInc.user.id.split(':')[0] + '@s.whatsapp.net'
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
          console.log(chalk.green(`✅ ${settings.botName} is running!`))
        } catch (e) { console.error('Startup message error:', e) }

      }

      if (connection === 'close' && lastDisconnect?.error?.output?.statusCode != 401) {
        console.log(chalk.red('Connection closed unexpectedly — restarting...'))
        setTimeout(() => startXeonBotInc().catch(() => {}), 2000)
      }
    })

    XeonBotInc.ev.on('creds.update', saveCreds)
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
