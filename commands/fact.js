const axios = require('axios');

const settings = {
  botName: 'MR DEV',
  channel: 'https://youtube.com/@mrdev'
};

const channelInfo = {
  footer: `Created by ${settings.botName} | Join channel: ${settings.channel}`
};

module.exports = async function (sock, chatId, message) {
  try {
    const response = await axios.get('https://uselessfacts.jsph.pl/random.json?language=en');
    const fact = response.data.text;

    await sock.sendMessage(chatId, { 
      text: fact,
      ...channelInfo
    }, { quoted: message });

  } catch (error) {
    console.error('Error fetching fact:', error);
    await sock.sendMessage(chatId, { 
      text: 'Sorry, there has been some communication interference and I could not get that fact to come through.',
      ...channelInfo
    }, { quoted: message });
  }
};
