import { describe, it, expect } from 'vitest';

// Import the module (UMD format works with dynamic import)
const Supa = await import('../lib/feymantec-supabase.js').then(m => m.default || m);

describe('normalizeSupabaseUrl', () => {
  it('trims whitespace and trailing slashes', () => {
    expect(Supa.normalizeSupabaseUrl(' https://x.supabase.co/ ')).toBe('https://x.supabase.co');
    expect(Supa.normalizeSupabaseUrl('')).toBe('');
  });
});

describe('createSupabaseClient', () => {
  it('sendEmailOtp calls /auth/v1/otp with apikey headers', async () => {
    const calls = [];
    const fetchFn = async (url, opts) => {
      calls.push({ url, opts });
      return {
        ok: true,
        status: 200,
        json: async () => ({}),
        text: async () => '',
      };
    };

    const client = Supa.createSupabaseClient({
      supabaseUrl: 'https://x.supabase.co',
      anonKey: 'anon',
      fetchFn,
    });

    await client.sendEmailOtp({ email: 'a@b.com' });

    expect(calls).toHaveLength(1);
    expect(calls[0].url).toBe('https://x.supabase.co/auth/v1/otp');
    expect(calls[0].opts.method).toBe('POST');
    expect(calls[0].opts.headers.apikey).toBe('anon');
    expect(calls[0].opts.headers.Authorization).toBe('Bearer anon');

    const body = JSON.parse(calls[0].opts.body);
    expect(body.email).toBe('a@b.com');
  });

  it('verifyEmailOtp calls /auth/v1/verify and returns session', async () => {
    const fetchFn = async (url, opts) => {
      expect(url).toBe('https://x.supabase.co/auth/v1/verify');
      const body = JSON.parse(opts.body);
      expect(body.email).toBe('a@b.com');
      expect(body.token).toBe('123456');
      expect(body.type).toBe('email');

      return {
        ok: true,
        status: 200,
        json: async () => ({
          access_token: 'at',
          refresh_token: 'rt',
          token_type: 'bearer',
          expires_in: 3600,
          user: { id: 'user-1', email: 'a@b.com' },
        }),
        text: async () => '',
      };
    };

    const client = Supa.createSupabaseClient({
      supabaseUrl: 'https://x.supabase.co',
      anonKey: 'anon',
      fetchFn,
    });

    const sess = await client.verifyEmailOtp({ email: 'a@b.com', token: '123456' });
    expect(sess.access_token).toBe('at');
    expect(sess.user.id).toBe('user-1');
  });

  it('insertRow uses Authorization Bearer access token', async () => {
    const calls = [];
    const fetchFn = async (url, opts) => {
      calls.push({ url, opts });
      return { ok: true, status: 201, json: async () => ({}), text: async () => '' };
    };

    const client = Supa.createSupabaseClient({
      supabaseUrl: 'https://x.supabase.co',
      anonKey: 'anon',
      fetchFn,
    });

    await client.insertRow({
      accessToken: 'at',
      table: 'waitlist_signups',
      row: { email: 'a@b.com' },
    });

    expect(calls[0].url).toBe('https://x.supabase.co/rest/v1/waitlist_signups');
    expect(calls[0].opts.headers.Authorization).toBe('Bearer at');
    expect(calls[0].opts.headers.apikey).toBe('anon');
  });

  it('selectFirst calls /rest/v1/<table> with filters and returns first row', async () => {
    const calls = [];
    const fetchFn = async (url, opts) => {
      calls.push({ url, opts });
      return {
        ok: true,
        status: 200,
        json: async () => [{ ref_code: 'ABC123' }],
        text: async () => '',
      };
    };

    const client = Supa.createSupabaseClient({
      supabaseUrl: 'https://x.supabase.co',
      anonKey: 'anon',
      fetchFn,
    });

    const row = await client.selectFirst({
      accessToken: 'at',
      table: 'waitlist_signups',
      select: 'ref_code',
      filters: [{ col: 'user_id', op: 'eq', value: 'user-1' }],
    });

    expect(row).toEqual({ ref_code: 'ABC123' });
    expect(calls[0].opts.method).toBe('GET');
    expect(calls[0].opts.headers.Authorization).toBe('Bearer at');
    expect(calls[0].opts.headers.apikey).toBe('anon');

    // Spot-check query params.
    expect(calls[0].url).toContain('/rest/v1/waitlist_signups?');
    expect(calls[0].url).toContain('select=ref_code');
    expect(calls[0].url).toContain('user_id=eq.user-1');
    expect(calls[0].url).toContain('limit=1');
  });
});

