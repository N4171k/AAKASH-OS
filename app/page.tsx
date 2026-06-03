import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { SESSION_COOKIE_NAME } from '../lib/auth/session'

export default async function Home() {
  const cookieStore = await cookies()
  const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value
  redirect(sessionToken ? '/desktop' : '/login')
}
