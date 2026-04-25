const axios = require("axios");

async function getEmissionData(kwh) {
    const response = await axios.post(
        "https://beta3.api.climatiq.io/estimate",
        {
            emission_factor: {
                activity_id: "electricity-energy_source_grid_mix"
            },
            parameters: {
                energy: kwh,
                energy_unit: "kWh"
            }
        },
        {
            headers: {
                Authorization: `Bearer ${process.env.CLIMATIQ_API_KEY}`
            }
        }
    );

    return response.data;
}

module.exports = getEmissionData;