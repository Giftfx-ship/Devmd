// ==========================
//  DEVMD BOT SETTINGS
// ==========================

export const owner = ["2349164624021"];
export const ownerName = "𝐌𝐑ܮ𝐃𝐄𝐕";
export const botName = "DEVMD";
export const github = "https://github.com/Giftfx-ship/Devmd";
export const channel = "https://whatsapp.com/channel/0029Vb6poDc3QxS2L0dxSq3E";
export const prefix = "."; // Bot prefix
export const ownerContactLink = "https://wa.me/2349164624021";

// Alive & Welcome messages
export const aliveMessage = `Hello! I am *${botName}*, created by ${ownerName}`;
export const welcomeMessage = `Welcome to the group! I am ${botName}, here to assist.`;
export const goodbyeMessage = `Goodbye! Hope to see you again.`;

// Pairing mode default (no QR, always code)
export const pairingCode = true;

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
    "viewonce"   // Added viewonce command here
  ],
  ai: [
    "ai <query>",
    "imagine <prompt>",
    "chatbot on/off"
  ]
};
