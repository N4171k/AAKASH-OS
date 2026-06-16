import { NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '../../../../lib/supabase/admin'
import { hashEmailOtpCode, isOtpExpired } from '../../../../lib/auth/emailOtp'

export async function POST(request: Request) {
	try {
		const body = await request.json()
		const username = String(body?.username || '').trim().toLowerCase()
		const code = String(body?.code || '').trim()

		if (!username || !code) {
			return NextResponse.json({ error: 'username and code are required' }, { status: 400 })
		}

		const supabase = getSupabaseAdminClient()
		const profilesTable = supabase.from('profiles') as any
		const { data: profile, error } = await supabase
			.from('profiles')
			.select('*')
			.eq('username', username)
			.maybeSingle()

		if (error || !profile) {
			return NextResponse.json({ error: 'No account found for this username' }, { status: 404 })
		}

		const account = profile as any

		// 1. Check if OTP exists
		if (!account.email_otp_hash) {
			return NextResponse.json({ error: 'No active OTP verification code found' }, { status: 400 })
		}

		// 2. Check if OTP is expired (10 mins)
		if (isOtpExpired(account.email_otp_expires_at)) {
			return NextResponse.json({ error: 'Verification code has expired. Please request a new one.' }, { status: 400 })
		}

		// 3. Check attempts (limit to 5)
		if (Number(account.email_otp_attempts || 0) >= 5) {
			return NextResponse.json({ error: 'Too many failed attempts. Please request a new code.' }, { status: 400 })
		}

		// 4. Verify OTP code match
		const hashedCode = hashEmailOtpCode(code)
		if (hashedCode !== account.email_otp_hash) {
			// Increment attempts
			const newAttempts = Number(account.email_otp_attempts || 0) + 1
			await profilesTable
				.update({ email_otp_attempts: newAttempts })
				.eq('id', account.id)

			return NextResponse.json({ error: 'Invalid verification code. Please try again.' }, { status: 400 })
		}

		// 5. Successful validation - update DB fields
		await profilesTable
			.update({
				phone_verified: true, // Mark verified for downstream compat
				enrollment_status: 'phone_verified', // Update status to proceed to TOTP setup
				email_otp_hash: null, // Clear OTP hash
				email_otp_expires_at: null, // Clear expiry
				email_otp_attempts: 0, // Reset attempts
			})
			.eq('id', account.id)

		return NextResponse.json({ ok: true, status: 'approved', valid: true })
	} catch (error) {
		console.error('Email verification check error', error)
		const message = error instanceof Error ? error.message : 'Failed to verify email'
		return NextResponse.json({ error: message }, { status: 500 })
	}
}

