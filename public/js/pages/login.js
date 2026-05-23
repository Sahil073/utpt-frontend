import { auth as authApi } from '../api.js';
import { saveSession, redirectIfLoggedIn } from '../auth.js';
import { toast, setLoading } from '../utils.js';

redirectIfLoggedIn();

let currentStep = 0;
let collegeId   = '';
let setupToken  = '';

const steps = [0,1,2].map(i => document.getElementById(`step-${i}`));
const dots  = [0,1,2].map(i => document.getElementById(`dot-${i}`));

function goStep(n) {
  steps.forEach((s,i) => s.classList.toggle('active', i===n));
  dots.forEach((d,i)  => { d.classList.toggle('active', i===n); d.classList.toggle('done', i<n); });
  currentStep = n;
}

// ─── Tab switching ────────────────────────────────────────────
const pwForm       = document.getElementById('password-form');
const otpStartForm = document.getElementById('otp-start-form');

document.querySelectorAll('.tab-btn[data-mode]').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn[data-mode]').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const mode = btn.dataset.mode;
    pwForm.style.display       = mode === 'password' ? '' : 'none';
    otpStartForm.style.display = mode === 'otp'      ? '' : 'none';
  });
});

// ─── Password toggle ──────────────────────────────────────────
document.getElementById('pw-toggle').addEventListener('click', function() {
  const inp = document.getElementById('pw-password');
  const vis = inp.type === 'text';
  inp.type = vis ? 'password' : 'text';
  this.textContent = vis ? 'Show' : 'Hide';
});

// ─── Password Login ───────────────────────────────────────────
pwForm.addEventListener('submit', async e => {
  e.preventDefault();
  const btn = document.getElementById('pw-btn');
  const err = document.getElementById('pw-error');
  err.style.display = 'none';
  const id  = document.getElementById('pw-college-id').value.trim();
  const pwd = document.getElementById('pw-password').value;
  if (!id || !pwd) return;
  setLoading(btn, true);
  try {
    const data = await authApi.login(id, pwd);
    saveSession(data.user, data.accessToken);
    toast('Welcome back!', 'success', 2000);
    setTimeout(() => {
      window.location.href = (data.user?.role === 'admin' || data.user?.role === 'trainer') ? '/admin.html' : '/dashboard.html';
    }, 400);
  } catch (ex) {
    err.textContent   = ex.message || 'Invalid credentials';
    err.style.display = '';
    setLoading(btn, false, 'Sign in');
  }
});

// ─── OTP Step 1: Request OTP ──────────────────────────────────
otpStartForm.addEventListener('submit', async e => {
  e.preventDefault();
  const btn = document.getElementById('otp-start-btn');
  const err = document.getElementById('otp-start-error');
  err.style.display = 'none';
  collegeId = document.getElementById('otp-college-id').value.trim();
  if (!collegeId) return;
  setLoading(btn, true);
  try {
    const data = await authApi.requestOtp(collegeId);
    document.getElementById('otp-sent-to').innerHTML =
      `📧 OTP sent to <strong>${data?.email || 'your registered @gla.ac.in email'}</strong>`;
    goStep(1);
    startResendTimer();
  } catch (ex) {
    err.textContent   = ex.message || 'Could not send OTP';
    err.style.display = '';
    setLoading(btn, false, 'Send OTP →');
  }
});

// ─── OTP Step 2: Verify OTP ───────────────────────────────────
document.getElementById('otp-verify-form').addEventListener('submit', async e => {
  e.preventDefault();
  const btn = document.getElementById('otp-verify-btn');
  const err = document.getElementById('otp-error');
  err.style.display = 'none';
  const otp = document.getElementById('otp-code').value.trim();
  if (!otp) return;
  setLoading(btn, true);
  try {
    const data = await authApi.verifyOtp(collegeId, otp);
    if (data?.setupToken) {
      setupToken = data.setupToken;
      goStep(2);
    } else if (data?.accessToken) {
      saveSession(data.user, data.accessToken);
      toast('Signed in successfully!', 'success');
      setTimeout(() => window.location.href = '/dashboard.html', 400);
    }
  } catch (ex) {
    err.textContent   = ex.message || 'Invalid OTP';
    err.style.display = '';
    setLoading(btn, false, 'Verify Code');
  }
});

// ─── Step 3: Set Credentials ──────────────────────────────────
document.getElementById('setup-form').addEventListener('submit', async e => {
  e.preventDefault();
  const btn      = document.getElementById('setup-btn');
  const err      = document.getElementById('setup-error');
  err.style.display = 'none';
  const username = document.getElementById('setup-username').value.trim();
  const password = document.getElementById('setup-password').value;
  const confirm  = document.getElementById('setup-confirm').value;
  if (password !== confirm) { err.textContent = 'Passwords do not match'; err.style.display = ''; return; }
  if (password.length < 8)  { err.textContent = 'Password must be at least 8 characters'; err.style.display = ''; return; }
  setLoading(btn, true);
  try {
    const data = await authApi.setCredentials(username, password, setupToken);
    saveSession(data.user, data.accessToken);
    toast('Account created! Welcome!', 'success');
    setTimeout(() => window.location.href = '/dashboard.html', 600);
  } catch (ex) {
    err.textContent   = ex.message || 'Setup failed';
    err.style.display = '';
    setLoading(btn, false, 'Create Account & Sign in');
  }
});

// ─── Back button ──────────────────────────────────────────────
document.getElementById('back-to-0').addEventListener('click', () => goStep(0));

// ─── Resend timer ─────────────────────────────────────────────
function startResendTimer() {
  const btn = document.getElementById('resend-btn');
  let sec   = 60;
  btn.disabled = true;
  btn.textContent = `Resend (${sec}s)`;
  const t = setInterval(() => {
    sec--;
    btn.textContent = sec > 0 ? `Resend (${sec}s)` : 'Resend OTP';
    if (sec <= 0) { clearInterval(t); btn.disabled = false; }
  }, 1000);
}

document.getElementById('resend-btn').addEventListener('click', async () => {
  try {
    await authApi.requestOtp(collegeId);
    toast('OTP resent!', 'info');
    startResendTimer();
  } catch (ex) {
    toast(ex.message || 'Failed to resend OTP', 'error');
  }
});
