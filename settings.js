// ==========================
//  DEVMD BOT SETTINGS
// ==========================

export const owner = ["2349164624021"]; // Owner numbers (array for multi-owner support)
export const ownerName = "𝐌𝐑ܮ𝐃𝐄𝐕";
export const botName = "DEVMD";

// Links
export const github = "https://github.com/Giftfx-ship/Devmd";
export const channelLink = "https://whatsapp.com/channel/0029Vb6poDc3QxS2L0dxSq3E";
export const ownerContactLink = "https://wa.me/2349164624021";

// Bot behavior
export const prefix = "."; // Bot prefix
export const pairingCode = true; // ✅ Default: always pairing (no QR)

// Messages
export const aliveMessage = `✨ Hello! I am *${botName}*, created by ${ownerName}`;
export const welcomeMessage = `👋 Welcome to the group! I am ${botName}, here to assist.`;
export const goodbyeMessage = `👋 Goodbye! Hope to see you again.`;

// Command categories
export const commands = {
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
    "viewonce"   // ✅ Added viewonce command here
  ],
  ai: [
    "ai <query>",
    "imagine <prompt>",
    "chatbot on/off"
  ]
};

// === DEFAULT EXPORT FOR IMPORT SUPPORT ===
export default {
  owner,
  ownerName,
  botName,
  github,
  channelLink,
  ownerContactLink,
  prefix,
  pairingCode,
  aliveMessage,
  welcomeMessage,
  goodbyeMessage,
  commands
};
