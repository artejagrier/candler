-- Track Paddle scheduled subscription changes (pending cancel/pause/resume).
-- A scheduled cancellation does NOT revoke access until scheduled_change_effective_at;
-- the subscription remains active/trialing until then per Paddle's lifecycle rules.
alter table public.subscriptions
  add column if not exists scheduled_change_action text
    check (scheduled_change_action in ('cancel', 'pause', 'resume')),
  add column if not exists scheduled_change_effective_at timestamptz;
