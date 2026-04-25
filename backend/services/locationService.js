const axios = require("axios");

async function validateLocation(locationName) {
    console.log("Mocking Location Validation for:", locationName);
    return {
        valid: true,
        lat: 40.7128,
        lon: -74.0060
    };
}

module.exports = validateLocation;