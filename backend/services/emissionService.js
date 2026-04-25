const axios = require("axios");

async function getEmissionData(kwh) {
    console.log("Mocking Emission Data for:", kwh);
    return {
        co2e: kwh * 0.45,
        co2e_unit: "kg",
        calculation_method: "Mock Hackathon Calculation"
    };
}

module.exports = getEmissionData;