module.exports = {
  botName: "DEVMD",
  ownerName: "𝐌𝐑ܮ𝐃𝐄𝐕",
  ownerNumber: "2349164624021",
  ownerContactLink: "https://wa.me/2349164624021",
  github: "https://github.com/Giftfx-ship/Devmd",
  channel: "https://whatsapp.com/channel/0029VbB3zXu9Gv7LXS62GA1F",
  
  prefix: ".",

  aliveMessage: `Hello! I am *DEVMD*, powered by 𝐌𝐑ܮ𝐃𝐄𝐕『ᴾᴿᴵ́ᴹᴱ́』`,

  sessionFolder: "./session",

  updateCheckIntervalMs: 10 * 60 * 1000, // 10 minutes

  // 🔰 Commands grouped by category
  commands: {
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
      "viewonce"
    ],
    ai: [
      "ai <query>",
      "imagine <prompt>",
      "chatbot on/off"
    ]
  }
};
