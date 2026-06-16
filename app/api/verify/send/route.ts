import { NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '../../../../lib/supabase/admin'
import { generateEmailOtpCode, hashEmailOtpCode, EMAIL_OTP_COOLDOWN_SECONDS } from '../../../../lib/auth/emailOtp'
import { sendOtpEmail } from '../../../../lib/email/send'

export async function POST(request: Request) {
	try {
		const body = await request.json()
		const username = String(body?.username || '').trim().toLowerCase()

		if (!username) {
			return NextResponse.json({ error: 'username is required' }, { status: 400 })
		}

		const supabase = getSupabaseAdminClient()
		const { data: profile, error } = await supabase
			.from('profiles')
			.select('*')
			.eq('username', username)
			.maybeSingle()

		if (error || !profile) {
			return NextResponse.json({ error: 'No account found for this username' }, { status: 404 })
		}

		const account = profile as any

		// Enforce cooldown check
		if (account.email_otp_sent_at) {
			const elapsedMs = Date.now() - new Date(account.email_otp_sent_at).getTime()
			const elapsedSeconds = Math.floor(elapsedMs / 1000)
			if (elapsedSeconds < EMAIL_OTP_COOLDOWN_SECONDS) {
				const remainingSeconds = EMAIL_OTP_COOLDOWN_SECONDS - elapsedSeconds
				return NextResponse.json({ 
					error: `Please wait ${remainingSeconds} seconds before requesting a new code.` 
				}, { status: 429 })
			}
		}

		// Generate new OTP
		const otp = generateEmailOtpCode()
		const otpHash = hashEmailOtpCode(otp)
		const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString() // 10 minutes TTL
		const otpSentAt = new Date().toISOString()

		const profilesTable = supabase.from('profiles') as any
		const { error: updateError } = await profilesTable
			.update({
				email_otp_hash: otpHash,
				email_otp_expires_at: otpExpiresAt,
				email_otp_sent_at: otpSentAt,
				email_otp_attempts: 0,
			})
			.eq('id', account.id)

		if (updateError) {
			throw updateError
		}

		// Send email OTP
		await sendOtpEmail(account.email, username, otp)

		return NextResponse.json({ ok: true, message: 'Verification code resent successfully' })
	} catch (error) {
		console.error('Email verification resend error', error)
		const message = error instanceof Error ? error.message : 'Failed to resend verification code'
		return NextResponse.json({ error: message }, { status: 500 })
	}
}

