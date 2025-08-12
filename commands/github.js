const moment = require('moment-timezone');
const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');

const settings = {
  botName: 'MR DEV',
  channel: 'https://youtube.com/@mrdev'
};

const channelInfo = {
  footer: `Created by ${settings.botName} | Join channel: ${settings.channel}`
};

async function githubCommand(sock, chatId, message) {
  try {
    // Fetch your repo info from GitHub API
    const res = await fetch('https://api.github.com/repos/Giftfx-ship/Devmd');
    if (!res.ok) throw new Error('Error fetching repository data');
    const json = await res.json();

    let txt = `*${settings.botName} GitHub Repo*\n\n`;
    txt += `✩  *Name* : ${json.name}\n`;
    txt += `✩  *Watchers* : ${json.watchers_count}\n`;
    txt += `✩  *Size* : ${(json.size / 1024).toFixed(2)} MB\n`;
    txt += `✩  *Last Updated* : ${moment(json.updated_at).format('DD/MM/YY - HH:mm:ss')}\n`;
    txt += `✩  *URL* : ${json.html_url}\n`;
    txt += `✩  *Forks* : ${json.forks_count}\n`;
    txt += `✩  *Stars* : ${json.stargazers_count}\n\n`;
    txt += `💥 *${settings.botName}*`;

    // Read local image asset to send with message
    const imgPath = path.join(__dirname, '../assets/bot_image.jpg');
    const imgBuffer = fs.readFileSync(imgPath);

    await sock.sendMessage(chatId, { 
      image: imgBuffer, 
      caption: txt,
      ...channelInfo
    }, { quoted: message });
  } catch (error) {
    await sock.sendMessage(chatId, { 
      text: '❌ Error fetching repository information.',
      ...channelInfo
    }, { quoted: message });
  }
}

module.exports = githubCommand;
