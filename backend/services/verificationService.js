const getWeatherData = require("./weatherService");
const getEmissionData = require("./emissionService");
const validateLocation = require("./locationService");

async function verifyProject(data) {
    try {
        //-----------------------------------
        // Step 1: Validate location
        //-----------------------------------
        const locationResult = await validateLocation(data.location);

        if (!locationResult.valid) {
            return {
                suspicious: true,
                reasons: ["Invalid project location"]
            };
        }

        //-----------------------------------
        // Step 2: Get weather data
        //-----------------------------------
        const weather = await getWeatherData(
            locationResult.lat,
            locationResult.lon
        );

        //-----------------------------------
        // Step 3: Get emission data
        //-----------------------------------
        const emission = await getEmissionData(
            data.energy_generated_kwh
        );

        let suspicious = false;
        let reasons = [];

        //-----------------------------------
        // Step 4: Weather verification
        //-----------------------------------
        if (
            weather.clouds.all > 80 &&
            data.energy_generated_kwh > 10000
        ) {
            suspicious = true;
            reasons.push(
                "High energy claim despite poor weather conditions"
            );
        }

        //-----------------------------------
        // Step 5: Return result
        //-----------------------------------
        return {
            suspicious,
            reasons,
            locationVerified: true,
            weather,
            emission
        };

    } catch (error) {
        console.log(error);

        return {
            suspicious: true,
            reasons: ["Verification failed"]
        };
    }
}

module.exports = verifyProject;