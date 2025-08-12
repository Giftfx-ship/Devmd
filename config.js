module.exports = {
  botName: "DEVMD",
  ownerName: "𝐌𝐑ܮ𝐃𝐄𝐕『ᴾᴿᴵ́ᴹᴱ́』",
  ownerNumber: "2349164624021",
  ownerContactLink: `https://wa.me/2349164624021`,
  github: "https://github.com/Giftfx-ship/Devmd",
  channel: "https://whatsapp.com/channel/0029VbB3zXu9Gv7LXS62GA1F",
  
  prefix: ".",
  
  aliveMessage: `Hello! I am *DEVMD*, powered by 𝐌𝐑ܮ𝐃𝐄𝐕『ᴾᴿᴵ́ᴹᴱ́』`,

  sessionFolder: "./session",
  
  updateCheckIntervalMs: 10 * 60 * 1000, // 10 minutes
  
  commands: {
    owner: [
      "autoviewstatus",
      "restart",
      "shutdown",
      "broadcast",
      "block",
      "unblock",
      "mode",
      "clearsession",
      "setpp"
    ],
    group: [
      "antilink",
      "kick",
      "tagall",
      "mute",
      "unmute",
      "promote",
      "demote",
      "welcome",
      "goodbye"
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
      "joke",
      "quote",
      "play",
      "song",
      "simage",
      "tag",
      "warn",
      "warnings"
    ],
    ai: [
      "ai <query>",
      "imagine <prompt>",
      "chatbot on/off"
    ]
  }
};
