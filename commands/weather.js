// commands/weather.js
import axios from "axios";

async function weatherCommand(sock, chatId, city, message) {
  try {
    if (!city) {
      await sock.sendMessage(
        chatId,
        { text: "🌍 Please provide a city name.\nExample: `.weather London`" },
        { quoted: message }
      );
      return;
    }

    const apiKey =
      process.env.OPENWEATHER_KEY || "4902c0f2550f58298ad4146a92b65e10";

    const response = await axios.get(
      "https://api.openweathermap.org/data/2.5/weather",
      {
        params: {
          q: city,
          appid: apiKey,
          units: "metric",
        },
      }
    );

    const weather = response.data;

    const weatherText =
      `🌤️ *Weather in ${weather.name}, ${weather.sys.country}*\n\n` +
      `🌡️ Temperature: *${weather.main.temp}°C* (feels like ${weather.main.feels_like}°C)\n` +
      `☁️ Condition: *${weather.weather[0].description}*\n` +
      `💧 Humidity: *${weather.main.humidity}%*\n` +
      `🌬️ Wind: *${weather.wind.speed} m/s*\n\n` +
      `🕒 Updated: ${new Date(weather.dt * 1000).toLocaleString()}`;

    await sock.sendMessage(chatId, { text: weatherText }, { quoted: message });
  } catch (error) {
    console.error("Error fetching weather:", error?.response?.data || error);

    if (error.response?.data?.message) {
      await sock.sendMessage(
        chatId,
        { text: `❌ ${error.response.data.message}` },
        { quoted: message }
      );
    } else {
      await sock.sendMessage(
        chatId,
        { text: "❌ Could not fetch weather. Try again later." },
        { quoted: message }
      );
    }
  }
}

export default weatherCommand;
