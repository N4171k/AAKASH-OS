import { NextResponse } from 'next/server'
import { deriveUsername } from '../../../../../lib/auth/username'
import { uploadToCloudinary } from '../../../../../lib/cloudinary'
import { getSupabaseAdminClient } from '../../../../../lib/supabase/admin'
import { validateStrictEmail, generateEmailOtpCode, hashEmailOtpCode } from '../../../../../lib/auth/emailOtp'
import { sendOtpEmail } from '../../../../../lib/email/send'

function normalizeUsername(username: string) {
	return username.trim().toLowerCase()
}

export async function POST(request: Request) {
	try {
		const body = await request.json()
		const fullName = String(body?.name || '').trim()
		const email = String(body?.email || '').trim().toLowerCase()
		const derivedUsername = deriveUsername(fullName, email)
		const username = normalizeUsername(String(body?.username || derivedUsername || ''))
		const selectedApps = Array.isArray(body?.selectedApps) ? body.selectedApps : []
		const avatarDataUrl = String(body?.avatarDataUrl || '').trim()

		if (!fullName || !username || !email) {
			return NextResponse.json({ error: 'name and email are required' }, { status: 400 })
		}

		// Strict email validation
		const emailValidation = validateStrictEmail(email)
		if (!emailValidation.isValid) {
			return NextResponse.json({ error: emailValidation.error }, { status: 400 })
		}

		const supabase = getSupabaseAdminClient()
		const profilesTable = supabase.from('profiles') as any
		const [usernameCheck, emailCheck] = await Promise.all([
			supabase.from('profiles').select('id').eq('username', username).maybeSingle(),
			supabase.from('profiles').select('id').eq('email', email).maybeSingle(),
		])

		if (usernameCheck.data || emailCheck.data) {
			return NextResponse.json({ error: 'An account with that username or email already exists' }, { status: 409 })
		}

		let avatarUrl: string | null = null
		if (avatarDataUrl) {
			const uploadResult = await uploadToCloudinary(avatarDataUrl, {
				resource_type: 'image',
				folder: 'aakash-os/avatars',
			})
			avatarUrl = (uploadResult as any)?.secure_url || null
		}

		// Generate Email OTP
		const otp = generateEmailOtpCode()
		const otpHash = hashEmailOtpCode(otp)
		const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString() // 10 minutes TTL
		const otpSentAt = new Date().toISOString()

		const { error: insertError } = await profilesTable.insert([{ 
			username,
			email,
			phone: null, // Phone is optional and not collected
			full_name: fullName,
			avatar_url: avatarUrl,
			selected_apps: selectedApps,
			enrollment_status: 'pending',
			phone_verified: false, // For downstream auth compat
			totp_enabled: false,
			email_otp_hash: otpHash,
			email_otp_expires_at: otpExpiresAt,
			email_otp_sent_at: otpSentAt,
			email_otp_attempts: 0,
		}])

		if (insertError) {
			throw insertError
		}

		// Send email OTP
		await sendOtpEmail(email, username, otp)

		return NextResponse.json({ ok: true, username, email, status: 'pending-email-verification' })
	} catch (error) {
		console.error('Registration start error', error)
		const message = error instanceof Error ? error.message : 'Failed to start registration'
		return NextResponse.json({ error: message }, { status: 500 })
	}
}