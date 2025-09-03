// lib/channelInfo.js

const channelInfo = {
  contextInfo: {
    forwardingScore: 999, // always show as forwarded
    isForwarded: true,    // mark message as forwarded
    forwardedNewsletterMessageInfo: {
      newsletterJid: "120363161513685998@n", // channel JID
      newsletterName: "mrdev company MD",    // channel name
      serverMessageId: 1                     // just a reference ID
    }
  }
};

module.exports = { channelInfo };
