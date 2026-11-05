// Read the saved accounts
function getUsers() {
    const savedUsers = localStorage.getItem("easycookUsers");

    if (savedUsers === null) {
        return [];
    }

    const users = JSON.parse(savedUsers);

    if (!Array.isArray(users)) {
        throw new Error("Invalid account data");
    }

    return users;
}

function authMessage(text) {
    document.getElementById("message").textContent = text;
}

// Create a different random salt for each account
function createSalt() {
    const numbers = crypto.getRandomValues(new Uint8Array(16));

    let salt = "";

    for (let i = 0; i < numbers.length; i++) {
        salt += numbers[i].toString(16).padStart(2, "0");
    }

    return salt;
}

// Convert the password into a hash before saving
async function hashPassword(password, salt) {
    const encoder = new TextEncoder();

    const key = await crypto.subtle.importKey(
        "raw",
        encoder.encode(password),
        "PBKDF2",
        false,
        ["deriveBits"]
    );

    const result = await crypto.subtle.deriveBits(
        {
            name: "PBKDF2",
            salt: encoder.encode(salt),
            iterations: 600000,
            hash: "SHA-256"
        },
        key,
        256
    );

    const numbers = new Uint8Array(result);

    let hash = "";

    for (let i = 0; i < numbers.length; i++) {
        hash += numbers[i].toString(16).padStart(2, "0");
    }

    return hash;
}

// SIGN UP
async function signup(event) {
    event.preventDefault();

    const name = document.getElementById("name").value.trim();
    const email = document.getElementById("email").value.trim().toLowerCase();
    const password = document.getElementById("password").value;
    const confirmPassword =
        document.getElementById("confirmPassword").value;

    if (name === "") {
        authMessage("Please enter your name.");
        return;
    }

    if (password.length < 8) {
        authMessage("Your password must have at least 8 characters.");
        return;
    }

    if (password !== confirmPassword) {
        authMessage("Your passwords do not match.");
        return;
    }

    const button = document.getElementById("authButton");
    button.disabled = true;
    authMessage("Creating your account...");

    try {
        const users = getUsers();

        for (let i = 0; i < users.length; i++) {
            if (users[i].email === email) {
                authMessage("This email is already registered.");
                return;
            }
        }

        const salt = createSalt();
        const passwordHash = await hashPassword(password, salt);

        const user = {
            name: name,
            email: email,
            salt: salt,
            passwordHash: passwordHash
        };

        users.push(user);

        localStorage.setItem("easycookUsers", JSON.stringify(users));

        document.getElementById("signupForm").reset();

        authMessage("Account created! Click Log in below.");
    } catch (error) {
        authMessage("Unable to create your account. Please try again.");
    } finally {
        button.disabled = false;
    }
}

// LOGIN
async function login(event) {
    event.preventDefault();

    const email = document.getElementById("email").value.trim().toLowerCase();
    const password = document.getElementById("password").value;

    const button = document.getElementById("authButton");
    button.disabled = true;
    authMessage("Checking your account...");

    try {
        const users = getUsers();

        let foundUser = null;

        for (let i = 0; i < users.length; i++) {
            if (users[i].email === email) {
                foundUser = users[i];
                break;
            }
        }

        if (foundUser === null) {
            authMessage("Incorrect email or password.");
            return;
        }

        const passwordHash = await hashPassword(
            password,
            foundUser.salt
        );

        if (passwordHash === foundUser.passwordHash) {
            const currentUser = {
                name: foundUser.name,
                email: foundUser.email
            };

            sessionStorage.setItem(
                "easycookCurrentUser",
                JSON.stringify(currentUser)
            );

            window.location.href = "index.html";
        } else {
            authMessage("Incorrect email or password.");
        }
    } catch (error) {
        authMessage("Unable to log in. Please try again.");
    } finally {
        button.disabled = false;
    }
}

// Logout
function logout() {
    sessionStorage.removeItem("easycookCurrentUser");
    window.location.replace("login.html");
}

// Only open protected pages after login
function checkLogin() {
    try {
        const user = JSON.parse(
            sessionStorage.getItem("easycookCurrentUser")
        );

        if (!user || !user.email) {
            window.location.replace("login.html");
        }
    } catch (error) {
        sessionStorage.removeItem("easycookCurrentUser");
        window.location.replace("login.html");
    }
}

// Connect the forms to their functions
if (document.getElementById("signupForm") !== null) {
    document.getElementById("signupForm").addEventListener(
        "submit",
        signup
    );
} else if (document.getElementById("loginForm") !== null) {
    document.getElementById("loginForm").addEventListener(
        "submit",
        login
    );
} else {
    checkLogin();
}