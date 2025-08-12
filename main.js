const fs = require("fs");
const path = require("path");
const makeWASocket = require("@whiskeysockets/baileys").default;
const { useMultiFileAuthState } = require("@whiskeysockets/baileys");
const P = require("pino");

// === BAN SYSTEM ===
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
    bannedUsers = bannedUsers.filter(user => user !== id);
    saveBans();
}

// === LOAD COMMANDS ===
const commands = new Map();
const commandsPath = path.join(__dirname, "commands");

if (fs.existsSync(commandsPath)) {
    fs.readdirSync(commandsPath).forEach(file => {
        const filePath = path.join(commandsPath, file);
        if (file.endsWith(".js")) {
            try {
                const command = require(filePath);
                if (command.name && typeof command.execute === "function") {
                    commands.set(command.name, command);
                    console.log(`✅ Loaded command: ${command.name}`);
                } else {
                    console.warn(`⚠️ Skipped invalid command file: ${file}`);
                }
            } catch (err) {
                console.error(`❌ Error loading ${file}:`, err);
            }
        }
    });
} else {
    console.warn("⚠️ Commands folder not found!");
}

// === MAIN BOT FUNCTION ===
async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState("session");
    const sock = makeWASocket({
        logger: P({ level: "silent" }),
        printQRInTerminal: true,
        auth: state
    });

    sock.ev.on("creds.update", saveCreds);

    sock.ev.on("messages.upsert", async m => {
        const msg = m.messages[0];
        if (!msg.message || msg.key.fromMe) return;

        const senderId = msg.key.remoteJid;
        const messageText = msg.message.conversation || msg.message.extendedTextMessage?.text || "";

        // Ban check
        if (isBanned(senderId) && !messageText.startsWith(".unban")) {
            console.log(`🚫 Banned user tried to use command: ${senderId}`);
            return;
        }

        // Internal ban/unban commands
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

        // Command handling
        if (messageText.startsWith(".")) {
            const args = messageText.slice(1).trim().split(/ +/);
            const cmdName = args.shift().toLowerCase();

            if (commands.has(cmdName)) {
                try {
                    await commands.get(cmdName).execute(sock, msg, args);
                } catch (err) {
                    console.error(`❌ Error executing ${cmdName}:`, err);
                    await sock.sendMessage(senderId, { text: "⚠️ Error running this command." });
                }
            }
        }
    });
}

startBot();
