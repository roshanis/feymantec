-- Expose referral counts to the owner of a referral code.
-- This function returns how many waitlist rows point to the caller's ref code.

create or replace function public.waitlist_referral_count(ref text)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  owns_code boolean;
  n integer;
begin
  -- Only allow counting referrals for the caller's own ref code.
  select exists (
    select 1
    from public.waitlist_signups ws
    where ws.user_id = auth.uid()
      and ws.ref_code = ref
  )
  into owns_code;

  if not owns_code then
    return 0;
  end if;

  select count(*)::integer
  from public.waitlist_signups ws
  where ws.referred_by = ref
  into n;

  return coalesce(n, 0);
end;
$$;

revoke all on function public.waitlist_referral_count(text) from public;
grant execute on function public.waitlist_referral_count(text) to authenticated;
