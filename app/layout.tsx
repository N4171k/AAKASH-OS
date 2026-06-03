import './globals.css'
import LogoutOnClose from '../components/LogoutOnClose'

export const metadata = {
  title: 'AAKASH OS',
  description: 'Browser-based cloud operating system',
  icons: {
    // Use SVG as the canonical favicon
    icon: '/logo.svg',
    // Keep PNG app icons available for platforms that require them
    apple: '/apple-touch-icon.png',
    shortcut: '/favicon.ico',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <LogoutOnClose />
        {children}
      </body>
    </html>
  )
}
