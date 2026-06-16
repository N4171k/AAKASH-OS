-- Migration: Remove phone validation constraints and add email OTP columns

-- 1. Drop the NOT NULL and UNIQUE constraints on profiles.phone
ALTER TABLE public.profiles ALTER COLUMN phone DROP NOT NULL;
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_phone_key;

-- 2. Add columns for email verification OTP
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS email_otp_hash text,
  ADD COLUMN IF NOT EXISTS email_otp_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS email_otp_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS email_otp_attempts integer NOT NULL DEFAULT 0;
