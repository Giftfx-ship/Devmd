const fs = require("fs");
const path = require("path");
const makeWASocket = require("@whiskeysockets/baileys").default;
const { useMultiFileAuthState } = require("@whiskeysockets/baileys");
const P = require("pino");

// ===== Ban System =====
const bannedFile = path.join(__dirname, "banned.json");
let bannedUsers = [];

if (fs.existsSync(bannedFile)) {
  bannedUsers = JSON.parse(fs.readFileSync(bannedFile, "utf8"));
}

function saveBans() {
  fs.writeFileSync(bannedFile, JSON.stringify(bannedUsers, null, 2));
}

function isBanned(id) {
  return bannedUsers.includes(id);
}

function banUser(id) {
  if (!bannedUsers.includes(id)) {
    bannedUsers.push(id);
    saveBans();
  }
}

function unbanUser(id) {
  bannedUsers = bannedUsers.filter((user) => user !== id);
  saveBans();
}

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
          commands.set(name.toLowerCase(), { execute: executeFn, raw: cmdModule });
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

  // Ban check
  if (isBanned(senderId) && !messageText.startsWith(".unban")) {
    console.log(`🚫 Banned user tried to use command: ${senderId}`);
    return;
  }

  // Ban/unban commands
  if (messageText.startsWith(".ban ")) {
    const target = messageText.split(" ")[1];
    banUser(target);
    await sock.sendMessage(senderId, { text: `✅ ${target} has been banned.` });
    return;
  }

  if (messageText.startsWith(".unban ")) {
    const target = messageText.split(" ")[1];
    unbanUser(target);
    await sock.sendMessage(senderId, { text: `✅ ${target} has been unbanned.` });
    return;
  }

  // Normal commands
  if (messageText.startsWith(".")) {
    const args = messageText.slice(1).trim().split(/ +/);
    const cmdName = args.shift().toLowerCase();

    if (commands.has(cmdName)) {
      try {
        await commands.get(cmdName).execute(sock, msg, args);
      } catch (err) {
        console.error(`❌ Error executing command ${cmdName}:`, err);
        await sock.sendMessage(senderId, { text: "⚠️ Error running this command." });
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
  const sessionPath = path.join(__dirname, "session");
  let sock;
  let saveCreds;

  if (fs.existsSync(sessionPath)) {
    // Load saved session
    const auth = await useMultiFileAuthState("session");
    sock = makeWASocket({
      logger: P({ level: "silent" }),
      printQRInTerminal: false,
      auth: auth.state,
    });
    saveCreds = auth.saveCreds;
  } else {
    // First time run: request pairing
    const readline = require("readline").createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    const number = await new Promise((resolve) => {
      readline.question("📞 Enter your WhatsApp number (e.g. 2348123456789): ", resolve);
    });
    readline.close();

    sock = makeWASocket({
      logger: P({ level: "silent" }),
      printQRInTerminal: false,
    });

    const code = await sock.requestPairingCode(number);
    console.log(`📲 Pairing Code for ${number}: ${code}`);

    sock.ev.on("connection.update", async (update) => {
      if (update.connection === "open") {
        console.log("✅ Connected! Saving session...");
        const auth = await useMultiFileAuthState("session");
        saveCreds = auth.saveCreds;
        Object.assign(sock.authState, auth.state);
        await saveCreds();
        console.log("💾 Session saved.");
      }
    });
  }

  if (saveCreds) {
    sock.ev.on("creds.update", saveCreds);
  }

  sock.ev.on("messages.upsert", async ({ messages, type }) => {
    await handleMessages(sock, { messages, type });
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
