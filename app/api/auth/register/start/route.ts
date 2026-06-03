import { NextResponse } from 'next/server'
import { deriveUsername } from '../../../../../lib/auth/username'
import { uploadToCloudinary } from '../../../../../lib/cloudinary'
import { normalizePhoneNumber } from '../../../../../lib/twilio/verify'
import { getSupabaseAdminClient } from '../../../../../lib/supabase/admin'

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
		const phone = normalizePhoneNumber(String(body?.phone || ''))
		const selectedApps = Array.isArray(body?.selectedApps) ? body.selectedApps : []
		const avatarDataUrl = String(body?.avatarDataUrl || '').trim()

		if (!fullName || !username || !email || !phone) {
			return NextResponse.json({ error: 'name, email, and phone are required' }, { status: 400 })
		}

		const supabase = getSupabaseAdminClient()
		const profilesTable = supabase.from('profiles') as any
		const [usernameCheck, emailCheck, phoneCheck] = await Promise.all([
			supabase.from('profiles').select('id').eq('username', username).maybeSingle(),
			supabase.from('profiles').select('id').eq('email', email).maybeSingle(),
			supabase.from('profiles').select('id').eq('phone', phone).maybeSingle(),
		])

		if (usernameCheck.data || emailCheck.data || phoneCheck.data) {
			return NextResponse.json({ error: 'An account with that username, email, or phone already exists' }, { status: 409 })
		}

		let avatarUrl: string | null = null
		if (avatarDataUrl) {
			const uploadResult = await uploadToCloudinary(avatarDataUrl, {
				resource_type: 'image',
				folder: 'aakash-os/avatars',
			})
			avatarUrl = (uploadResult as any)?.secure_url || null
		}

		const { error: insertError } = await profilesTable.insert([{ 
			username,
			email,
			phone,
			full_name: fullName,
			avatar_url: avatarUrl,
			selected_apps: selectedApps,
			enrollment_status: 'pending',
			phone_verified: false,
			totp_enabled: false,
		}])

		if (insertError) {
			throw insertError
		}

		return NextResponse.json({ ok: true, username, phone, status: 'pending-firebase-verification' })
	} catch (error) {
		console.error('Registration start error', error)
		const message = error instanceof Error ? error.message : 'Failed to start registration'
		return NextResponse.json({ error: message }, { status: 500 })
	}
}