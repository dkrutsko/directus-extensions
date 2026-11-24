// Where the sandbox Directus listens and who its administrator is. The same
// values configure the instance itself (../config.cjs).
import fs from 'node:fs';

const settings = JSON.parse(fs.readFileSync(new URL('../settings.json', import.meta.url), 'utf8')) as {
	port: number;
	adminEmail: string;
	adminPassword: string;
};

export const PORT = Number(process.env.SANDBOX_PORT) || settings.port;
export const BASE_URL = `http://127.0.0.1:${PORT}`;
export const ADMIN = { email: settings.adminEmail, password: settings.adminPassword };
