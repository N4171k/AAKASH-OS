import { NextResponse } from 'next/server'
import { getUserFromRequest } from '../../../lib/supabase/auth'
import { getSupabaseAdminClient } from '../../../lib/supabase/admin'

export async function GET(request: Request) {
  const user = (await getUserFromRequest(request)) as any
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = getSupabaseAdminClient()
  const notesTable = supabase.from('notes') as any
  const { data } = await notesTable.select('*').eq('user_id', user.id).order('updated_at', { ascending: false }).limit(50)
  return NextResponse.json({ notes: data })
}

export async function POST(request: Request) {
  const user = (await getUserFromRequest(request)) as any
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { id, content, title } = body
  const supabase = getSupabaseAdminClient()
  const notesTable = supabase.from('notes') as any

  if (id) {
    const { data, error } = await notesTable
      .update({ content, title })
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error || !data) {
      return NextResponse.json({ error: 'Note not found' }, { status: 404 })
    }

    return NextResponse.json({ note: data })
  }

  const { data, error } = await notesTable.insert([{ user_id: user.id, content, title }]).select().single()

  if (error || !data) {
    return NextResponse.json({ error: 'Failed to save note' }, { status: 500 })
  }

  return NextResponse.json({ note: data })
}
