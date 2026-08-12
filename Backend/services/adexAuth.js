import { readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { importPKCS8, SignJWT } from "jose";

let cachedPrivateKey = null;

async function getPrivateKey() {
    if (cachedPrivateKey) {
        return cachedPrivateKey;
    }

    const pem = await readFile(process.env.ADEX_PRIVATE_KEY_PATH, "utf8");
    cachedPrivateKey = await importPKCS8(pem, "RS256");

    return cachedPrivateKey;
}

export async function generateAdexToken() {
    const privateKey = await getPrivateKey();

    const now = Math.floor(Date.now() / 1000);

    return await new SignJWT({
        client_id: process.env.ADEX_CLIENT_ID,
        scope: process.env.ADEX_SCOPES,
    })
        .setProtectedHeader({
            alg: "RS256",
            kid: process.env.ADEX_KEY_ID,
        })
        .setIssuer(process.env.ADEX_ISSUER)
        .setAudience(process.env.ADEX_AUDIENCE ?? "adex-api")
        .setSubject(`service:${process.env.ADEX_CLIENT_ID}`)
        .setJti(randomUUID())
        .setIssuedAt(now)
        .setExpirationTime(now + 900)
        .sign(privateKey);
}