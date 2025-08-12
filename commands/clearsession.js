const fs = require('fs');
const path = require('path');
const os = require('os');

const channelInfo = {
    contextInfo: {
        forwardingScore: 999,
        isForwarded: true,
        forwardedNewsletterMessageInfo: {
            newsletterJid: '120363161513685998@newsletter',
            newsletterName: 'B͎E͎N͎Z͎I͎ C͎O͎M͎P͎A͎N͎Y͎ X͎M͎D͎',
            serverMessageId: -1
        }
    }
};

async function clearSessionCommand(sock, chatId, msg) {
    try {
        if (!msg.key.fromMe) {
            await sock.sendMessage(chatId, { 
                text: '❌ This command can only be used by the owner!\n\n© Created by Mr Dev Prime',
                ...channelInfo
            });
            return;
        }

        const sessionDir = path.join(__dirname, '../session');

        if (!fs.existsSync(sessionDir)) {
            await sock.sendMessage(chatId, { 
                text: '❌ Session directory not found!\n\n© Created by Mr Dev Prime',
                ...channelInfo
            });
            return;
        }

        let filesCleared = 0;
        let errors = 0;
        let errorDetails = [];

        await sock.sendMessage(chatId, { 
            text: `🔍 Optimizing session files for better performance...\n\n© Created by Mr Dev Prime`,
            ...channelInfo
        });

        const files = fs.readdirSync(sessionDir);
        
        let appStateSyncCount = 0;
        let preKeyCount = 0;

        for (const file of files) {
            if (file.startsWith('app-state-sync-')) appStateSyncCount++;
            if (file.startsWith('pre-key-')) preKeyCount++;
        }

        for (const file of files) {
            if (file === 'creds.json') continue;
            try {
                fs.unlinkSync(path.join(sessionDir, file));
                filesCleared++;
            } catch (error) {
                errors++;
                errorDetails.push(`Failed to delete ${file}: ${error.message}`);
            }
        }

        const message = `✅ Session files cleared successfully!\n\n` +
                       `📊 Statistics:\n` +
                       `• Total files cleared: ${filesCleared}\n` +
                       `• App state sync files: ${appStateSyncCount}\n` +
                       `• Pre-key files: ${preKeyCount}\n` +
                       (errors > 0 ? `\n⚠️ Errors encountered: ${errors}\n${errorDetails.join('\n')}` : '') +
                       `\n\n© Created by Mr Dev Prime`;

        await sock.sendMessage(chatId, { 
            text: message,
            ...channelInfo
        });

    } catch (error) {
        console.error('Error in clearsession command:', error);
        await sock.sendMessage(chatId, { 
            text: '❌ Failed to clear session files!\n\n© Created by Mr Dev Prime',
            ...channelInfo
        });
    }
}

module.exports = clearSessionCommand;
