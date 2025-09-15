import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"
import makeWASocket, {
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
} from "@whiskeysockets/baileys"
import P from "pino"
import readline from "readline"
import PhoneNumber from "awesome-phonenumber"
import settings from "./settings.js"

// ===== ES Module dirname fix =====
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// ===== Commands Loader =====
const commands = new Map()
const commandsPath = path.join(__dirname, "commands")

if (fs.existsSync(commandsPath)) {
  fs.readdirSync(commandsPath).forEach((file) => {
    if (file.endsWith(".js")) {
      const filePath = path.join(commandsPath, file)
      import(filePath).then((cmdModule) => {
        try {
          let name = cmdModule.name || file.replace(".js", "").toLowerCase()
          let executeFn = null

          if (typeof cmdModule === "function") {
            executeFn = cmdModule
          } else if (cmdModule.execute) {
            executeFn = cmdModule.execute
          } else if (cmdModule.default && typeof cmdModule.default === "function") {
            executeFn = cmdModule.default
          } else {
            for (const key in cmdModule) {
              if (typeof cmdModule[key] === "function") {
                executeFn = cmdModule[key]
                break
              }
            }
          }

          if (executeFn) {
            commands.set(name.toLowerCase(), { execute: executeFn, raw: cmdModule })
            if (cmdModule.alias && Array.isArray(cmdModule.alias)) {
              cmdModule.alias.forEach((alias) => {
                commands.set(alias.toLowerCase(), { execute: executeFn, raw: cmdModule })
              })
            }
            console.log(`✅ Loaded command: ${name}`)
          } else {
            console.warn(`⚠️ No executable function found in ${file}`)
          }
        } catch (err) {
          console.error(`❌ Error loading command ${file}:`, err)
        }
      })
    }
  })
} else {
  console.warn("⚠️ Commands folder not found!")
}

// ===== Message Handler =====
async function handleMessage(sock, msg) {
  const senderId = msg.key.remoteJid
  const messageText =
    msg.message?.conversation ||
    msg.message?.extendedTextMessage?.text ||
    msg.message?.imageMessage?.caption ||
    ""

  if (messageText.startsWith(settings.prefix)) {
    const args = messageText.slice(settings.prefix.length).trim().split(/ +/)
    const cmdName = args.shift().toLowerCase()

    if (commands.has(cmdName)) {
      try {
        await commands.get(cmdName).execute(sock, msg, args)
      } catch (err) {
        console.error(`❌ Error executing command ${cmdName}:`, err)
        await sock.sendMessage(senderId, {
          text: `⚠️ Error running this command: ${err.message}`,
        })
      }
    }
  }
}

async function handleMessages(sock, m) {
  if (!m) return

  if (m.messages && Array.isArray(m.messages)) {
    for (const msg of m.messages) {
      if (!msg.message || msg.key.fromMe || msg.key.remoteJid === "status@broadcast") continue
      await handleMessage(sock, msg)
    }
    return
  }

  if (Array.isArray(m)) {
    for (const msg of m) {
      if (!msg.message || msg.key.fromMe || msg.key.remoteJid === "status@broadcast") continue
      await handleMessage(sock, msg)
    }
    return
  }

  if (m.message) {
    if (!m.key.fromMe && m.key.remoteJid !== "status@broadcast") {
      await handleMessage(sock, m)
    }
  }
}

async function handleGroupParticipantsUpdate(sock, update) {
  console.log("👥 Group participant update:", update)
}

async function handleStatus(sock, status) {
  console.log("📢 Status update:", status)
}

// ====== SESSION HELPERS ======
const rl = process.stdin.isTTY
  ? readline.createInterface({ input: process.stdin, output: process.stdout })
  : null
const ask = (q) =>
  new Promise((resolve) => {
    if (rl) rl.question(q, (a) => resolve(a))
    else resolve("")
  })

const encodeSession = (state) =>
  Buffer.from(JSON.stringify(state)).toString("base64")
const decodeSession = (b64) =>
  JSON.parse(Buffer.from(b64, "base64").toString("utf-8"))

// ===== Bot Startup =====
async function startBot() {
  const inputSession = (await ask("Enter your SESSION_ID (press Enter to pair new): ")).trim()

  // Try load session
  if (inputSession) {
    try {
      const parsed = decodeSession(inputSession)
      if (!fs.existsSync("./session")) fs.mkdirSync("./session", { recursive: true })
      fs.writeFileSync("./session/session.json", JSON.stringify(parsed, null, 2))
      if (parsed.creds) fs.writeFileSync("./session/creds.json", JSON.stringify(parsed.creds, null, 2))
      if (parsed.keys) fs.writeFileSync("./session/keys.json", JSON.stringify(parsed.keys, null, 2))
      console.log("✅ Loaded SESSION_ID into ./session")
    } catch (e) {
      console.warn("⚠️ Invalid SESSION_ID, fallback to pairing flow.")
    }
  }

  const { state, saveCreds } = await useMultiFileAuthState("session")
  let { version } = await fetchLatestBaileysVersion()

  const sock = makeWASocket({
    version,
    logger: P({ level: "silent" }),
    printQRInTerminal: false,
    auth: state,
  })

  sock.ev.on("creds.update", saveCreds)

  sock.ev.on("connection.update", async (update) => {
    if (update.connection === "open") {
      console.log(`✅ ${settings.botName} Connected!`)
      console.log(`📢 Channel: ${settings.channelLink}`)

      // export SESSION_ID
      const exportState = { creds: state.creds, keys: state.keys }
      const exported = encodeSession(exportState)

      fs.writeFileSync("./session/session.base64", exported)
      fs.writeFileSync("./session.txt", exported)
      console.log("\n🔐 SESSION_ID (base64):\n" + exported + "\n")

      // send to your own chat
      const selfJid = sock.user.id.split(":")[0] + "@s.whatsapp.net"
      await sock.sendMessage(selfJid, {
        text: `✅ Bot paired successfully!\n\n📌 SESSION_ID:\n${exported}`,
      })
    } else if (update.connection === "close") {
      const statusCode = update.lastDisconnect?.error?.output?.statusCode
      if (statusCode === 401 || statusCode === 428) {
        console.log("❌ Logged out or session invalid. Delete session folder and re-run.")
      } else {
        console.log("🔄 Reconnecting...")
        startBot()
      }
    }
  })

  sock.ev.on("messages.upsert", async ({ messages, type }) => {
    await handleMessages(sock, { messages, type })
  })

  sock.ev.on("group-participants.update", async (update) => {
    await handleGroupParticipantsUpdate(sock, update)
  })

  console.log(`🚀 ${settings.botName} started successfully!`)
}

export {
  startBot,
  handleMessage,
  handleMessages,
  handleGroupParticipantsUpdate,
  handleStatus,
  commands,
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  startBot()
}
