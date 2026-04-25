const axios = require("axios");

async function getWeatherData(lat, lon) {
    const apiKey = process.env.OPENWEATHER_API_KEY;

    const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}`;

    const response = await axios.get(url);

    return response.data;
}

module.exports = getWeatherData;