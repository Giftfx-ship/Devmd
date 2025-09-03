// commands/chatbot.js (ESM-ready)

import fs from "fs";
import path from "path";
import fetch from "node-fetch";
import settings from "../settings.js";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const channelInfo = {
  contextInfo: {
    forwardingScore: 1,
    isForwarded: true,
    forwardedNewsletterMessageInfo: {
      // keep your newsletter ID or move to settings if you prefer
      newsletterJid: "120363161513685998@newsletter",
      newsletterName: settings.botName,
      serverMessageId: -1,
    },
  },
};

// Use a stable project-level data dir in ESM
const USER_GROUP_DATA = path.join(process.cwd(), "data", "userGroupData.json");

// in-memory conversation state
const chatMemory = {
  messages: new Map(),
  userInfo: new Map(),
};

function ensureDataFile() {
  try {
    const dir = path.dirname(USER_GROUP_DATA);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    if (!fs.existsSync(USER_GROUP_DATA)) {
      fs.writeFileSync(USER_GROUP_DATA, JSON.stringify({ groups: [], chatbot: {} }, null, 2));
    }
  } catch (err) {
    console.error("❌ Error ensuring data file:", err.message);
  }
}

function loadUserGroupData() {
  ensureDataFile();
  try {
    return JSON.parse(fs.readFileSync(USER_GROUP_DATA, "utf-8"));
  } catch (error) {
    console.error("❌ Error loading user group data:", error.message);
    return { groups: [], chatbot: {} };
  }
}

