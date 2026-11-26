// Where the sandbox listens, and a small client of its REST API for the scripts. The browser tests have the same in
// ../support (sandbox.ts and the `api` fixture), in TypeScript.
import fs from 'node:fs';

const settings = JSON.parse(fs.readFileSync(new URL('../settings.json', import.meta.url), 'utf8'));

export const PORT = Number(process.env.SANDBOX_PORT) || settings.port;
export const BASE_URL = `http://127.0.0.1:${PORT}`;
export const ADMIN = { email: settings.adminEmail, password: settings.adminPassword };

/** Whether a Directus answers on the port. */
export async function isUp() {
	try {
		return (await fetch(`${BASE_URL}/server/ping`)).ok;
	} catch {
		return false;
	}
}

/** Waits until the Directus which `server` (a child process) runs answers. False when the process ended first. */
export async function waitUntilUp(server, seconds = 180) {
	let ended = server.exitCode !== null;
	server.once('exit', () => (ended = true));

	for (const until = Date.now() + seconds * 1000; Date.now() < until && !ended; ) {
		if (await isUp()) return true;
		await new Promise((resolve) => setTimeout(resolve, 250));
	}

	return false;
}

/** Signs in as the administrator. The result has `get`, `post`, `patch` and `delete`, which return the `data` of the answer. */
export async function signIn() {
	const login = await fetch(`${BASE_URL}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(ADMIN) });
	if (!login.ok) throw new Error(`Could not sign in to the sandbox at ${BASE_URL}: ${login.status}`);
	const token = (await login.json()).data.access_token;

	async function send(method, path, body) {
		const response = await fetch(`${BASE_URL}${path}`, {
			method,
			headers: { Authorization: `Bearer ${token}`, ...(body === undefined ? {} : { 'Content-Type': 'application/json' }) },
			body: body === undefined ? undefined : JSON.stringify(body),
		});

		const text = await response.text();
		if (!response.ok) throw new Error(`${method} ${path}: ${response.status} ${text.slice(0, 500)}`);
		return text ? JSON.parse(text).data : null;
	}

	return {
		get: (path) => send('GET', path),
		post: (path, body) => send('POST', path, body),
		patch: (path, body) => send('PATCH', path, body),
		delete: (path) => send('DELETE', path),
	};
}
