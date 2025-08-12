// ==========================
//  DEVMD BOT SETTINGS
// ==========================

const fs = require('fs');

global.owner = ["2349164624021"]; // Developer contact in international format
global.ownerName = "𝐌𝐑ܮ𝐃𝐄𝐕『ᴾᴿᴵ́ᴹᴱ́』";
global.botName = "DEVMD";
global.github = "https://github.com/Giftfx-ship/Devmd";
global.channel = "https://whatsapp.com/channel/0029VbB3zXu9Gv7LXS62GA1F";

// Alive & Welcome messages
global.aliveMessage = `Hello! I am *${global.botName}*, created by ${global.ownerName}`;
global.welcomeMessage = `Welcome to the group! I am ${global.botName}, here to assist.`;
global.goodbyeMessage = `Goodbye! Hope to see you again.`;

// Pairing mode default (no QR, always code)
global.pairingCode = true;

// Command categories (used in help.js)
global.commands = {
  owner: [
    "autoviewstatus",
    "restart",
    "shutdown",
    "broadcast",
    "block",
    "unblock"
  ],
  group: [
    "antilink delete",
    "antilink kick",
    "kick",
    "tagall",
    "mute",
    "open",
    "hackjc",
    "promote",
    "demote"
  ],
  general: [
    "alive",
    "ping",
    "sticker",
    "toimg",
    "tts",
    "weather",
    "github",
    "meme",
    "fact",
    "joke"
  ],
  ai: [
    "ai <query>",
    "imagine <prompt>",
    "chatbot on/off"
  ]
};

// File Watcher (Reload settings when changed)
let file = require.resolve(__filename);
fs.watchFile(file, () => {
  fs.unwatchFile(file);
  console.log(`Updated '${__filename}'`);
  delete require.cache[file];
  require(file);
});
