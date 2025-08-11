async function handleMessages(sock, messageUpdate, printLog) {
    try {
        const { messages, type } = messageUpdate;
        if (type !== 'notify') return;

        const message = messages[0];
        if (!message?.message) return;

        // Store message for antidelete feature
        if (message.message) {
            storeMessage(message);
        }

        // Handle message revocation
        if (message.message?.protocolMessage?.type === 0) {
            await handleMessageRevocation(sock, message);
            return;
        }

        const chatId = message.key.remoteJid;
        const senderId = message.key.participant || message.key.remoteJid;
        const isGroup = chatId.endsWith('@g.us');

        const userMessage = (
            message.message?.conversation?.trim() ||
            message.message?.extendedTextMessage?.text?.trim() ||
            message.message?.imageMessage?.caption?.trim() ||
            message.message?.videoMessage?.caption?.trim() ||
            ''
        ).toLowerCase().replace(/\.\s+/g, '.').trim();

        const rawText = message.message?.conversation?.trim() ||
            message.message?.extendedTextMessage?.text?.trim() ||
            message.message?.imageMessage?.caption?.trim() ||
            message.message?.videoMessage?.caption?.trim() ||
            '';

        if (userMessage.startsWith('.')) {
            console.log(`📝 Command used in ${isGroup ? 'group' : 'private'}: ${userMessage}`);
        }

        // Ban check
        if (isBanned(senderId) && !userMessage.startsWith('.unban')) {
            if (Math.random() < 0.1) {
                await sock.sendMessage(chatId, {
                    text: '❌ You are banned from using the bot. Contact an admin to get unbanned.',
                    ...channelInfo
                });
            }
            return;
        }

        // Game moves first
        if (/^[1-9]$/.test(userMessage) || userMessage.toLowerCase() === 'surrender') {
            await handleTicTacToeMove(sock, chatId, senderId, userMessage);
            return;
        }

        if (!message.key.fromMe) incrementMessageCount(chatId, senderId);

        // Bad word check in group
        if (isGroup && userMessage) {
            await handleBadwordDetection(sock, chatId, message, userMessage, senderId);
        }

        // Non-command messages in groups
        if (!userMessage.startsWith('.')) {
            if (isGroup) {
                await handleChatbotResponse(sock, chatId, message, userMessage, senderId);
                await Antilink(message, sock);
                await handleBadwordDetection(sock, chatId, message, userMessage, senderId);
            }
            return;
        }

        // Admin and owner commands arrays
        const adminCommands = ['.mute', '.unmute', '.ban', '.unban', '.promote', '.demote', '.kick', '.tagall', '.antilink'];
        const ownerCommands = ['.mode', '.autostatus', '.antidelete', '.cleartmp', '.setpp', '.clearsession', '.areact', '.autoreact'];

        let isSenderAdmin = false;
        let isBotAdmin = false;

        if (isGroup && adminCommands.some(cmd => userMessage.startsWith(cmd))) {
            const adminStatus = await isAdmin(sock, chatId, senderId, message);
            isSenderAdmin = adminStatus.isSenderAdmin;
            isBotAdmin = adminStatus.isBotAdmin;

            if (!isBotAdmin) {
                await sock.sendMessage(chatId, { text: 'Please make the bot an admin to use admin commands.', ...channelInfo }, { quoted: message });
                return;
            }

            if (
                ['.mute', '.unmute', '.ban', '.unban', '.promote', '.demote'].some(cmd => userMessage.startsWith(cmd)) &&
                !isSenderAdmin && !message.key.fromMe
            ) {
                await sock.sendMessage(chatId, { text: 'Sorry, only group admins can use this command.', ...channelInfo });
                return;
            }
        }

        if (ownerCommands.some(cmd => userMessage.startsWith(cmd))) {
            if (!message.key.fromMe) {
                await sock.sendMessage(chatId, { text: '❌ This command is only available for the owner!', ...channelInfo });
                return;
            }
        }

        // Access mode check for owner only mode
        try {
            const data = JSON.parse(fs.readFileSync('./data/messageCount.json'));
            if (!data.isPublic && !message.key.fromMe) return;
        } catch (error) {
            console.error('Error reading access mode:', error);
        }

        // Commands switch
        switch (true) {
            case userMessage === '.simage': {
                const quotedMsg = message.message?.extendedTextMessage?.contextInfo?.quotedMessage;
                if (quotedMsg?.stickerMessage) {
                    await simageCommand(sock, quotedMsg, chatId);
                } else {
                    await sock.sendMessage(chatId, { text: 'Please reply to a sticker with .simage command.', ...channelInfo });
                }
                break;
            }
            case userMessage.startsWith('.kick'):
                {
                    const mentioned = message.message.extendedTextMessage?.contextInfo?.mentionedJid || [];
                    await kickCommand(sock, chatId, senderId, mentioned, message);
                }
                break;
            case userMessage.startsWith('.mute'):
                {
                    const muteDuration = parseInt(userMessage.split(' ')[1]);
                    if (isNaN(muteDuration)) {
                        await sock.sendMessage(chatId, { text: 'Please provide valid mute duration in minutes, e.g. .mute 10', ...channelInfo });
                    } else {
                        await muteCommand(sock, chatId, senderId, muteDuration);
                    }
                }
                break;
            case userMessage === '.unmute':
                await unmuteCommand(sock, chatId, senderId);
                break;
            case userMessage.startsWith('.ban'):
                await banCommand(sock, chatId, message);
                break;
            case userMessage.startsWith('.unban'):
                await unbanCommand(sock, chatId, message);
                break;
            case userMessage === '.help' || userMessage === '.menu' || userMessage === '.bot' || userMessage === '.list':
                await helpCommand(sock, chatId, message);
                break;
            case userMessage === '.sticker' || userMessage === '.s':
                await stickerCommand(sock, chatId, message);
                break;
            case userMessage.startsWith('.warnings'):
                {
                    const mentioned = message.message.extendedTextMessage?.contextInfo?.mentionedJid || [];
                    await warningsCommand(sock, chatId, mentioned);
                }
                break;
            case userMessage.startsWith('.warn'):
                {
                    const mentioned = message.message.extendedTextMessage?.contextInfo?.mentionedJid || [];
                    await warnCommand(sock, chatId, senderId, mentioned, message);
                }
                break;
            case userMessage.startsWith('.tts'):
                {
                    const text = userMessage.slice(4).trim();
                    await ttsCommand(sock, chatId, text, message);
                }
                break;
            case userMessage === '.delete' || userMessage === '.del':
                await deleteCommand(sock, chatId, message, senderId);
                break;
            case userMessage.startsWith('.attp'):
                await attpCommand(sock, chatId, message);
                break;
            case userMessage.startsWith('.mode'):
                if (!message.key.fromMe) {
                    await sock.sendMessage(chatId, { text: '❌ This command is only available for the owner!', ...channelInfo });
                    return;
                }
                // Your mode command logic here, e.g. toggle bot modes
                await sock.sendMessage(chatId, { text: 'Mode command executed.', ...channelInfo });
                break;

            // Add other cases here...

            default:
                // Handle unknown commands or ignore
                break;
        }
    } catch (error) {
        console.error('Error in handleMessages:', error);
        // Optionally notify user of error here
    }
        }
