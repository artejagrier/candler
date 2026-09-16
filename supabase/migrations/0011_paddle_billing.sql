-- Migrate billing identifiers from Stripe to Paddle.
-- Renames columns in subscriptions and renames the webhook-event idempotency table.

-- Rename customer/subscription/price columns
alter table public.subscriptions rename column stripe_customer_id to paddle_customer_id;
alter table public.subscriptions rename column stripe_subscription_id to paddle_subscription_id;
alter table public.subscriptions rename column stripe_price_id to paddle_price_id;

-- Paddle customer IDs are nullable (no subscription yet), so relax the NOT NULL constraint.
-- The original column was NOT NULL on stripe_customer_id; Paddle creates the customer on first
-- checkout completion so we cannot require it up front.
alter table public.subscriptions alter column paddle_customer_id drop not null;

-- Rename idempotency table
alter table public.stripe_webhook_events rename to paddle_webhook_events;
