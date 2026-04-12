async function getCurrentUserSafe() {
  const { data, error } = await supabaseClient.auth.getUser();
  if (error) {
    console.error("Failed to retrieve auth user:", error);
    return null;
  }
  return data.user || null;
}

async function requireApprovedUser() {
  const user = await getCurrentUserSafe();

  if (!user) {
    alert("You must be signed in to make changes.");
    window.location.href = "login.html";
    return null;
  }

  return user;
}

async function toggleProtectedUI() {
  const user = await getCurrentUserSafe();
  const protectedElements = document.querySelectorAll("[data-requires-auth='true']");

  protectedElements.forEach(el => {
    el.style.display = user ? "" : "none";
  });
}

document.addEventListener("DOMContentLoaded", () => {
  toggleProtectedUI();
});