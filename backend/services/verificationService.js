const getWeatherData = require("./weatherService");
const getEmissionData = require("./emissionService");

async function verifyProject(data) {
    const weather = await getWeatherData(data.lat, data.lon);
    const emission = await getEmissionData(data.energy_generated_kwh);

    let suspicious = false;
    let reasons = [];

    if (weather.clouds.all > 80 && data.energy_generated_kwh > 10000) {
        suspicious = true;
        reasons.push("High solar output despite cloudy weather");
    }

    if (data.grid_emission_factor > emission.co2e) {
        suspicious = true;
        reasons.push("Incorrect emission factor claim");
    }

    return {
        suspicious,
        reasons,
        weather,
        emission
    };
}

module.exports = verifyProject;