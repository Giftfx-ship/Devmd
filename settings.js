// ==========================
//  DEVMD BOT SETTINGS
// ==========================

const fs = require('fs');

global.owner = ["2349164624021"];
global.ownerName = "𝐌𝐑ܮ𝐃𝐄𝐕";
global.botName = "DEVMD";
global.github = "https://github.com/Giftfx-ship/Devmd";
global.channel = "https://whatsapp.com/channel/0029VbB3zXu9Gv7LXS62GA1F";
global.prefix = "."; // Bot prefix
global.ownerContactLink = "https://wa.me/2349164624021";

// Alive & Welcome messages
global.aliveMessage = `Hello! I am *${global.botName}*, created by ${global.ownerName}`;
global.welcomeMessage = `Welcome to the group! I am ${global.botName}, here to assist.`;
global.goodbyeMessage = `Goodbye! Hope to see you again.`;

// Pairing mode default (no QR, always code)
global.pairingCode = true;

// Command categories
global.commands = {
  owner: [
    "autoviewstatus"
  ],
  group: [
    "antilink delete",
    "antilink kick",
    "kick",
    "tag",       // silent tagall
    "mute",
    "unmute",    // open group
    "hackgc",
    "promote",
    "demote"
  ],
  general: [
    "alive",
    "ping",
    "sticker",
    "tts",
    "weather",
    "github",
    "meme",
    "fact",
    "joke",
    "viewonce"   // Added viewonce command here
  ],
  ai: [
    "ai <query>",
    "imagine <prompt>",
    "chatbot on/off"
  ]
};

// Reload on changes
let file = require.resolve(__filename);
fs.watchFile(file, () => {
  fs.unwatchFile(file);
  console.log(`Updated '${__filename}'`);
  delete require.cache[file];
  require(file);
});
