import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import DesktopShell from '../../components/desktop/DesktopShell'
import { SESSION_COOKIE_NAME } from '../../lib/auth/session'

export default async function DesktopPage() {
  const cookieStore = await cookies()
  const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value
  if (!sessionToken) {
    redirect('/login')
  }

  return <DesktopShell />
}
