import { NextResponse } from 'next/server'
import { normalizePhoneNumber } from '../../../../lib/twilio/verify'
import { getSupabaseAdminClient } from '../../../../lib/supabase/admin'
import { verifyFirebaseIdToken } from '../../../../lib/firebase/admin'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const phone = normalizePhoneNumber(String(body?.phone || ''))
    const firebaseIdToken = String(body?.firebaseIdToken || '').trim()

    if (!phone || !firebaseIdToken) {
      return NextResponse.json({ error: 'phone and firebaseIdToken are required' }, { status: 400 })
    }

    const decodedToken = await verifyFirebaseIdToken(firebaseIdToken)
    const decodedPhone = decodedToken.phone_number || ''

    if (!decodedPhone || normalizePhoneNumber(decodedPhone) !== phone) {
      return NextResponse.json({ error: 'Firebase phone verification does not match the submitted phone number' }, { status: 400 })
    }

    const supabase = getSupabaseAdminClient()
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('id')
      .eq('phone', phone)
      .maybeSingle()

    if (error || !profile) {
      return NextResponse.json({ error: 'No account found for this phone number' }, { status: 404 })
    }

    const account = profile as any
    const profilesTable = supabase.from('profiles') as any

    await profilesTable
      .update({
        phone_verified: true,
        enrollment_status: 'phone_verified',
      })
      .eq('id', account.id)

    return NextResponse.json({ ok: true, status: 'approved', valid: true })
  } catch (error) {
    console.error('Twilio verification check error', error)
    const message = error instanceof Error ? error.message : 'Failed to verify Firebase phone number'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
