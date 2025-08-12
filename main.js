const fs = require("fs");
const path = require("path");
const makeWASocket = require("@whiskeysockets/baileys").default;
const { useMultiFileAuthState } = require("@whiskeysockets/baileys");
const P = require("pino");

// Ban system
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

// Load commands - support multiple export styles
const commands = new Map();
const commandsPath = path.join(__dirname, "commands");

if (fs.existsSync(commandsPath)) {
  fs.readdirSync(commandsPath).forEach((file) => {
    if (file.endsWith(".js")) {
      const filePath = path.join(commandsPath, file);
      try {
        const cmdModule = require(filePath);

        // Try to find the command name & function in various ways
        let name = cmdModule.name || file.replace(".js", "").toLowerCase();
        let executeFn = null;

        if (typeof cmdModule === "function") {
          executeFn = cmdModule; // default export function
        } else if (cmdModule.execute) {
          executeFn = cmdModule.execute;
        } else if (cmdModule.default && typeof cmdModule.default === "function") {
          executeFn = cmdModule.default;
        } else {
          // Try to find any async function exported (e.g. autoStatusCommand)
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

// MAIN BOT START
async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState("session");
  const sock = makeWASocket({
    logger: P({ level: "silent" }),
    printQRInTerminal: true,
    auth: state,
  });

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("messages.upsert", async (m) => {
    const msg = m.messages[0];
    if (!msg.message || msg.key.fromMe) return;

    const senderId = msg.key.remoteJid;
    const messageText = msg.message.conversation || msg.message.extendedTextMessage?.text || "";

    // Ban check
    if (isBanned(senderId) && !messageText.startsWith(".unban")) {
      console.log(`🚫 Banned user tried to use command: ${senderId}`);
      return;
    }

    // Ban/unban internal commands
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

    // Commands start with '.'
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
  });
}

startBot();
