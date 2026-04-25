const axios = require("axios");

async function getWeatherData(lat, lon) {
    console.log("Mocking Weather Data for:", lat, lon);
    return {
        clouds: { all: 20 },
        main: { temp: 295.15 },
        wind: { speed: 5.5 }
    };
}

module.exports = getWeatherData;