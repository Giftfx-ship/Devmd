const fs = require("fs");
const path = require("path");
const makeWASocket = require("@whiskeysockets/baileys").default;
const { useMultiFileAuthState } = require("@whiskeysockets/baileys");
const P = require("pino");

// ===== Load Commands =====
const commands = new Map();
const commandsPath = path.join(__dirname, "commands");

if (fs.existsSync(commandsPath)) {
  fs.readdirSync(commandsPath).forEach((file) => {
    if (file.endsWith(".js")) {
      const filePath = path.join(commandsPath, file);
      try {
        const cmdModule = require(filePath);
        let name = cmdModule.name || file.replace(".js", "").toLowerCase();
        let executeFn = null;

        if (typeof cmdModule === "function") {
          executeFn = cmdModule;
        } else if (cmdModule.execute) {
          executeFn = cmdModule.execute;
        } else if (cmdModule.default && typeof cmdModule.default === "function") {
          executeFn = cmdModule.default;
        } else {
          for (const key in cmdModule) {
            if (typeof cmdModule[key] === "function") {
              executeFn = cmdModule[key];
              break;
            }
          }
        }

        if (executeFn) {
          // Main command
          commands.set(name.toLowerCase(), { execute: executeFn, raw: cmdModule });
          
          // Alias support
          if (cmdModule.alias && Array.isArray(cmdModule.alias)) {
            cmdModule.alias.forEach(alias => {
              commands.set(alias.toLowerCase(), { execute: executeFn, raw: cmdModule });
            });
          }

          console.log(`✅ Loaded command: ${name}`);
        } else {
          console.warn(`⚠️ No executable function found in ${file}`);
        }
      } catch (err) {
        console.error(`❌ Error loading command ${file}:`, err);
      }
    }
  });
} else {
  console.warn("⚠️ Commands folder not found!");
}

// ===== Message Handler =====
async function handleMessage(sock, msg) {
  const senderId = msg.key.remoteJid;
  const messageText =
    msg.message?.conversation ||
    msg.message?.extendedTextMessage?.text ||
    msg.message?.imageMessage?.caption ||
    "";

  if (messageText.startsWith(".")) {
    const args = messageText.slice(1).trim().split(/ +/);
    const cmdName = args.shift().toLowerCase();

    if (commands.has(cmdName)) {
      try {
        await commands.get(cmdName).execute(sock, msg, args);
      } catch (err) {
        console.error(`❌ Error executing command ${cmdName}:`, err);
        await sock.sendMessage(senderId, { text: `⚠️ Error running this command: ${err.message}` });
      }
    }
  }
}

// ===== Compatibility Wrappers =====
async function handleMessages(sock, m) {
  if (!m) return;

  if (m.messages && Array.isArray(m.messages)) {
    for (const msg of m.messages) {
      if (!msg.message || msg.key.fromMe || msg.key.remoteJid === "status@broadcast") continue;
      await handleMessage(sock, msg);
    }
    return;
  }

  if (Array.isArray(m)) {
    for (const msg of m) {
      if (!msg.message || msg.key.fromMe || msg.key.remoteJid === "status@broadcast") continue;
      await handleMessage(sock, msg);
    }
    return;
  }

  if (m.message) {
    if (!m.key.fromMe && m.key.remoteJid !== "status@broadcast") {
      await handleMessage(sock, m);
    }
  }
}

async function handleGroupParticipantsUpdate(sock, update) {
  console.log("👥 Group participant update:", update);
}

async function handleStatus(sock, status) {
  console.log("📢 Status update:", status);
}

// ===== Bot Startup =====
async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState("session");

  const sock = makeWASocket({
    logger: P({ level: "silent" }),
    printQRInTerminal: false,
    auth: state,
  });

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", (update) => {
    if (update.connection === "open") {
      console.log("✅ Connected! Saving session...");
    } else if (update.connection === "close") {
      const statusCode = update.lastDisconnect?.error?.output?.statusCode;
      if (statusCode === 401 || statusCode === 428) {
        console.log("❌ Logged out or session invalid. Please delete session folder and re-run.");
      } else {
        console.log("🔄 Reconnected.");
      }
    }
  });

  sock.ev.on("messages.upsert", async ({ messages, type }) => {
    await handleMessages(sock, { messages, type });
  });

  sock.ev.on("group-participants.update", async (update) => {
    await handleGroupParticipantsUpdate(sock, update);
  });

  console.log("✅ Bot started successfully!");
}

module.exports = {
  startBot,
  handleMessage,
  handleMessages,
  handleGroupParticipantsUpdate,
  handleStatus,
};

if (require.main === module) {
  startBot();
                   }
