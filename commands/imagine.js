const axios = require('axios');

const settings = {
  botName: 'MR DEV',
  channel: 'https://youtube.com/@mrdev'
};

const channelInfo = {
  footer: `Created by ${settings.botName} | Join channel: ${settings.channel}`
};

async function imagineCommand(sock, chatId, message) {
  try {
    // Get the prompt from the message
    const prompt = message.message?.conversation?.trim() ||
                   message.message?.extendedTextMessage?.text?.trim() || '';
    
    // Remove the command prefix (assumed '.imagine ') and trim
    const imagePrompt = prompt.slice(8).trim();
    
    if (!imagePrompt) {
      await sock.sendMessage(chatId, {
        text: 'Please provide a prompt for the image generation.\nExample: .imagine a beautiful sunset over mountains',
        ...channelInfo
      }, {
        quoted: message
      });
      return;
    }

    // Send processing message
    await sock.sendMessage(chatId, {
      text: '🎨 Generating your image... Please wait.',
      ...channelInfo
    }, {
      quoted: message
    });

    // Enhance the prompt with quality keywords
    const enhancedPrompt = enhancePrompt(imagePrompt);

    // Make API request to image generation endpoint
    const response = await axios.get(`https://api.shizo.top/ai/imagine/flux`, {
      params: {
        apikey: 'knightbot',
        prompt: enhancedPrompt
      },
      responseType: 'arraybuffer'
    });

    // Convert response to buffer
    const imageBuffer = Buffer.from(response.data);

    // Send the generated image
    await sock.sendMessage(chatId, {
      image: imageBuffer,
      caption: `🎨 Generated image for prompt: "${imagePrompt}"`,
      ...channelInfo
    }, {
      quoted: message
    });

  } catch (error) {
    console.error('Error in imagine command:', error);
    await sock.sendMessage(chatId, {
      text: '❌ Failed to generate image. Please try again later.',
      ...channelInfo
    }, {
      quoted: message
    });
  }
}

// Function to enhance the prompt with random quality keywords
function enhancePrompt(prompt) {
  const qualityEnhancers = [
    'high quality',
    'detailed',
    'masterpiece',
    'best quality',
    'ultra realistic',
    '4k',
    'highly detailed',
    'professional photography',
    'cinematic lighting',
    'sharp focus'
  ];

  const numEnhancers = Math.floor(Math.random() * 2) + 3; // 3 or 4 enhancers
  const selectedEnhancers = qualityEnhancers
    .sort(() => Math.random() - 0.5)
    .slice(0, numEnhancers);

  return `${prompt}, ${selectedEnhancers.join(', ')}`;
}

module.exports = imagineCommand;
