// lib/antilink.js
import { isJidGroup } from "@whiskeysockets/baileys";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SETTINGS_FILE = path.join(__dirname, "../data/antilinkSettings.json");

// Load settings from file or return empty object
function loadSettings() {
  try {
    if (!fs.existsSync(SETTINGS_FILE)) return {};
    return JSON.parse(fs.readFileSync(SETTINGS_FILE, "utf-8"));
  } catch {
    return {};
  }
}

// Save settings object to file
function saveSettings(settings) {
  try {
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2));
  } catch (e) {
    console.error("Failed to save antilink settings:", e);
  }
}

// Get setting for specific group (chatId)
function getAntilinkSetting(chatId) {
  const settings = loadSettings();
  return settings[chatId] || "off";
}

// Set setting for specific group (chatId)
function setAntilinkSetting(chatId, value) {
  const settings = loadSettings();
  settings[chatId] = value === "on" ? "on" : "off";
  saveSettings(settings);
}

// Simple URL detection regex
function containsURL(str) {
  const urlRegex = /(https?:\/\/)?([a-z0-9-]+\.)+[a-z]{2,}(\/[^\s]*)?/i;
  return urlRegex.test(str);
}

// Main Antilink logic
async function Antilink(sock, msg) {
  try {
    const jid = msg.key.remoteJid;
    if (!isJidGroup(jid)) return;

    if (getAntilinkSetting(jid) !== "on") return;

    const textMsg =
      msg.message?.conversation || msg.message?.extendedTextMessage?.text || "";

    if (!textMsg || typeof textMsg !== "string") return;

    const sender = msg.key.participant;
    if (!sender) return;

    const metadata = await sock.groupMetadata(jid);
    const isAdmin = metadata.participants.some(
      (p) =>
        p.id === sender &&
        (p.admin === "admin" || p.admin === "superadmin")
    );
    if (isAdmin) return;

    if (!containsURL(textMsg)) return;

    await sock.sendMessage(jid, { delete: msg.key });
    await sock.groupParticipantsUpdate(jid, [sender], "remove");
    await sock.sendMessage(jid, {
      text: `@${sender.split("@")[0]} was removed for sending links.`,
      mentions: [sender],
    });
  } catch (error) {
    console.error("Antilink error:", error);
  }
}

export { Antilink, getAntilinkSetting, setAntilinkSetting };
