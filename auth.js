const loginForm = document.getElementById("loginForm");
const loginEmail = document.getElementById("loginEmail");
const loginPassword = document.getElementById("loginPassword");
const logoutBtn = document.getElementById("logoutBtn");
const authStatus = document.getElementById("authStatus");

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
      alert("Signed in successfully.");
    } catch (error) {
      console.error("Login failed:", error);
      alert(error.message || "Login failed.");
    }
  });
}

if (logoutBtn) {
  logoutBtn.addEventListener("click", async () => {
    try {
      const { error } = await supabaseClient.auth.signOut();
      if (error) throw error;

      await updateAuthStatus();
      alert("Signed out.");
    } catch (error) {
      console.error("Logout failed:", error);
      alert(error.message || "Logout failed.");
    }
  });
}

document.addEventListener("DOMContentLoaded", () => {
  updateAuthStatus();
});