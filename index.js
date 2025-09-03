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

// Store system
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

// Global configs
global.botname = settings.botName
global.themeemoji = settings.themeEmoji

const pairingCode = !!settings.phoneNumber || process.argv.includes('--pairing-code')
const useMobile = process.argv.includes('--mobile')

// readline for pairing code
const rl = process.stdin.isTTY ? readline.createInterface({ input: process.stdin, output: process.stdout }) : null
const question = (text) => {
  if (rl) {
    return new Promise((resolve) => rl.question(text, resolve))
  } else {
    return Promise.resolve(settings.ownerNumber || settings.phoneNumber)
  }
}

async function startXeonBotInc() {
  let { version } = await fetchLatestBaileysVersion()
  const { state, saveCreds } = await useMultiFileAuthState('./session')
  const msgRetryCounterCache = new NodeCache()

  const XeonBotInc = makeWASocket({
    version,
    logger: pino({ level: 'silent' }),
    printQRInTerminal: !pairingCode,
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

  store.bind(XeonBotInc.ev)

  // Messages
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
          : id === XeonBotInc.decodeJid(XeonBotInc.user.id)
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

  // Pairing
  if (pairingCode && !XeonBotInc.authState.creds.registered) {
    if (useMobile) throw new Error('Cannot use pairing code with mobile api')

    let phoneNumber = settings.phoneNumber || (await question('Enter your phone number: '))
    phoneNumber = phoneNumber.replace(/[^0-9]/g, '')

    const pn = new PhoneNumber('+' + phoneNumber)
    if (!pn.isValid()) {
      console.log(chalk.red('❌ Invalid phone number. Please enter correctly.'))
      process.exit(1)
    }

    setTimeout(async () => {
      try {
        let code = await XeonBotInc.requestPairingCode(phoneNumber)
        code = code?.match(/.{1,4}/g)?.join('-') || code
        console.log(chalk.green(`✅ Your Pairing Code: ${code}`))
        console.log(chalk.yellow(`\nOpen WhatsApp → Linked Devices → Link with code`))
      } catch (error) {
        console.error('Error requesting pairing code:', error)
      }
    }, 3000)
  }

  // Connection
  XeonBotInc.ev.on('connection.update', async (s) => {
    const { connection, lastDisconnect } = s
    if (connection == 'open') {
      console.log(chalk.yellow(`🌿 Connected as ${JSON.stringify(XeonBotInc.user, null, 2)}`))

      const botNumber = XeonBotInc.user.id.split(':')[0] + '@s.whatsapp.net'
      await XeonBotInc.sendMessage(botNumber, {
        text: `
匚ㄖ几Ꮆ尺卂ㄒㄩㄥ卂ㄒ丨ㄖ几丂! 🚀
\n💠 *${settings.botName} Connected Successfully!*
\n⏰ *Time:* ${new Date().toLocaleString()}
\n✅ *Status:* Alive & Ready for Takeoff
\n\n📢 *Stay Updated:*  
${settings.channelLink}
\n💬 *Official Group:*  
${settings.groupLink}
\n\n© 2025 *${settings.botName}* — made by ${settings.ownerName}
        `,
      })

      await delay(2000)
      console.log(chalk.green(`✅ ${settings.botName} is running!`))
    }
    if (connection === 'close' && lastDisconnect?.error?.output?.statusCode != 401) {
      startXeonBotInc()
    }
  })

  XeonBotInc.ev.on('creds.update', saveCreds)
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
}

startXeonBotInc().catch((error) => {
  console.error('Fatal error:', error)
  process.exit(1)
})

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
