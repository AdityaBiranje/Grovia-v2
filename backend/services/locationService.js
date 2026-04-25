const axios = require("axios");

async function validateLocation(locationName) {
    try {
        const apiKey = process.env.OPENWEATHER_API_KEY;

        const url = `http://api.openweathermap.org/geo/1.0/direct?q=${locationName}&limit=1&appid=${apiKey}`;

        const response = await axios.get(url);

        // No location found
        if (response.data.length === 0) {
            return {
                valid: false
            };
        }

        const place = response.data[0];

        // Exact name match check
        if (
            place.name.toLowerCase() !==
            locationName.toLowerCase().trim()
        ) {
            return {
                valid: false
            };
        }

        return {
            valid: true,
            lat: place.lat,
            lon: place.lon
        };

    } catch (error) {
        console.log("Location Validation Error:", error.message);

        return {
            valid: false
        };
    }
}

module.exports = validateLocation;