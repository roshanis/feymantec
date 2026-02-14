const test = require("node:test");
const assert = require("node:assert/strict");

const Supa = require("../lib/feymantec-supabase.js");

test("normalizeSupabaseUrl trims whitespace and trailing slashes", () => {
  assert.equal(Supa.normalizeSupabaseUrl(" https://x.supabase.co/ "), "https://x.supabase.co");
  assert.equal(Supa.normalizeSupabaseUrl(""), "");
});

test("sendEmailOtp calls /auth/v1/otp with apikey headers", async () => {
  const calls = [];
  const fetchFn = async (url, opts) => {
    calls.push({ url, opts });
    return {
      ok: true,
      status: 200,
      json: async () => ({}),
      text: async () => "",
    };
  };

  const client = Supa.createSupabaseClient({
    supabaseUrl: "https://x.supabase.co",
    anonKey: "anon",
    fetchFn,
  });

  await client.sendEmailOtp({ email: "a@b.com" });

  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, "https://x.supabase.co/auth/v1/otp");
  assert.equal(calls[0].opts.method, "POST");
  assert.equal(calls[0].opts.headers.apikey, "anon");
  assert.equal(calls[0].opts.headers.Authorization, "Bearer anon");

  const body = JSON.parse(calls[0].opts.body);
  assert.equal(body.email, "a@b.com");
});

test("verifyEmailOtp calls /auth/v1/verify and returns session", async () => {
  const fetchFn = async (url, opts) => {
    assert.equal(url, "https://x.supabase.co/auth/v1/verify");
    const body = JSON.parse(opts.body);
    assert.equal(body.email, "a@b.com");
    assert.equal(body.token, "123456");
    assert.equal(body.type, "email");

    return {
      ok: true,
      status: 200,
      json: async () => ({
        access_token: "at",
        refresh_token: "rt",
        token_type: "bearer",
        expires_in: 3600,
        user: { id: "user-1", email: "a@b.com" },
      }),
      text: async () => "",
    };
  };

  const client = Supa.createSupabaseClient({
    supabaseUrl: "https://x.supabase.co",
    anonKey: "anon",
    fetchFn,
  });

  const sess = await client.verifyEmailOtp({ email: "a@b.com", token: "123456" });
  assert.equal(sess.access_token, "at");
  assert.equal(sess.user.id, "user-1");
});

test("insertRow uses Authorization Bearer access token", async () => {
  const calls = [];
  const fetchFn = async (url, opts) => {
    calls.push({ url, opts });
    return { ok: true, status: 201, json: async () => ({}), text: async () => "" };
  };

  const client = Supa.createSupabaseClient({
    supabaseUrl: "https://x.supabase.co",
    anonKey: "anon",
    fetchFn,
  });

  await client.insertRow({
    accessToken: "at",
    table: "waitlist_signups",
    row: { email: "a@b.com" },
  });

  assert.equal(calls[0].url, "https://x.supabase.co/rest/v1/waitlist_signups");
  assert.equal(calls[0].opts.headers.Authorization, "Bearer at");
  assert.equal(calls[0].opts.headers.apikey, "anon");
});

