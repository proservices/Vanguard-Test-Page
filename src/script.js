const PASSWORD = ["67", "65", "6e", "65", "73", "79", "73", "30", "34", "32", "36"].map((h) => String.fromCharCode(parseInt(h, 16))).join("");
const gate = document.getElementById("gate");
const gateForm = document.getElementById("gate-form");
const input = document.getElementById("gate-password");
const error = document.getElementById("gate-error");
const resetButton = document.getElementById("reset-access");
const loginForm = document.querySelector(".login-form");
const ACCESS_KEY = "vanguard_access_unlocked";
const GENESYS_SRC = "https://apps.euw2.pure.cloud/genesys-bootstrap/genesys.min.js";
const GENESYS_CONFIG = {
	environment: "prod-euw2",
	deploymentId: "d1514ad5-830b-4266-9cab-03eac8a179d4"
};
const UPDATED_PASSWORDS_KEY = "login_passwords_updated";
const ACTIVE_LOGIN_ID_KEY = "active_login_id";
const ACTIVE_PROFILE_KEY = "active_profile";
const ACTIVE_DOB_KEY = "active_dob";
const PERSONA_LOGIN_KEYS = [UPDATED_PASSWORDS_KEY, ACTIVE_LOGIN_ID_KEY, ACTIVE_PROFILE_KEY, ACTIVE_DOB_KEY];

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
		loadJson("src/database/login-passwords.json")
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
	localStorage.setItem(UPDATED_PASSWORDS_KEY, JSON.stringify(loginPasswords));
	localStorage.setItem(ACTIVE_LOGIN_ID_KEY, matchedProfile._id);
	localStorage.setItem(ACTIVE_PROFILE_KEY, JSON.stringify(matchedProfile));
	localStorage.setItem(ACTIVE_DOB_KEY, matchedProfile.dateOfBirth || "");

	return { ok: true, record: matchedRecord, data: loginPasswords, profile: matchedProfile };
}

function hasPersonaLoginData() {
	return PERSONA_LOGIN_KEYS.some((key) => localStorage.getItem(key));
}

function clearPersonaLoginData() {
	PERSONA_LOGIN_KEYS.forEach((key) => localStorage.removeItem(key));
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
	const loginButton = loginForm.querySelector(".btn-login");
	if (!usernameInput || !passwordInput) return;

	if (hasPersonaLoginData()) {
		setLoginButtonMode(loginButton, "logout");
	} else {
		setLoginButtonMode(loginButton, "login");
	}

	if (loginButton) {
		loginButton.addEventListener("click", (e) => {
			if (loginButton.dataset.mode !== "logout") return;
			e.preventDefault();
			clearPersonaLoginData();
			setLoginButtonMode(loginButton, "login");
		});
	}

	loginForm.addEventListener("submit", async (e) => {
		e.preventDefault();
		if (loginButton && loginButton.dataset.mode === "logout") {
			return;
		}

		let result;
		try {
			result = await updateLoginPasswordsWithId(usernameInput.value.trim(), passwordInput.value);
		} catch {
			alert("Unable to load login data.");
			return;
		}

		if (!result.ok) {
			const reason = result.reason === "missing-profile" ? "No profile found for this user." : "Invalid login details.";
			alert(reason);
			return;
		}

		console.log("Updated login-passwords data", result.data);
		setLoginButtonMode(loginButton, "logout");
		window.location.href = "index.html";
	});
}

function loadGenesysMessenger() {
	if (window.Genesys) return;
	window._genesysJs = "Genesys";
	window.Genesys = window.Genesys || function () {
		(window.Genesys.q = window.Genesys.q || []).push(arguments);
	};
	window.Genesys.t = Date.now();
	window.Genesys.c = GENESYS_CONFIG;
	const s = document.createElement("script");
	s.async = true;
	s.src = GENESYS_SRC;
	s.charset = "utf-8";
	document.head.appendChild(s);
}

if (gate && gateForm && input && error) {
	if (localStorage.getItem(ACCESS_KEY) === "1") {
		unlockPage();
	} else {
		document.body.classList.add("locked");
		input.focus();
	}

	gateForm.addEventListener("submit", (e) => {
		e.preventDefault();
		if (input.value === PASSWORD) {
			unlockPage();
			return;
		}
		error.textContent = "Wrong password";
		input.select();
	});
}

initPersonaLogin();
initNavLoginToggle();

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
