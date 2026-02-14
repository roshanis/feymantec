/* signup.js — Supabase email OTP signup flow */
(function () {
  "use strict";

  const qs = (sel) => document.querySelector(sel);

  // Elements
  const stepEmail = qs("#stepEmail");
  const stepOtp = qs("#stepOtp");
  const stepSuccess = qs("#stepSuccess");

  const emailForm = qs("#emailForm");
  const emailInput = qs("#signupEmail");
  const emailSubmit = qs("#emailSubmit");
  const emailError = qs("#emailError");

  const otpForm = qs("#otpForm");
  const otpInput = qs("#signupOtp");
  const otpSubmit = qs("#otpSubmit");
  const otpError = qs("#otpError");
  const otpEmailDisp = qs("#otpEmailDisplay");
  const backToEmail = qs("#backToEmail");

  const resendBtn = qs("#resendOtp");
  const resendCountdown = qs("#resendCountdown");

  const googleSignup = qs("#googleSignup");
  const appleSignup = qs("#appleSignup");

  // State
  let currentEmail = "";
  let resendTimer = null;

  // Get Supabase client
  function getSupabase() {
    return window.FeymantecSupabase?.supabase || null;
  }

  // Show step
  function showStep(step) {
    [stepEmail, stepOtp, stepSuccess].forEach((el) => {
      if (el) el.classList.toggle("is-hidden", el !== step);
    });
  }

  // Show error
  function showError(el, msg) {
    if (el) {
      el.textContent = msg;
      el.hidden = false;
    }
  }

  function hideError(el) {
    if (el) el.hidden = true;
  }

  // Resend countdown
  function startResendCountdown(seconds = 60) {
    if (resendTimer) clearInterval(resendTimer);
    let remaining = seconds;
    
    if (resendBtn) resendBtn.disabled = true;
    if (resendCountdown) resendCountdown.textContent = "(" + remaining + "s)";

    resendTimer = setInterval(() => {
      remaining--;
      if (resendCountdown) resendCountdown.textContent = "(" + remaining + "s)";
      
      if (remaining <= 0) {
        clearInterval(resendTimer);
        if (resendBtn) resendBtn.disabled = false;
        if (resendCountdown) resendCountdown.textContent = "";
      }
    }, 1000);
  }

  // Send OTP
  async function sendOtp(email) {
    const supabase = getSupabase();
    if (!supabase) {
      throw new Error("Supabase not configured. Check config.js");
    }

    const { error } = await supabase.auth.signInWithOtp({
      email: email,
      options: {
        shouldCreateUser: true,
      },
    });

    if (error) throw error;
    return true;
  }

  // Verify OTP
  async function verifyOtp(email, token) {
    const supabase = getSupabase();
    if (!supabase) {
      throw new Error("Supabase not configured. Check config.js");
    }

    const { data, error } = await supabase.auth.verifyOtp({
      email: email,
      token: token,
      type: "email",
    });

    if (error) throw error;
    return data;
  }

  // OAuth signup
  async function oauthSignup(provider) {
    const supabase = getSupabase();
    if (!supabase) {
      alert("Supabase not configured. Check config.js");
      return;
    }

    const { error } = await supabase.auth.signInWithOAuth({
      provider: provider,
      options: {
        redirectTo: window.location.origin + "/onboarding.html",
      },
    });

    if (error) {
      alert("OAuth error: " + error.message);
    }
  }

  // Email form submit
  if (emailForm) {
    emailForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      hideError(emailError);

      const email = (emailInput?.value || "").trim().toLowerCase();
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        showError(emailError, "Please enter a valid email address.");
        return;
      }

      if (emailSubmit) {
        emailSubmit.disabled = true;
        emailSubmit.textContent = "Sending...";
      }

      try {
        await sendOtp(email);
        currentEmail = email;
        if (otpEmailDisp) otpEmailDisp.textContent = email;
        showStep(stepOtp);
        startResendCountdown(60);
        if (otpInput) otpInput.focus();
      } catch (err) {
        showError(emailError, err.message || "Failed to send code. Try again.");
      } finally {
        if (emailSubmit) {
          emailSubmit.disabled = false;
          emailSubmit.textContent = "Send verification code";
        }
      }
    });
  }

  // OTP form submit
  if (otpForm) {
    otpForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      hideError(otpError);

      const token = (otpInput?.value || "").trim();
      if (!token || token.length < 6) {
        showError(otpError, "Please enter the 6-digit code.");
        return;
      }

      if (otpSubmit) {
        otpSubmit.disabled = true;
        otpSubmit.textContent = "Verifying...";
      }

      try {
        await verifyOtp(currentEmail, token);
        showStep(stepSuccess);
      } catch (err) {
        showError(otpError, err.message || "Invalid code. Try again.");
      } finally {
        if (otpSubmit) {
          otpSubmit.disabled = false;
          otpSubmit.textContent = "Verify & create account";
        }
      }
    });
  }

  // Resend button
  if (resendBtn) {
    resendBtn.addEventListener("click", async () => {
      if (!currentEmail) return;
      
      resendBtn.disabled = true;
      try {
        await sendOtp(currentEmail);
        startResendCountdown(60);
      } catch (err) {
        showError(otpError, "Failed to resend. Try again.");
        resendBtn.disabled = false;
      }
    });
  }

  // Back button
  if (backToEmail) {
    backToEmail.addEventListener("click", () => {
      currentEmail = "";
      if (otpInput) otpInput.value = "";
      hideError(otpError);
      showStep(stepEmail);
      if (emailInput) emailInput.focus();
    });
  }

  // OAuth buttons
  if (googleSignup) {
    googleSignup.addEventListener("click", () => oauthSignup("google"));
  }
  if (appleSignup) {
    appleSignup.addEventListener("click", () => oauthSignup("apple"));
  }

  // Check if already logged in
  async function checkSession() {
    const supabase = getSupabase();
    if (!supabase) return;

    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      // Already logged in, redirect to dashboard or onboarding
      window.location.href = "dashboard.html";
    }
  }

  checkSession();
})();
