// Configuration of the sandbox Directus (CONFIG_PATH points here). Everything
// it writes goes into ./data, which `npm run sandbox:reset` deletes.
const path = require('node:path');
const settings = require('./settings.json');

const data = path.join(__dirname, 'data');
const port = Number(process.env.SANDBOX_PORT) || settings.port;

module.exports = {
	HOST: '127.0.0.1',
	PORT: port,
	PUBLIC_URL: `http://127.0.0.1:${port}`,
	PROJECT_NAME: 'Extensions sandbox',

	// Fixed on purpose: this instance only listens on this machine and holds
	// nothing but test data, and fixed values keep sessions across restarts.
	KEY: 'sandbox-key-which-is-not-a-secret-at-all',
	SECRET: 'sandbox-secret-which-is-not-a-secret-at-all',
	ADMIN_EMAIL: settings.adminEmail,
	ADMIN_PASSWORD: settings.adminPassword,
	ACCESS_TOKEN_TTL: '1d',

	DB_CLIENT: 'sqlite3',
	DB_FILENAME: path.join(data, 'data.db'),
	STORAGE_LOCATIONS: 'local',
	STORAGE_LOCAL_ROOT: path.join(data, 'uploads'),

	// Every folder of ../packages which holds a built extension is loaded.
	// With auto reload a rebuilt `dist` (npm run dev) shows after a reload of
	// the browser tab. A broken extension stops the start instead of being
	// skipped, so a test run cannot pass without it.
	EXTENSIONS_PATH: path.join(__dirname, '..', 'packages'),
	EXTENSIONS_AUTO_RELOAD: true,
	EXTENSIONS_MUST_LOAD: true,
	PACKAGE_FILE_LOCATION: __dirname,

	// Directus writes the bundle of all app extensions here. The default is
	// inside node_modules, which another instance started from the same
	// folder would share.
	TEMP_PATH: path.join(data, 'tmp'),

	CACHE_ENABLED: false,
	RATE_LIMITER_ENABLED: false,
	PRESSURE_LIMITER_ENABLED: false,
	WEBSOCKETS_ENABLED: false,
	TELEMETRY: false,
	LOG_LEVEL: process.env.SANDBOX_LOG_LEVEL || 'warn',
};
