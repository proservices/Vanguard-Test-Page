const GATE_PASSWORD_CONFIG_PATH = "src/database/gate-password.json";
const gate = document.getElementById("gate");
const gateForm = document.getElementById("gate-form");
const input = document.getElementById("gate-password");
const error = document.getElementById("gate-error");
const resetButton = document.getElementById("reset-access");
const loginForm = document.querySelector(".login-form");
const loginButton = loginForm ? loginForm.querySelector(".btn-login") : null;
const forgotLink = document.querySelector(".forgot-link");
const credentialsModal = document.getElementById("credentials-modal");
const credentialsList = document.getElementById("credentials-list");
const ACCESS_KEY = "vanguard_access_unlocked";
const ACTIVE_LOGIN_ID_KEY = "active_login_id";
const ACTIVE_NAME_KEY = "active_name";
const ACTIVE_PROFILE_KEY = "active_profile";
const ACTIVE_DOB_KEY = "active_dob";
const PERSONA_LOGIN_KEYS = [ACTIVE_LOGIN_ID_KEY, ACTIVE_NAME_KEY, ACTIVE_PROFILE_KEY, ACTIVE_DOB_KEY];
const LOGIN_PASSWORDS_PATH = "src/database/login-passwords.json";
let personaCredentials = null;
let gatePasswordConfig = null;

function base64ToBytes(base64) {
	const binary = atob(base64);
	const bytes = new Uint8Array(binary.length);
	for (let i = 0; i < binary.length; i++) {
		bytes[i] = binary.charCodeAt(i);
	}
	return bytes;
}

async function getGatePasswordConfig() {
	if (gatePasswordConfig) return gatePasswordConfig;
	const [config] = await loadJson(GATE_PASSWORD_CONFIG_PATH);
	gatePasswordConfig = config;
	return gatePasswordConfig;
}

async function pbkdf2VerifyPassword(password, config) {
	if (!window.crypto?.subtle) {
		throw new Error("WebCrypto unavailable");
	}

	const iterations = Number(config.iterations);
	const keyLen = Number(config.keyLen || 32);
	if (!Number.isFinite(iterations) || iterations <= 0) {
		throw new Error("Invalid iterations");
	}
	if (!Number.isFinite(keyLen) || keyLen <= 0) {
		throw new Error("Invalid key length");
	}

	const saltBytes = base64ToBytes(String(config.saltB64 || ""));
	const expectedBytes = base64ToBytes(String(config.hashB64 || ""));
	if (!saltBytes.length || !expectedBytes.length) {
		throw new Error("Invalid verifier");
	}

	const keyMaterial = await window.crypto.subtle.importKey(
		"raw",
		new TextEncoder().encode(password),
		"PBKDF2",
		false,
		["deriveBits"]
	);

	const derivedBits = await window.crypto.subtle.deriveBits(
		{
			name: "PBKDF2",
			salt: saltBytes,
			iterations,
			hash: "SHA-256"
		},
		keyMaterial,
		keyLen * 8
	);

	const derivedBytes = new Uint8Array(derivedBits);
	if (derivedBytes.length !== expectedBytes.length) return false;

	let diff = 0;
	for (let i = 0; i < derivedBytes.length; i++) {
		diff |= derivedBytes[i] ^ expectedBytes[i];
	}
	return diff === 0;
}

function unlockPage() {
	document.body.classList.remove("locked");
	gate.style.display = "none";
	localStorage.setItem(ACCESS_KEY, "1");
	loadGenesysMessenger();
}

async function loadJson(path) {
	const response = await fetch(path, { cache: "no-store" });
	if (!response.ok) {
		throw new Error(`Failed to load ${path}`);
	}
	const text = await response.text();

	try {
		const parsed = JSON.parse(text);
		return Array.isArray(parsed) ? parsed : [parsed];
	} catch {
		// Supports files that contain multiple standalone JSON objects separated by blank lines.
		return text
			.split(/\n\s*\n/g)
			.map((chunk) => chunk.trim())
			.filter(Boolean)
			.map((chunk) => JSON.parse(chunk));
	}
}

function findMatchingProfile(profiles, fullName) {
	const normalizedInput = fullName.trim().toLowerCase();
	return profiles.find((item) => `${item.firstName} ${item.lastName}`.trim().toLowerCase() === normalizedInput) || null;
}

