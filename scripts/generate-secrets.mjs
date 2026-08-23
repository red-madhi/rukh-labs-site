import { generateKeyPairSync, randomBytes } from "node:crypto";

const { privateKey } = generateKeyPairSync("ec", { namedCurve: "P-256" });
const pem = privateKey.export({ type: "pkcs8", format: "pem" }).replace(/\n/g, "\\n");

console.log(`# Generated ${new Date().toISOString()}`);
console.log(`OAUTH_PRIVATE_KEY="${pem}"`);
console.log(`SESSION_SECRET=${randomBytes(32).toString("hex")}`);
console.log(`CRON_SECRET=${randomBytes(32).toString("hex")}`);
console.log(`IAZMA_API_KEY=${randomBytes(32).toString("hex")}`);
