const settings = require("../settings");
async function aliveCommand(sock, chatId, message) {
    try {
        const message1 = `
  ᴬⁿᵈʳᵒᵐᵉᵈᵃ ˣʳ ᵇᵒᵗ, ᵒⁿˡⁱⁿᵉ ᵃⁿᵈ ʳᵉˢᵖᵒⁿˢⁱᵛᵉ. ᴵᵗˢ ˢⁱᵍⁿᵃˡˢ ᵃʳᵉ ᵗʳᵃᵛᵉˡⁱⁿᵍ ᶠᵃˢᵗᵉʳ ᵗʰᵃⁿ ˡⁱᵍʰᵗ ⁱᵗˢᵉˡᶠ.
        `;
        await sock.sendMessage(chatId, {
            text: message1,
            contextInfo: {
                forwardingScore: 999,
                isForwarded: true,
                forwardedNewsletterMessageInfo: {
                    newsletterJid: '0029VajbiIfAjPXO45zG2i2c@newsletter',
                    newsletterName: '𝑨𝒏𝒅𝒓𝒐𝒎𝒆𝒅𝒂 𝕏Ɽ͎',
                    serverMessageId: -1
                }
            }
        }, { quoted: message });
    } catch (error) {
        console.error('Error in alive command:', error);
        await sock.sendMessage(chatId, { text: 'Bot is alive and running!' }, { quoted: message });
    }
}

module.exports = aliveCommand;