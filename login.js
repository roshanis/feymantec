/* login.js — Supabase email OTP sign-in flow
   Works with lib/feymantec-supabase.js + config.js
*/
(function () {
  "use strict";

  const qs = (sel) => document.querySelector(sel);

  /* ── Elements ─────────────────────────────────────── */
  const stepEmail   = qs("#stepEmail");
  const stepOtp     = qs("#stepOtp");
  const stepSuccess = qs("#stepSuccess");

  const emailForm   = qs("#emailForm");
  const emailInput  = qs("#loginEmail");
  const emailSubmit = qs("#emailSubmit");
  const emailError  = qs("#emailError");

  const otpForm       = qs("#otpForm");
  const otpInput      = qs("#loginOtp");
  const otpSubmit     = qs("#otpSubmit");
  const otpError      = qs("#otpError");
  const otpEmailDisp  = qs("#otpEmailDisplay");
  const backToEmail   = qs("#backToEmail");

  const resendBtn       = qs("#resendOtp");
  const resendCountdown = qs("#resendCountdown");

  const googleLogin = qs("#googleLogin");
  const appleLogin  = qs("#appleLogin");

  /* ── Supabase client ──────────────────────────────── */
  const cfg = window.__FEYNMAN_CONFIG__ || {};
  let sb = null;

  try {
    if (cfg.supabaseUrl && cfg.supabaseAnonKey) {
      sb = FeymantecSupabase.createSupabaseClient({
        supabaseUrl: cfg.supabaseUrl,
        anonKey: cfg.supabaseAnonKey,
      });
    }
  } catch (e) {
    console.warn("Supabase client init failed:", e);
  }

  let currentEmail = "";

  /* ── Helpers ──────────────────────────────────────── */
  function show(el)  { el.classList.remove("is-hidden"); }
  function hide(el)  { el.classList.add("is-hidden"); }

  function showError(el, msg, isHtml) {
    if (isHtml) {
      el.innerHTML = msg;
    } else {
      el.textContent = msg;
    }
    el.classList.add("is-visible");
  }

  function clearError(el) {
    el.textContent = "";
    el.classList.remove("is-visible");
  }

  function setLoading(btn, loading) {
    btn.disabled = loading;
    btn.classList.toggle("is-loading", loading);
    btn.setAttribute("aria-busy", String(loading));
  }

  function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  /* ── Resend cooldown ──────────────────────────────── */
  var resendTimer = null;
  var COOLDOWN = 60;

  function startResendCooldown() {
    var remaining = COOLDOWN;
    resendBtn.disabled = true;
    resendBtn.classList.add("is-disabled");
    resendCountdown.textContent = "(" + remaining + "s)";

    resendTimer = setInterval(function () {
      remaining--;
      if (remaining <= 0) {
        clearInterval(resendTimer);
        resendTimer = null;
        resendBtn.disabled = false;
        resendBtn.classList.remove("is-disabled");
        resendCountdown.textContent = "";
      } else {
        resendCountdown.textContent = "(" + remaining + "s)";
      }
    }, 1000);
  }

  function clearResendCooldown() {
    if (resendTimer) {
      clearInterval(resendTimer);
      resendTimer = null;
    }
    resendBtn.disabled = false;
    resendBtn.classList.remove("is-disabled");
    resendCountdown.textContent = "";
  }

  /* ── Step 1: Send OTP ─────────────────────────────── */
  emailForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    clearError(emailError);

    const email = (emailInput.value || "").trim().toLowerCase();
    if (!email || !isValidEmail(email)) {
      showError(emailError, "Please enter a valid email address.");
      emailInput.focus();
      return;
    }

    setLoading(emailSubmit, true);

    try {
      if (sb) {
        await sb.sendEmailOtp({ email, createUser: false });
      }
      currentEmail = email;
      otpEmailDisp.textContent = email;
      hide(stepEmail);
      show(stepOtp);
      otpInput.value = "";
      otpInput.focus();
      startResendCooldown();
    } catch (err) {
      if (err.status === 422) {
        showError(
          emailError,
          'We don\u2019t have an account for this email yet. <a href="/signup.html">Sign up to get started.</a>',
          true
        );
      } else {
        showError(emailError, err.message || "Something went wrong. Try again.");
      }
    } finally {
      setLoading(emailSubmit, false);
    }
  });

  /* ── Resend OTP ───────────────────────────────────── */
  resendBtn.addEventListener("click", async () => {
    if (resendBtn.disabled || !currentEmail) return;
    clearError(otpError);

    try {
      if (sb) {
        await sb.sendEmailOtp({ email: currentEmail, createUser: false });
      }
      startResendCooldown();
    } catch (err) {
      showError(otpError, err.message || "Could not resend code. Try again.");
    }
  });

  /* ── Step 2: Verify OTP ───────────────────────────── */
  otpForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    clearError(otpError);

    const code = (otpInput.value || "").trim();
    if (!code || code.length < 6) {
      showError(otpError, "Enter the 6-digit code from your email.");
      otpInput.focus();
      return;
    }

    setLoading(otpSubmit, true);

    try {
      if (sb) {
        const session = await sb.verifyEmailOtp({ email: currentEmail, token: code });

        if (session && session.access_token) {
          sessionStorage.setItem("feym_access_token", session.access_token);
          if (session.refresh_token) {
            sessionStorage.setItem("feym_refresh_token", session.refresh_token);
          }
        }
      }

      clearResendCooldown();
      hide(stepOtp);
      show(stepSuccess);

      setTimeout(() => {
        window.location.href = "/dashboard.html";
      }, 1200);

    } catch (err) {
      const msg = err.status === 401 || err.status === 422
        ? "Invalid or expired code. Try again."
        : err.message || "Verification failed. Try again.";
      showError(otpError, msg);
    } finally {
      setLoading(otpSubmit, false);
    }
  });

  /* ── Auto-advance when 6 digits entered ───────────── */
  otpInput.addEventListener("input", () => {
    otpInput.value = otpInput.value.replace(/\D/g, "").slice(0, 6);
    if (otpInput.value.length === 6) {
      otpForm.requestSubmit();
    }
  });

  /* ── Back to email ────────────────────────────────── */
  backToEmail.addEventListener("click", () => {
    clearError(otpError);
    clearResendCooldown();
    hide(stepOtp);
    show(stepEmail);
    emailInput.focus();
  });

  /* ── Social login (Google / Apple) ────────────────── */
  function socialLogin(provider) {
    if (!sb || !cfg.supabaseUrl) {
      // Demo mode: show OTP step as fallback
      return;
    }
    // Redirect to Supabase OAuth
    var redirectTo = window.location.origin + "/dashboard.html";
    window.location.href =
      cfg.supabaseUrl +
      "/auth/v1/authorize?provider=" + encodeURIComponent(provider) +
      "&redirect_to=" + encodeURIComponent(redirectTo);
  }

  if (googleLogin) {
    googleLogin.addEventListener("click", () => socialLogin("google"));
  }

  if (appleLogin) {
    appleLogin.addEventListener("click", () => socialLogin("apple"));
  }
})();
