const PASSWORD = ["67", "65", "6e", "65", "73", "79", "73", "30", "34", "32", "36"].map((h) => String.fromCharCode(parseInt(h, 16))).join("");
const gate = document.getElementById("gate");
const form = document.getElementById("gate-form");
const input = document.getElementById("gate-password");
const error = document.getElementById("gate-error");
const resetButton = document.getElementById("reset-access");

document.body.classList.add("locked");
input.focus();

form.addEventListener("submit", (e) => {
	e.preventDefault();
	if (input.value === PASSWORD) {
		document.body.classList.remove("locked");
		gate.style.display = "none";
		return;
	}
	error.textContent = "Wrong password";
	input.select();
});

if (resetButton) {
	resetButton.addEventListener("click", async () => {
		sessionStorage.clear();
		localStorage.clear();
		if ("caches" in window) {
			const keys = await caches.keys();
			await Promise.all(keys.map((key) => caches.delete(key)));
		}
		location.reload();
	});
}
