import { NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '../../../lib/supabase/admin'
import { getUserFromRequest } from '../../../lib/supabase/auth'
import { listFilesForUser } from '../../../services/fileService'

function defaultPreferences() {
  return {
    theme: 'dark',
    wallpaper_url: 'linear-gradient(90deg,#f6f7f8 0%,#c8def4 32%,#92bfe9 100%)',
    dock_position: 'bottom',
    desktop_layout: {},
    window_preferences: {},
    notifications_enabled: true,
    auto_save_enabled: true,
  }
}

export async function GET(request: Request) {
  const user = (await getUserFromRequest(request)) as any
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = getSupabaseAdminClient()
  const [preferencesResult, notesResult, files] = await Promise.all([
    supabase
      .from('user_preferences')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle(),
    supabase
      .from('notes')
      .select('id, title, updated_at, pinned')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })
      .limit(4),
    listFilesForUser(user.id),
  ])

  const preferences = preferencesResult.data || defaultPreferences()
  const notes = notesResult.data || []
  const storageUsed = files.reduce((total, file) => total + Number(file.file_size || 0), 0)
  const recentFiles = files.slice(0, 4).map((file) => ({
    id: file.id,
    name: file.name,
    file_size: file.file_size,
    created_at: file.created_at,
    mime_type: file.mime_type,
  }))

  return NextResponse.json({
    profile: {
      id: user.id,
      username: user.username,
      email: user.email,
      phone: user.phone,
      full_name: user.full_name,
      avatar_url: user.avatar_url,
      selected_apps: Array.isArray(user.selected_apps) ? user.selected_apps : [],
      role: user.role,
      plan_type: user.plan_type,
      storage_used: storageUsed,
      storage_limit: Number(user.storage_limit || 0),
      last_login_at: user.last_login_at,
      created_at: user.created_at,
    },
    preferences,
    dashboard: {
      notesCount: notes.length,
      filesCount: files.length,
      storageUsed,
      storageLimit: Number(user.storage_limit || 0),
      pinnedNotesCount: notes.filter((note: any) => note.pinned).length,
      recentNotes: notes,
      recentFiles,
    },
  })
}