// lib/antilinkHelper.js
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const antilinkFilePath = path.join(__dirname, "../data", "antilinkSettings.json");

function loadAntilinkSettings() {
  if (fs.existsSync(antilinkFilePath)) {
    const data = fs.readFileSync(antilinkFilePath, "utf-8");
    try {
      return JSON.parse(data);
    } catch (e) {
      console.error("❌ Failed to parse antilink settings:", e);
      return {};
    }
  }
  return {};
}

function saveAntilinkSettings(settings) {
  try {
    fs.writeFileSync(antilinkFilePath, JSON.stringify(settings, null, 2));
  } catch (e) {
    console.error("❌ Failed to save antilink settings:", e);
  }
}

function setAntilinkSetting(groupId, type) {
  const settings = loadAntilinkSettings();
  settings[groupId] = type;
  saveAntilinkSettings(settings);
}

function getAntilinkSetting(groupId) {
  const settings = loadAntilinkSettings();
  return settings[groupId] || "off";
}

export { setAntilinkSetting, getAntilinkSetting };
