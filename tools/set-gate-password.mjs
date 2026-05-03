import { pbkdf2Sync, randomBytes } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import readline from "node:readline/promises";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DEFAULT_ITERATIONS = 180_000;
const DEFAULT_KEY_LEN = 32;
const DEFAULT_SALT_LEN = 16;

function parseArgs(argv) {
	const args = argv.slice(2);
	const out = { password: null, outPath: null, iterations: null, keyLen: null };

	for (let i = 0; i < args.length; i++) {
		const token = args[i];
		if (token === "--help" || token === "-h") {
			out.help = true;
			continue;
		}
		if (token === "--password" || token === "-p") {
			out.password = args[i + 1] ?? "";
			i++;
			continue;
		}
		if (token === "--out") {
			out.outPath = args[i + 1] ?? "";
			i++;
			continue;
		}
		if (token === "--iterations") {
			out.iterations = Number(args[i + 1]);
			i++;
			continue;
		}
		if (token === "--keylen") {
			out.keyLen = Number(args[i + 1]);
			i++;
			continue;
		}

		// First positional arg is treated as password (discouraged).
		if (out.password == null) {
			out.password = token;
			continue;
		}
	}

	return out;
}

function usage() {
	return `\
Usage:
  node tools/set-gate-password.mjs
  node tools/set-gate-password.mjs --password "your new password"

Options:
  -p, --password     Password to set (prompted if omitted)
  --out              Output JSON path (default: src/database/gate-password.json)
  --iterations       PBKDF2 iterations (default: ${DEFAULT_ITERATIONS})
  --keylen           Derived key length in bytes (default: ${DEFAULT_KEY_LEN})
  -h, --help         Show this help

Notes:
  - This writes a PBKDF2 verifier (salt + hash). It does NOT store the plaintext password.
  - Avoid passing passwords on the command line in shared environments; use the prompt instead.
`;
}

async function readExistingIterations(outPath) {
	try {
		const raw = await readFile(outPath, "utf8");
		const parsed = JSON.parse(raw);
		const iterations = Number(parsed?.iterations);
		const keyLen = Number(parsed?.keyLen);
		return {
			iterations: Number.isFinite(iterations) && iterations > 0 ? iterations : null,
			keyLen: Number.isFinite(keyLen) && keyLen > 0 ? keyLen : null
		};
	} catch {
		return { iterations: null, keyLen: null };
	}
}

async function promptForPassword() {
	const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
	try {
		const pw1 = await rl.question("New gate password (input will be visible): ");
		const pw2 = await rl.question("Confirm password: ");
		if (!pw1 || pw1 !== pw2) {
			throw new Error("Passwords did not match.");
		}
		return pw1;
	} finally {
		rl.close();
	}
}

async function main() {
	const opts = parseArgs(process.argv);
	if (opts.help) {
		process.stdout.write(usage());
		process.exit(0);
	}

	const outPath = opts.outPath
		? path.resolve(process.cwd(), opts.outPath)
		: path.resolve(__dirname, "..", "src", "database", "gate-password.json");

	const existing = await readExistingIterations(outPath);
	const iterations = Number.isFinite(opts.iterations) && opts.iterations > 0 ? opts.iterations : existing.iterations ?? DEFAULT_ITERATIONS;
	const keyLen = Number.isFinite(opts.keyLen) && opts.keyLen > 0 ? opts.keyLen : existing.keyLen ?? DEFAULT_KEY_LEN;

	const password = opts.password ?? (await promptForPassword());
	if (!password) {
		throw new Error("Password is required.");
	}

	const salt = randomBytes(DEFAULT_SALT_LEN);
	const derived = pbkdf2Sync(password, salt, iterations, keyLen, "sha256");

	const config = {
		algo: "PBKDF2-SHA256",
		iterations,
		saltB64: salt.toString("base64"),
		hashB64: derived.toString("base64"),
		keyLen
	};

	await writeFile(outPath, JSON.stringify(config, null, 2) + "\n", "utf8");
	process.stdout.write(`Updated gate verifier at: ${path.relative(process.cwd(), outPath)}\n`);
}

main().catch((err) => {
	process.stderr.write(`${err?.message || err}\n`);
	process.exit(1);
});