async function updateLoginPasswordsWithId(name, password) {
	const [profiles, loginPasswords] = await Promise.all([
		loadJson("src/database/profile.json"),
		loadJson(LOGIN_PASSWORDS_PATH)
	]);

	const matchedRecord = loginPasswords.find((item) => item.name.toLowerCase() === name.toLowerCase() && item.password === password);
	if (!matchedRecord) {
		return { ok: false, reason: "invalid-credentials" };
	}

	const matchedProfile = findMatchingProfile(profiles, matchedRecord.name);
	if (!matchedProfile) {
		return { ok: false, reason: "missing-profile" };
	}

	matchedRecord._id = matchedProfile._id;
	matchedRecord.dateOfBirth = matchedProfile.dateOfBirth;
	localStorage.setItem(ACTIVE_LOGIN_ID_KEY, matchedProfile.userId || matchedProfile._id);
	localStorage.setItem(ACTIVE_NAME_KEY, `${matchedProfile.firstName} ${matchedProfile.lastName}`.trim());
	localStorage.setItem(ACTIVE_PROFILE_KEY, JSON.stringify(matchedProfile));
	localStorage.setItem(ACTIVE_DOB_KEY, matchedProfile.dateOfBirth || "");

	return { ok: true, record: matchedRecord, data: loginPasswords, profile: matchedProfile };
}

function hasPersonaLoginData() {
	return PERSONA_LOGIN_KEYS.some((key) => localStorage.getItem(key));
}

function clearMessengerCustomAttributes() {
	if (typeof window.Genesys !== "function") return;
	const clearedAttributes = {
		userLoggedIn: "false",
		userId: "",
		dateOfBirth: ""
	};

	window.Genesys("command", "Database.set", {
		messaging: {
			customAttributes: clearedAttributes
		}
	});

	console.log("Messenger customAttributes cleared", clearedAttributes);
}

function clearPersonaLoginData() {
	PERSONA_LOGIN_KEYS.forEach((key) => localStorage.removeItem(key));
	clearMessengerCustomAttributes();
}

function setPersonaMode(mode) {
	setLoginButtonMode(loginButton, mode);
	const navLoginLink = document.querySelector('.utility-links a[href="vanguard-login.html"]');
	setNavLoginMode(navLoginLink, mode);
}

function setLoginButtonMode(button, mode) {
	if (!button) return;
	button.dataset.mode = mode;
	button.textContent = mode === "logout" ? "LOG OUT" : "Log in";
	button.type = mode === "logout" ? "button" : "submit";
}

function setNavLoginMode(link, mode) {
	if (!link) return;
	link.dataset.mode = mode;
	link.textContent = mode === "logout" ? "LOG OUT" : "LOG IN";
	link.href = mode === "logout" ? "#" : "vanguard-login.html";
}

function initNavLoginToggle() {
	const navLoginLink = document.querySelector('.utility-links a[href="vanguard-login.html"]');
	if (!navLoginLink) return;

	if (hasPersonaLoginData()) {
		setNavLoginMode(navLoginLink, "logout");
	} else {
		setNavLoginMode(navLoginLink, "login");
	}

	navLoginLink.addEventListener("click", (e) => {
		if (navLoginLink.dataset.mode !== "logout") return;
		e.preventDefault();
		clearPersonaLoginData();
		setNavLoginMode(navLoginLink, "login");
	});
}

function initPersonaLogin() {
	if (!loginForm) return;

	const usernameInput = document.getElementById("username");
	const passwordInput = document.getElementById("password");
	if (!usernameInput || !passwordInput) return;

	if (hasPersonaLoginData()) {
		setPersonaMode("logout");
	} else {
		setPersonaMode("login");
	}

	if (loginButton) {
		loginButton.addEventListener("click", (e) => {
			if (loginButton.dataset.mode !== "logout") return;
			e.preventDefault();
			clearPersonaLoginData();
			setPersonaMode("login");
		});
	}

	loginForm.addEventListener("submit", async (e) => {
		e.preventDefault();
		if (loginButton && loginButton.dataset.mode === "logout") {
			return;
		}

		let result;
		try {
			result = await usePersona(usernameInput.value.trim(), passwordInput.value);
		} catch {
			alert("Unable to load login data.");
			return;
		}

		if (!result.ok) {
			const reason = result.reason === "missing-profile" ? "No profile found for this user." : "Invalid login details.";
			alert(reason);
			return;
		}

		window.location.href = "index.html";
	});
}

