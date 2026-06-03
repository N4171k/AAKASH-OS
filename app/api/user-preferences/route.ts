import { NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '../../../lib/supabase/admin'
import { getUserFromRequest } from '../../../lib/supabase/auth'

// 1. Define Types for better safety
type ThemeMode = 'aakash' | 'paatal' | 'dharti' | 'antariksh';

interface UserPreferences {
  theme: ThemeMode;
  wallpaper_url: string;
  dock_position: 'bottom' | 'left' | 'right' | 'top';
  desktop_layout: Record<string, any>;
  window_preferences: Record<string, any>;
  notifications_enabled: boolean;
  auto_save_enabled: boolean;
}

// 2. Creative Theme Definitions
const THEME_DEFINITIONS: Record<ThemeMode, { wallpaper: string; defaultDock: string }> = {
  aakash: {
    // Light theme with #8dc0f0 accents (Sky/Air)
    wallpaper: 'linear-gradient(135deg, #fdfefe 0%, #e6f2fd 40%, #8dc0f0 100%)',
    defaultDock: 'bottom',
  },
  paatal: {
    // Dark system with deep red accents (Underworld/Depths)
    wallpaper: 'radial-gradient(circle at 50% 100%, #3a0a0a 0%, #1a0505 50%, #0a0000 100%)',
    defaultDock: 'bottom',
  },
  dharti: {
    // Light theme with green accents (Earth/Nature)
    wallpaper: 'linear-gradient(135deg, #fbfdf9 0%, #e8f5e9 40%, #81c784 100%)',
    defaultDock: 'bottom',
  },
  antariksh: {
    // Deep dark space theme with a starry representation (Space/Cosmos)
    // Using a complex CSS background to simulate space and stars, or you can replace with a real URL like 'url(/stars.webp)'
    wallpaper: 'radial-gradient(ellipse at bottom, #1b2735 0%, #090a0f 100%)',
    defaultDock: 'bottom',
  }
}

// 3. Default Generator
function getDefaultPreferences(theme: ThemeMode = 'aakash'): UserPreferences {
  const selectedTheme = THEME_DEFINITIONS[theme] || THEME_DEFINITIONS['aakash'];
  
  return {
    theme,
    wallpaper_url: selectedTheme.wallpaper,
    dock_position: selectedTheme.defaultDock as UserPreferences['dock_position'],
    desktop_layout: {},
    window_preferences: {},
    notifications_enabled: true,
    auto_save_enabled: true,
  }
}

export async function GET(request: Request) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const supabase = getSupabaseAdminClient()
    const { data, error } = await supabase
      .from('user_preferences')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle()

    if (error) throw error

    return NextResponse.json({ preferences: data || getDefaultPreferences() })
  } catch (err: any) {
    const message = err?.message || 'Unknown error'
    const devDetails = process.env.NODE_ENV === 'development' ? { stack: err?.stack } : undefined
    return NextResponse.json({ error: message, details: devDetails }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const supabase = getSupabaseAdminClient()

    // 1. Fetch existing preferences first to allow partial updates safely
    const { data: existingPrefs } = await supabase
      .from('user_preferences')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle()

    // 2. Resolve the new theme (fallback to existing, then to aakash)
    const newTheme = (body?.theme || existingPrefs?.theme || 'aakash') as ThemeMode;
    const themeChanged = existingPrefs?.theme !== newTheme;
    
    // 3. Resolve wallpaper: If the theme changed and no explicit wallpaper was provided in the body, 
    // auto-switch the wallpaper to match the new theme.
    let resolvedWallpaper = body?.wallpaperUrl ?? body?.wallpaper_url ?? existingPrefs?.wallpaper_url;
    if (themeChanged && (!body.wallpaperUrl && !body.wallpaper_url)) {
       resolvedWallpaper = THEME_DEFINITIONS[newTheme]?.wallpaper;
    }

    // 4. Merge old preferences with incoming payload
    const payload = {
      user_id: user.id,
      theme: newTheme,
      wallpaper_url: resolvedWallpaper ?? THEME_DEFINITIONS['aakash'].wallpaper,
      dock_position: body?.dockPosition ?? body?.dock_position ?? existingPrefs?.dock_position ?? 'bottom',
      desktop_layout: body?.desktopLayout ?? body?.desktop_layout ?? existingPrefs?.desktop_layout ?? {},
      window_preferences: body?.windowPreferences ?? body?.window_preferences ?? existingPrefs?.window_preferences ?? {},
      notifications_enabled: body?.notificationsEnabled ?? body?.notifications_enabled ?? existingPrefs?.notifications_enabled ?? true,
      auto_save_enabled: body?.autoSaveEnabled ?? body?.auto_save_enabled ?? existingPrefs?.auto_save_enabled ?? true,
    }

    // 5. Upsert the merged data
    const { data, error } = await supabase
      .from('user_preferences')
      .upsert([payload], { onConflict: 'user_id' })
      .select('*')
      .single()

    if (error || !data) {
      const message = error?.message || 'Failed to save preferences'
      const devDetails = process.env.NODE_ENV === 'development' ? { error } : undefined
      return NextResponse.json({ error: message, details: devDetails }, { status: 500 })
    }

    return NextResponse.json({ preferences: data })
  } catch (err: any) {
    const message = err?.message || 'Unknown error'
    const devDetails = process.env.NODE_ENV === 'development' ? { stack: err?.stack } : undefined
    return NextResponse.json({ error: message, details: devDetails }, { status: 500 })
  }
}