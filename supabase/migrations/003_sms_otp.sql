-- Stores registration OTP state for the custom SMS verification flow.

alter table public.profiles
  add column if not exists sms_otp_hash text,
  add column if not exists sms_otp_expires_at timestamptz,
  add column if not exists sms_otp_sent_at timestamptz,
  add column if not exists sms_otp_attempts integer not null default 0;