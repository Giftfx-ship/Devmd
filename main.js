import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"
import makeWASocket, {
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
  jidNormalizedUser,
} from "@whiskeysockets/baileys"
import P from "pino"
import readline from "readline"
import PhoneNumber from "awesome-phonenumber"
import { Boom } from "@hapi/boom"
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
      import(filePath)
        .then((cmdModule) => {
          let name = cmdModule.name || file.replace(".js", "").toLowerCase()
          let executeFn =
            typeof cmdModule === "function"
              ? cmdModule
              : cmdModule.execute ||
                (cmdModule.default && typeof cmdModule.default === "function"
                  ? cmdModule.default
                  : null)

          if (!executeFn) {
            for (const key in cmdModule) {
              if (typeof cmdModule[key] === "function") {
                executeFn = cmdModule[key]
                break
              }
            }
          }

          if (executeFn) {
            commands.set(name.toLowerCase(), { execute: executeFn, raw: cmdModule })
            if (Array.isArray(cmdModule.alias)) {
              cmdModule.alias.forEach((alias) =>
                commands.set(alias.toLowerCase(), { execute: executeFn, raw: cmdModule })
              )
            }
            console.log(`✅ Loaded command: ${name}`)
          } else {
            console.warn(`⚠️ No executable function found in ${file}`)
          }
        })
        .catch((err) => console.error(`❌ Error loading ${file}:`, err))
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
          text: `⚠️ Error running command: ${err.message}`,
        })
      }
    }
  }
}

async function handleMessages(sock, m) {
  if (!m) return
  const list = Array.isArray(m.messages) ? m.messages : [m]
  for (const msg of list) {
    if (!msg.message || msg.key.fromMe || msg.key.remoteJid === "status@broadcast") continue
    await handleMessage(sock, msg)
  }
}

// ===== Helpers =====
const rl = process.stdin.isTTY
  ? readline.createInterface({ input: process.stdin, output: process.stdout })
  : null
const ask = (q) =>
  new Promise((resolve) => (rl ? rl.question(q, (a) => resolve(a)) : resolve("")))

const encodeSession = (state) =>
  Buffer.from(JSON.stringify(state)).toString("base64")
const decodeSession = (b64) =>
  JSON.parse(Buffer.from(b64, "base64").toString("utf-8"))

// ===== MAIN BOT =====
async function startBot() {
  const inputSession = (await ask("Enter your SESSION_ID (press Enter to pair new): ")).trim()

  // Load SESSION_ID if provided
  if (inputSession) {
    try {
      const parsed = decodeSession(inputSession)
      if (!fs.existsSync("./session")) fs.mkdirSync("./session", { recursive: true })
      fs.writeFileSync("./session/session.json", JSON.stringify(parsed, null, 2))
      if (parsed.creds) fs.writeFileSync("./session/creds.json", JSON.stringify(parsed.creds, null, 2))
      if (parsed.keys) fs.writeFileSync("./session/keys.json", JSON.stringify(parsed.keys, null, 2))
      console.log("✅ Loaded SESSION_ID into ./session")
    } catch {
      console.warn("⚠️ Invalid SESSION_ID — fallback to pairing flow.")
    }
  }

  const { state, saveCreds } = await useMultiFileAuthState("session")
  const { version } = await fetchLatestBaileysVersion()

  // ✅ cacheable key store (Baileys v7 requirement)
  const logger = P({ level: "silent" })
  const cachedKeys = makeCacheableSignalKeyStore(state.keys, logger)

  const sock = makeWASocket({
    version,
    logger,
    printQRInTerminal: false,
    browser: ["Ubuntu", "Chrome", "22.04"],
    auth: { creds: state.creds, keys: cachedKeys },
    generateHighQualityLinkPreview: true,
  })

  sock.ev.on("creds.update", saveCreds)

  // ====== Pairing Flow ======
  if (!sock.authState.creds.registered) {
    const phone = (await ask("📱 Enter your phone number (e.g. 2348012345678): ")).trim()
    const num = new PhoneNumber("+" + phone)
    if (!num.isValid()) {
      console.error("❌ Invalid number. Restart bot.")
      process.exit(1)
    }

    const code = await sock.requestPairingCode(phone)
    const formatted = code?.match(/.{1,4}/g)?.join("-") || code
    console.log(`\n✅ Your Pairing Code: ${formatted}`)
    console.log("👉 Open WhatsApp → Linked Devices → Link with code")
  }

  // ====== Connection Updates ======
  sock.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect } = update
    if (connection === "open") {
      console.log(`✅ ${settings.botName} Connected!`)
      const sessionData = { creds: state.creds, keys: state.keys }
      const exported = encodeSession(sessionData)
      fs.writeFileSync("./session/session.base64", exported)
      fs.writeFileSync("./session.txt", exported)
      console.log("\n🔐 SESSION_ID:\n" + exported + "\n")
      const selfJid = jidNormalizedUser(sock.user.id)
      await sock.sendMessage(selfJid, { text: `✅ Bot paired successfully!\n\nSESSION_ID:\n${exported}` })
    } else if (connection === "close") {
      const status = new Boom(lastDisconnect?.error)?.output?.statusCode
      if (status === 401) {
        console.log("❌ Logged out. Delete session folder and re-pair.")
      } else {
        console.log("🔄 Connection closed, retrying...")
        startBot()
      }
    }
  })

  // ====== Events ======
  sock.ev.on("messages.upsert", async (m) => await handleMessages(sock, m))
  sock.ev.on("group-participants.update", async (update) =>
    console.log("👥 Group participants update:", update)
  )

  console.log(`🚀 ${settings.botName} started successfully on Baileys v7!`)
}

export { startBot }

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  startBot()
}