function loadGenesysMessenger() {
	if (window.AppSDKs && typeof window.AppSDKs.loadGenesys === "function") {
		window.AppSDKs.loadGenesys();
		return;
	}
	console.warn("AppSDKs.loadGenesys is not available on this page.");
}

function escapeHtml(value) {
	return String(value).replace(/[&<>"']/g, (char) => {
		const entities = {
			"&": "&amp;",
			"<": "&lt;",
			">": "&gt;",
			'"': "&quot;",
			"'": "&#39;"
		};
		return entities[char];
	});
}

function closeCredentialsModal() {
	if (!credentialsModal) return;
	credentialsModal.hidden = true;
	document.body.style.removeProperty("overflow");
}

function fillLoginFields(name, password) {
	const usernameInput = document.getElementById("username");
	const passwordInput = document.getElementById("password");
	if (!usernameInput || !passwordInput) return;
	usernameInput.value = name;
	passwordInput.value = password;
	passwordInput.focus();
	passwordInput.select();
}

async function usePersona(name, password) {
	const result = await updateLoginPasswordsWithId(name, password);
	if (result.ok) {
		setPersonaMode("logout");
	}
	return result;
}

function renderCredentialsModal(items) {
	if (!credentialsList) return;
	credentialsList.innerHTML = items
		.map(
			(item, index) => `
				<article class="credentials-card">
					<h3 class="credentials-card__name">Persona ${index + 1}: ${escapeHtml(item.name)}</h3>
					<div class="credentials-card__row">
						<span class="credentials-card__label">Username</span>
						<span class="credentials-card__value">${escapeHtml(item.name)}</span>
					</div>
					<div class="credentials-card__row">
						<span class="credentials-card__label">Password</span>
						<span class="credentials-card__value">${escapeHtml(item.password)}</span>
					</div>
					<div class="credentials-card__actions">
						<button type="button" class="credentials-card__use" data-use-credentials="${index}">Use these details</button>
					</div>
				</article>
			`
		)
		.join("");
}

async function openCredentialsModal() {
	if (!credentialsModal) return;
	if (!personaCredentials) {
		personaCredentials = await loadJson(LOGIN_PASSWORDS_PATH);
		renderCredentialsModal(personaCredentials);
	}
	credentialsModal.hidden = false;
	document.body.style.overflow = "hidden";
}

function initForgotCredentialsModal() {
	if (!forgotLink || !credentialsModal || !credentialsList) return;

	forgotLink.addEventListener("click", async (e) => {
		e.preventDefault();
		try {
			await openCredentialsModal();
		} catch {
			alert("Unable to load persona credentials.");
		}
	});

	credentialsModal.addEventListener("click", async (e) => {
		const target = e.target;
		if (!(target instanceof Element)) return;

		const closeButton = target.closest("[data-close-modal='true']");
		if (closeButton) {
			closeCredentialsModal();
			return;
		}

		const useButton = target.closest("[data-use-credentials]");
		if (!useButton || !(useButton instanceof HTMLElement)) return;

		const index = Number(useButton.dataset.useCredentials);
		const item = Number.isInteger(index) ? personaCredentials?.[index] : null;
		if (!item) return;

		fillLoginFields(item.name, item.password);
		clearPersonaLoginData();
		setPersonaMode("login");
		closeCredentialsModal();
	});

	document.addEventListener("keydown", (e) => {
		if (e.key === "Escape" && !credentialsModal.hidden) {
			closeCredentialsModal();
		}
	});
}

if (gate && gateForm && input && error) {
	if (localStorage.getItem(ACCESS_KEY) === "1") {
		unlockPage();
	} else {
		document.body.classList.add("locked");
		input.focus();
	}

	gateForm.addEventListener("submit", async (e) => {
		e.preventDefault();
		error.textContent = "";

		let ok = false;
		try {
			const config = await getGatePasswordConfig();
			ok = await pbkdf2VerifyPassword(input.value, config);
		} catch {
			error.textContent = "Unable to verify password";
			input.select();
			return;
		}

		if (ok) {
			unlockPage();
			return;
		}

		error.textContent = "Wrong password";
		input.select();
	});
}

initPersonaLogin();
initNavLoginToggle();
initForgotCredentialsModal();

if (resetButton) {
	resetButton.addEventListener("click", async () => {
		localStorage.removeItem(ACCESS_KEY);
		sessionStorage.clear();
		localStorage.clear();
		if ("caches" in window) {
			const keys = await caches.keys();
			await Promise.all(keys.map((key) => caches.delete(key)));
		}
		location.reload();
	});
}
