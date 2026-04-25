const axios = require("axios");

async function validateLocation(locationName) {
    const url = `https://nominatim.openstreetmap.org/search?q=${locationName}&format=json&limit=1`;

    const response = await axios.get(url);

    if (response.data.length === 0) {
        return {
            valid: false
        };
    }

    return {
        valid: true,
        lat: response.data[0].lat,
        lon: response.data[0].lon
    };
}

module.exports = validateLocation;