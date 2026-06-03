import { createClient } from '@supabase/supabase-js'

let supabaseBrowserClient: any = null

export function getSupabaseBrowserClient() {
	if (typeof window === 'undefined') {
		throw new Error('getSupabaseBrowserClient must be called in the browser')
	}

	if (supabaseBrowserClient) return supabaseBrowserClient

	const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
	const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

	if (!supabaseUrl || !supabaseAnonKey) {
		throw new Error('Supabase environment variables are missing')
	}

	supabaseBrowserClient = createClient(supabaseUrl, supabaseAnonKey)
	return supabaseBrowserClient
}

// Note: For server-side operations, use `lib/supabase/server.ts`.
