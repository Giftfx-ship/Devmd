import axios from 'axios';
import fetch from 'node-fetch';

const DEV_NAME = 'Mr Dev Prime';
const CHANNEL_LINK = 'https://whatsapp.com/channel/0029VaJvXM9E5jQzI8kzE03K'; // Your channel link

export default {
  name: 'ai',
  alias: ['gpt', 'gemini'],
  description: 'Ask AI (GPT or Gemini) questions',
  
  async execute(sock, chatId, message, args) {
    try {
      const text = message.message?.conversation || message.message?.extendedTextMessage?.text;
      
      if (!text) {
        return await sock.sendMessage(chatId, { 
          text: `❗ Please provide a question after .gpt or .gemini\n\nExample: .gpt write a basic HTML code\n\n_Developed by ${DEV_NAME}_\n📢 Channel: ${CHANNEL_LINK}`
        });
      }

      const parts = text.trim().split(' ');
      const command = parts[0].toLowerCase();
      const query = parts.slice(1).join(' ').trim();

      if (!query) {
        return await sock.sendMessage(chatId, { 
          text: `❗ Please provide a question after .gpt or .gemini\n\n_Developed by ${DEV_NAME}_\n📢 Channel: ${CHANNEL_LINK}`
        });
      }

      await sock.sendMessage(chatId, { react: { text: '🤖', key: message.key } });

      if (command === '.gpt') {
        // GPT API
        const response = await axios.get(`https://api.dreaded.site/api/chatgpt?text=${encodeURIComponent(query)}`);
        if (response.data?.success && response.data.result?.prompt) {
          return await sock.sendMessage(chatId, {
            text: `${response.data.result.prompt}\n\n_Developed by ${DEV_NAME}_\n📢 Channel: ${CHANNEL_LINK}`
          }, { quoted: message });
        } else {
          throw new Error('Invalid GPT API response');
        }
      }

      if (command === '.gemini') {
        // Gemini APIs fallback
        const apis = [
          `https://vapis.my.id/api/gemini?q=${encodeURIComponent(query)}`,
          `https://api.siputzx.my.id/api/ai/gemini-pro?content=${encodeURIComponent(query)}`,
          `https://api.ryzendesu.vip/api/ai/gemini?text=${encodeURIComponent(query)}`,
          `https://api.dreaded.site/api/gemini2?text=${encodeURIComponent(query)}`,
          `https://api.giftedtech.my.id/api/ai/geminiai?apikey=gifted&q=${encodeURIComponent(query)}`,
          `https://api.giftedtech.my.id/api/ai/geminiaipro?apikey=gifted&q=${encodeURIComponent(query)}`
        ];

        for (const api of apis) {
          try {
            const res = await fetch(api);
            const data = await res.json();
            const answer = data.message || data.data || data.answer || data.result;
            if (answer) {
              return await sock.sendMessage(chatId, {
                text: `${answer}\n\n_Developed by ${DEV_NAME}_\n📢 Channel: ${CHANNEL_LINK}`
              }, { quoted: message });
            }
          } catch {
            continue;
          }
        }
        throw new Error('All Gemini APIs failed');
      }

    } catch (error) {
      console.error('AI Command Error:', error);
      await sock.sendMessage(chatId, {
        text: `❌ Failed to get AI response. Please try again later.\n\n_Developed by ${DEV_NAME}_\n📢 Channel: ${CHANNEL_LINK}`
      }, { quoted: message });
    }
  }
};
