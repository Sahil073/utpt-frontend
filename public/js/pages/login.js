import { auth as authApi } from "../api.js";
import { saveSession, getUser, redirectByRole, loadSession } from "../auth.js";
import { $, toast, setLoading } from "../utils.js";

// If already logged in, redirect
loadSession();
const existingUser = getUser();
if (existingUser && sessionStorage.getItem("accessToken")) {
  redirectByRole(existingUser.role);
}

const form        = $("#loginForm");
const collegeIdIn = $("#collegeId");
const passwordIn  = $("#password");
const submitBtn   = $("#submitBtn");
const togglePwd   = $("#togglePassword");

togglePwd?.addEventListener("click", () => {
  passwordIn.type = passwordIn.type === "password" ? "text" : "password";
  togglePwd.textContent = passwordIn.type === "password" ? "Show" : "Hide";
});

form?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const collegeId = collegeIdIn.value.trim();
  const password  = passwordIn.value;

  if (!collegeId || !password) {
    toast("Please enter your College ID and password.", "warning");
    return;
  }

  setLoading(submitBtn, true);
  try {
    const res = await authApi.login({ collegeId, password });
    const { accessToken, user, force_password_change } = res.data;

    saveSession(accessToken, user);

    if (force_password_change) {
      // Store flag and redirect to change-password modal on dashboard
      sessionStorage.setItem("force_pwd_change", "1");
    }

    toast("Login successful!", "success", 1200);
    setTimeout(() => redirectByRole(user.role), 600);
  } catch (err) {
    toast(err.message || "Login failed. Check your credentials.", "error");
  } finally {
    setLoading(submitBtn, false);
  }
});
