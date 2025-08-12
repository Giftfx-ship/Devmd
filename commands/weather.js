const axios = require('axios');

module.exports = async function (sock, chatId, city) {
    try {
        const apiKey = '4902c0f2550f58298ad4146a92b65e10';  // Your OpenWeather API key
        const response = await axios.get(`https://api.openweathermap.org/data/2.5/weather`, {
            params: {
                q: city,
                appid: apiKey,
                units: 'metric'
            }
        });

        const weather = response.data;
        const weatherText = 
            `🌤️ Weather in *${weather.name}*:\n` +
            `Condition: ${weather.weather[0].description}\n` +
            `Temperature: ${weather.main.temp}°C\n` +
            `Humidity: ${weather.main.humidity}%\n` +
            `Wind Speed: ${weather.wind.speed} m/s`;

        await sock.sendMessage(chatId, { text: weatherText });
    } catch (error) {
        console.error('Error fetching weather:', error);
        await sock.sendMessage(chatId, { text: '❌ Sorry, I could not fetch the weather right now. Please check the city name or try again later.' });
    }
};
