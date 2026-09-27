const loginForm = document.getElementById("login-form");
const usernameInput = document.getElementById("username");
const passwordInput = document.getElementById("password");
const loginButton = document.getElementById("login-button");
const usersUrl = "https://dummyjson.com/users";

const loginMessage = document.createElement("p");
loginMessage.setAttribute("role", "status");
loginMessage.setAttribute("aria-live", "polite");
loginMessage.style.margin = "12px 0 0";
loginMessage.style.textAlign = "center";
loginMessage.style.color = "#fdbb16";
loginForm.appendChild(loginMessage);

loginForm.addEventListener("submit", (event) => {
	event.preventDefault();
});

loginButton.addEventListener("click", async () => {
	const username = usernameInput.value.trim();
	const password = passwordInput.value;

	if (username === "" || password === "") {
		loginMessage.textContent = "Username dan password wajib diisi.";
		return;
	}

	loginButton.disabled = true;
	loginButton.textContent = "Loading...";
	loginMessage.textContent = "Memverifikasi data login...";

	try {
		const response = await fetch(usersUrl);

		if (!response.ok) {
			throw new Error("API tidak dapat diakses.");
		}

		const data = await response.json();
		const user = data.users.find(
			(account) => account.username === username && account.password === password
		);

		if (!user) {
			loginMessage.textContent = "Username atau password salah.";
			return;
		}

		localStorage.setItem("firstName", user.firstName);
		window.location.href = "catalog.html";
	} catch (error) {
		loginMessage.textContent =
			"Login gagal. Periksa koneksi internet dan coba lagi.";
	} finally {
		loginButton.disabled = false;
		loginButton.textContent = "Login";
	}
});
