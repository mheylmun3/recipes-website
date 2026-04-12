const loginForm = document.getElementById("loginForm");
const loginEmail = document.getElementById("loginEmail");
const loginPassword = document.getElementById("loginPassword");
const logoutBtn = document.getElementById("logoutBtn");
const authStatus = document.getElementById("authStatus");

const authMessageModal = document.getElementById("authMessageModal");
const authMessageTitle = document.getElementById("authMessageTitle");
const authMessageText = document.getElementById("authMessageText");
const authMessageOkBtn = document.getElementById("authMessageOkBtn");

function showAuthMessage(title, message) {
  if (!authMessageModal || !authMessageTitle || !authMessageText) return;

  authMessageTitle.textContent = title;
  authMessageText.textContent = message;
  authMessageModal.style.display = "flex";
}

function hideAuthMessage() {
  if (authMessageModal) {
    authMessageModal.style.display = "none";
  }
}

if (authMessageOkBtn) {
  authMessageOkBtn.addEventListener("click", hideAuthMessage);
}

if (authMessageModal) {
  authMessageModal.addEventListener("click", event => {
    if (event.target === authMessageModal) {
      hideAuthMessage();
    }
  });
}

async function getCurrentUser() {
  const { data, error } = await supabaseClient.auth.getUser();
  if (error) {
    console.error("Failed to get current user:", error);
    return null;
  }
  return data.user || null;
}

async function updateAuthStatus() {
  if (!authStatus) return;

  const user = await getCurrentUser();

  if (user) {
    authStatus.textContent = `Signed in as ${user.email}`;
  } else {
    authStatus.textContent = "Not signed in.";
  }
}

if (loginForm) {
  loginForm.addEventListener("submit", async event => {
    event.preventDefault();

    try {
      const { error } = await supabaseClient.auth.signInWithPassword({
        email: loginEmail.value.trim(),
        password: loginPassword.value
      });

      if (error) throw error;

      loginPassword.value = "";
      await updateAuthStatus();
      showAuthMessage("Signed In", "You have successfully signed in.");
    } catch (error) {
      console.error("Login failed:", error);
      showAuthMessage("Sign In Failed", error.message || "Login failed.");
    }
  });
}

if (logoutBtn) {
  logoutBtn.addEventListener("click", async () => {
    try {
      const { error } = await supabaseClient.auth.signOut();
      if (error) throw error;

      await updateAuthStatus();
      showAuthMessage("Signed Out", "You have successfully signed out.");
    } catch (error) {
      console.error("Logout failed:", error);
      showAuthMessage("Sign Out Failed", error.message || "Logout failed.");
    }
  });
}

document.addEventListener("DOMContentLoaded", () => {
  updateAuthStatus();
});