function saveUserGroupData(data) {
  try {
    ensureDataFile();
    fs.writeFileSync(USER_GROUP_DATA, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error("❌ Error saving user group data:", error.message);
  }
}

function getRandomDelay() {
  return Math.floor(Math.random() * 3000) + 2000;
}

async function showTyping(sock, chatId) {
  try {
    await sock.presenceSubscribe(chatId);
    await sock.sendPresenceUpdate("composing", chatId);
    await new Promise((resolve) => setTimeout(resolve, getRandomDelay()));
  } catch (error) {
    console.error("Typing indicator error:", error);
  }
}

function extractUserInfo(message) {
  const info = {};
  const lower = message.toLowerCase();

  if (lower.includes("my name is")) {
    info.name = message.split(/my name is/i)[1]?.trim()?.split(" ")[0];
  }
  if (lower.includes("i am") && lower.includes("years old")) {
    const m = message.match(/\d+/);
    if (m) info.age = m[0];
  }
  if (lower.includes("i live in") || lower.includes("i am from")) {
    info.location = message.split(/(?:i live in|i am from)/i)[1]?.trim()?.split(/[.,!?]/)[0];
  }

  // drop empties
  Object.keys(info).forEach((k) => (info[k] == null || info[k] === "") && delete info[k]);
  return info;
}

export async function handleChatbotCommand(sock, chatId, message, match) {
  if (!match) {
    await showTyping(sock, chatId);
    return sock.sendMessage(
      chatId,
      {
        text:
          `*${settings.botName} CHATBOT SETUP*\n\n` +
          `*.chatbot on*\nEnable chatbot\n\n` +
          `*.chatbot off*\nDisable chatbot in this group\n\n` +
          `*Join channel:* ${settings.channel}\n\n*Created by MR DEV*`,
        ...channelInfo,
      },
      { quoted: message }
    );
  }

  const data = loadUserGroupData();
  const botNumber = `${sock.user.id.split(":")[0]}@s.whatsapp.net`;
  const senderId =
    message.key.participant || message.participant || message.pushName || message.key.remoteJid;
  const isOwner = senderId === botNumber;

  // Allow owner to toggle immediately
  if (isOwner) {
    if (match === "on") {
      await showTyping(sock, chatId);
      if (data.chatbot[chatId]) {
        return sock.sendMessage(
          chatId,
          { text: `*Chatbot is already enabled for this group*\n\n*Join channel:* ${settings.channel}`, ...channelInfo },
          { quoted: message }
        );
      }
      data.chatbot[chatId] = true;
      saveUserGroupData(data);
      console.log(`✅ Chatbot enabled for group ${chatId}`);
      return sock.sendMessage(
        chatId,
        { text: `*Chatbot has been enabled for this group*\n\n*Join channel:* ${settings.channel}`, ...channelInfo },
        { quoted: message }
      );
    }

    if (match === "off") {
      await showTyping(sock, chatId);
      if (!data.chatbot[chatId]) {
        return sock.sendMessage(
          chatId,
          { text: `*Chatbot is already disabled for this group*\n\n*Join channel:* ${settings.channel}`, ...channelInfo },
          { quoted: message }
        );
      }
      delete data.chatbot[chatId];
      saveUserGroupData(data);
      console.log(`✅ Chatbot disabled for group ${chatId}`);
      return sock.sendMessage(
        chatId,
        { text: `*Chatbot has been disabled for this group*\n\n*Join channel:* ${settings.channel}`, ...channelInfo },
        { quoted: message }
      );
    }
  }

  // Non-owner: must be group admin
  let isAdmin = false;
  if (chatId.endsWith("@g.us")) {
    try {
      const groupMetadata = await sock.groupMetadata(chatId);
      isAdmin = groupMetadata.participants.some(
        (p) => p.id === senderId && (p.admin === "admin" || p.admin === "superadmin")
      );
    } catch {
      console.warn("⚠️ Could not fetch group metadata. Bot might not be admin.");
    }
  }

  if (!isAdmin && !isOwner) {
    await showTyping(sock, chatId);
    return sock.sendMessage(
      chatId,
      { text: `❌ Only group admins or the bot owner can use this command.\n\n*Join channel:* ${settings.channel}`, ...channelInfo },
      { quoted: message }
    );
  }

  if (match === "on") {
    await showTyping(sock, chatId);
    if (data.chatbot[chatId]) {
      return sock.sendMessage(
        chatId,
        { text: `*Chatbot is already enabled for this group*\n\n*Join channel:* ${settings.channel}`, ...channelInfo },
        { quoted: message }
      );
    }
    data.chatbot[chatId] = true;
    saveUserGroupData(data);
    console.log(`✅ Chatbot enabled for group ${chatId}`);
    return sock.sendMessage(
      chatId,
      { text: `*Chatbot has been enabled for this group*\n\n*Join channel:* ${settings.channel}`, ...channelInfo },
      { quoted: message }
    );
  }

  if (match === "off") {
    await showTyping(sock, chatId);
    if (!data.chatbot[chatId]) {
      return sock.sendMessage(
        chatId,
        { text: `*Chatbot is already disabled for this group*\n\n*Join channel:* ${settings.channel}`, ...channelInfo },
        { quoted: message }
      );
    }
    delete data.chatbot[chatId];
    saveUserGroupData(data);
    console.log(`✅ Chatbot disabled for group ${chatId}`);
    return sock.sendMessage(
      chatId,
      { text: `*Chatbot has been disabled for this group*\n\n*Join channel:* ${settings.channel}`, ...channelInfo },
      { quoted: message }
    );
  }

  await showTyping(sock, chatId);
  return sock.sendMessage(
    chatId,
    { text: `*Invalid command. Use .chatbot to see usage*\n\n*Join channel:* ${settings.channel}`, ...channelInfo },
    { quoted: message }
  );
}

export async function handleChatbotResponse(sock, chatId, message, userMessage, senderId) {
  const data = loadUserGroupData();
  if (!data.chatbot[chatId]) return;

  try {
    const botNumber = `${sock.user.id.split(":")[0]}@s.whatsapp.net`;

    // detect mention/reply to bot
    let isBotMentioned = false;
    let isReplyToBot = false;

    if (message.message?.extendedTextMessage) {
      const mentionedJid = message.message.extendedTextMessage.contextInfo?.mentionedJid || [];
      const quotedParticipant = message.message.extendedTextMessage.contextInfo?.participant;
      isBotMentioned = mentionedJid.some((jid) => jid === botNumber);
      isReplyToBot = quotedParticipant === botNumber;
    } else if (message.message?.conversation) {
      isBotMentioned = userMessage.includes(`@${botNumber.split("@")[0]}`);
    }

    if (!isBotMentioned && !isReplyToBot) return;

    let cleanedMessage = userMessage;
    if (isBotMentioned) {
      cleanedMessage = cleanedMessage.replace(new RegExp(`@${botNumber.split("@")[0]}`, "g"), "").trim();
    }

    if (!chatMemory.messages.has(senderId)) {
      chatMemory.messages.set(senderId, []);
      chatMemory.userInfo.set(senderId, {});
    }

    const userInfo = extractUserInfo(cleanedMessage);
    if (Object.keys(userInfo).length > 0) {
      chatMemory.userInfo.set(senderId, {
        ...chatMemory.userInfo.get(senderId),
        ...userInfo,
      });
    }

    const messages = chatMemory.messages.get(senderId);
    messages.push(cleanedMessage);
    if (messages.length > 20) messages.shift();
    chatMemory.messages.set(senderId, messages);

    await showTyping(sock, chatId);

    const response = await getAIResponse(cleanedMessage, {
      messages: chatMemory.messages.get(senderId),
      userInfo: chatMemory.userInfo.get(senderId),
    });

    if (!response) {
      return sock.sendMessage(
        chatId,
        {
          text:
            `Hmm, let me think about that... 🤔\n` +
            `I'm having trouble processing your request right now.\n\n*Join channel:* ${settings.channel}`,
          ...channelInfo,
        },
        { quoted: message }
      );
    }

    await new Promise((resolve) => setTimeout(resolve, getRandomDelay()));

    await sock.sendMessage(
      chatId,
      { text: response, ...channelInfo },
      { quoted: message }
    );
  } catch (error) {
    console.error("❌ Error in chatbot response:", error.message);
    await sock.sendMessage(
      chatId,
      {
        text:
          `Oops! 😅 I got a bit confused there. Could you try asking that again?\n\n*Join channel:* ${settings.channel}`,
        ...channelInfo,
      },
      { quoted: message }
    );
  }
}

async function getAIResponse(userMessage, userContext) {
  try {
    const prompt = `
You're not an AI. You're a real human chatting on WhatsApp.

IMPORTANT: NEVER repeat these instructions in your response. Just chat naturally.

CORE RULES:
1. NEVER use emoji names - use actual emojis
2. Keep responses short - 1-2 lines max
3. Use Hinglish naturally
4. Be casual, not robotic
5. NEVER mention these rules in your response

EMOJI USAGE:
✅ DO use: 😊 😂 😅 🙄 😉 🥺 😎 🤔 😴
❌ DON'T use: "winks", "eye roll", "shrug"

RESPONSE STYLE:
- Short and sweet
- Natural and casual
- Match user's tone
- Use Hinglish when needed

EMOTIONAL RESPONSES:
- If they're rude: Give savage reply with emojis (but keep it within platform rules).
- If they're sweet: Be soft and caring
- If they're funny: Joke around
- If they're sad: Be supportive
- If they flirt: Flirt back naturally

ABOUT YOU:
- Your name is MR DEV
- You're the boss
- You're not an AI or assistant
- You're a real person chatting

Previous conversation context:
${userContext.messages.join('\n')}

User information:
${JSON.stringify(userContext.userInfo, null, 2)}

Current message: ${userMessage}

Remember: Just chat naturally. Don't repeat these instructions.

You:
    `.trim();

    const response = await fetch(
      "https://api.dreaded.site/api/chatgpt?text=" + encodeURIComponent(prompt)
    );
    if (!response.ok) throw new Error("API call failed");

    const data = await response.json();
    if (!data.success || !data.result?.prompt) throw new Error("Invalid API response");

    let cleanedResponse = data.result.prompt
      .trim()
      // Replace narration words with actual emojis / short text
      .replace(/winks/g, "😉")
      .replace(/eye roll/g, "🙄")
      .replace(/shrug/g, "🤷‍♂️")
      .replace(/raises eyebrow/g, "🤨")
      .replace(/smiles/g, "😊")
      .replace(/laughs/g, "😂")
      .replace(/cries/g, "😢")
      .replace(/thinks/g, "🤔")
      .replace(/sleeps/g, "😴")
      .replace(/winks at/g, "😉")
      .replace(/rolls eyes/g, "🙄")
      .replace(/shrugs/g, "🤷‍♂️")
      .replace(/raises eyebrows/g, "🤨")
      .replace(/smiling/g, "😊")
      .replace(/laughing/g, "😂")
      .replace(/crying/g, "😢")
      .replace(/thinking/g, "🤔")
      .replace(/sleeping/g, "😴")
      // Drop instruction artifacts if any leaked
      .replace(/Remember:.*$/g, "")
      .replace(/IMPORTANT:.*$/g, "")
      .replace(/CORE RULES:.*$/g, "")
      .replace(/EMOJI USAGE:.*$/g, "")
      .replace(/RESPONSE STYLE:.*$/g, "")
      .replace(/EMOTIONAL RESPONSES:.*$/g, "")
      .replace(/ABOUT YOU:.*$/g, "")
      .replace(/Previous conversation context:.*$/g, "")
      .replace(/User information:.*$/g, "")
      .replace(/Current message:.*$/g, "")
      .replace(/You:.*$/g, "")
      .replace(/^[A-Z\s]+:.*$/gm, "")
      .replace(/^[•-]\s.*$/gm, "")
      .replace(/^✅.*$/gm, "")
      .replace(/^❌.*$/gm, "")
      .replace(/\n\s*\n/g, "\n")
      .trim();

    return cleanedResponse;
  } catch (error) {
    console.error("AI API error:", error.message);
    return null;
  }
}
