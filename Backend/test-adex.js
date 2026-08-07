import dotenv from "dotenv";
dotenv.config();

import { generateAdexToken } from "./services/adexAuth.js";

async function main() {
    try {
        const token = await generateAdexToken();

        console.log("Generated JWT:");
        console.log(token);

        const response = await fetch(
            // `${process.env.ADEX_API_URL}/api/v1/athletes/all`,
            // `${process.env.ADEX_API_URL}/api/v1/athletes/81409386-1ec4-4e1b-a4ff-51e452a18cb3`,
            `${process.env.ADEX_API_URL}/api/v1/sports`,
            {
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
            }
        );

        console.log("Status:", response.status);

        const body = await response.text();
        console.log(body);
    } catch (err) {
        console.error(err);
    }
}

main();