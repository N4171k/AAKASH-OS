"use client"

import { jsPDF } from 'jspdf'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useMemo, useRef, useState, KeyboardEvent } from 'react'
import { ConfirmationResult, RecaptchaVerifier, signInWithPhoneNumber } from 'firebase/auth'
import { getFirebaseAuth } from '../../../lib/firebase/client'
import { normalizeE164PhoneNumber } from '../../../lib/auth/phone'

export default function VerifyClient() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const phone = useMemo(() => searchParams.get('phone') || '', [searchParams])
  const username = useMemo(() => searchParams.get('username') || '', [searchParams])
  const email = useMemo(() => searchParams.get('email') || '', [searchParams])
  const [phase, setPhase] = useState<'sms' | 'setup' | 'done'>('sms')
  const [code, setCode] = useState('')
  const [totpCode, setTotpCode] = useState('')
  const [secret, setSecret] = useState('')
  const [qrDataUrl, setQrDataUrl] = useState('')
  const [backupCodes, setBackupCodes] = useState<string[]>([])
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [smsSent, setSmsSent] = useState(false)
  const confirmationResultRef = useRef<ConfirmationResult | null>(null)
  const recaptchaVerifierRef = useRef<RecaptchaVerifier | null>(null)
  const recaptchaContainerRef = useRef<HTMLDivElement | null>(null)
  const normalizedPhone = useMemo(() => normalizeE164PhoneNumber(phone), [phone])

  const sendSmsCode = async () => {
    if (!normalizedPhone || !username) {
      setMessage('Enter the phone number you used when registering.')
      return
    }

    try {
      setLoading(true)
      setMessage('Sending Firebase verification code...')

      const auth = getFirebaseAuth()

      if (!recaptchaVerifierRef.current) {
        if (!recaptchaContainerRef.current) {
          throw new Error('Firebase reCAPTCHA container is missing')
        }

        recaptchaVerifierRef.current = new RecaptchaVerifier(auth, recaptchaContainerRef.current, {
          size: 'invisible',
        })

        await recaptchaVerifierRef.current.render()
      }

      const confirmation = await signInWithPhoneNumber(auth, normalizedPhone, recaptchaVerifierRef.current)
      confirmationResultRef.current = confirmation
      setSmsSent(true)
      setMessage(`Code sent to ${normalizedPhone}`)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Failed to send verification code')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (phase !== 'sms' || smsSent || !normalizedPhone || !username) {
      return
    }
    void sendSmsCode()
  }, [phase, normalizedPhone, smsSent, username])

  const verifyPhone = async () => {
    setLoading(true)
    setMessage('')

    try {
      const confirmationResult = confirmationResultRef.current
      if (!confirmationResult) {
        setMessage('Send the Firebase code again before verifying.')
        return
      }

      const credential = await confirmationResult.confirm(code)
      const firebaseIdToken = await credential.user.getIdToken()

      const response = await fetch('/api/verify/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: normalizedPhone, firebaseIdToken }),
      })

      const result = await response.json()

      if (!response.ok) {
        setMessage(result?.error || 'Verification failed')
      } else if (result?.ok) {
        const setupResponse = await fetch('/api/auth/register/complete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username }),
        })

        const setupResult = await setupResponse.json()
        if (!setupResponse.ok) {
          setMessage(setupResult?.error || 'Unable to create TOTP setup')
          return
        }

        setSecret(setupResult?.secret || '')
        setQrDataUrl(setupResult?.qrDataUrl || '')
        setBackupCodes(Array.isArray(setupResult?.backupCodes) ? setupResult.backupCodes : [])
        setPhase('setup')
        setMessage('Phone verified. Scan the QR code in your authenticator app.')
      } else {
        setMessage('Invalid code')
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Verification failed')
    } finally {
      setLoading(false)
    }
  }

  const confirmTotp = async () => {
    setLoading(true)
    setMessage('')

    try {
      const response = await fetch('/api/auth/register/confirm-totp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, token: totpCode }),
      })

      const result = await response.json()

      if (!response.ok) {
        setMessage(result?.error || 'TOTP confirmation failed')
        return
      }

      setPhase('done')
      setMessage('TOTP confirmed. You can now log in.')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'TOTP confirmation failed')
    } finally {
      setLoading(false)
    }
  }

  const downloadBackupCodes = () => {
    const doc = new jsPDF()
    doc.setFontSize(18)
    doc.text('AAKASH OS Recovery Codes', 14, 20)
    doc.setFontSize(12)
    doc.text(`Username: ${username || 'Unknown'}`, 14, 34)
    doc.text('Store these codes somewhere safe. Each code can be used once.', 14, 44)
    backupCodes.forEach((entry, index) => {
      doc.text(`${index + 1}. ${entry}`, 14, 58 + index * 10)
    })
    doc.save('aakash-os-recovery-codes.pdf')
  }

  const emailBackupCodes = async () => {
    setLoading(true)
    setMessage('')

    try {
      const response = await fetch('/api/auth/register/email-backup-codes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, username, backupCodes }),
      })

      const result = await response.json()
      if (!response.ok) {
        setMessage(result?.error || 'Unable to email backup codes')
        return
      }

      if (result?.fallbackMailto) {
        window.location.href = result.fallbackMailto
        return
      }

      setMessage('Recovery codes emailed successfully')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to email backup codes')
    } finally {
      setLoading(false)
    }
  }

  // Helper for OTP auto-advance UX
  const handleOtpInput = (
    index: number,
    event: React.ChangeEvent<HTMLInputElement>,
    currentValue: string,
    setter: (val: string) => void,
    prefix: string
  ) => {
    const nextValue = event.target.value.replace(/\D/g, '').slice(-1)
    const nextCode = currentValue.split('')
    nextCode[index] = nextValue
    setter(nextCode.join('').slice(0, 6))

    if (nextValue && index < 5) {
      const nextInput = document.getElementById(`${prefix}-${index + 1}`)
      nextInput?.focus()
    }
  }

  const handleOtpKeyDown = (
    index: number,
    event: KeyboardEvent<HTMLInputElement>,
    prefix: string
  ) => {
    if (event.key === 'Backspace' && !(event.target as HTMLInputElement).value && index > 0) {
      const prevInput = document.getElementById(`${prefix}-${index - 1}`)
      prevInput?.focus()
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[linear-gradient(135deg,#edf4ff_0%,#dceeff_55%,#7cbaff_100%)] p-6 font-sans">
      <div className="flex w-full max-w-[1024px] min-h-[690px] overflow-hidden rounded-[32px] bg-white shadow-[0_24px_80px_rgba(70,140,224,0.3)]">
        
        {/* Left Form Panel */}
        <div className="flex flex-1 items-center justify-center px-8 py-14 lg:px-12">
          <div className="w-full max-w-[420px]">
            
            {phase === 'sms' && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <h1 className="text-[42px] font-extrabold tracking-tight leading-[1.1] text-[#2e95ff]">
                  Let's <br />Confirm It <br />Is You!
                </h1>
                <p className="mt-5 max-w-[320px] text-[18px] leading-relaxed text-[#608eb9]">
                  We've sent a 6-digit secure code via Firebase to your phone.
                </p>

                <div className="mt-10 flex gap-2 sm:gap-3">
                  {Array.from({ length: 6 }).map((_, index) => (
                    <input
                      key={index}
                      id={`sms-${index}`}
                      inputMode="numeric"
                      maxLength={1}
                      value={code[index] || ''}
                      onChange={(e) => handleOtpInput(index, e, code, setCode, 'sms')}
                      onKeyDown={(e) => handleOtpKeyDown(index, e, 'sms')}
                      className="h-14 w-full flex-1 rounded-[12px] border-2 border-[#dceeff] bg-[#edf4ff] text-center text-[24px] font-bold text-[#2e95ff] shadow-inner transition-all focus:border-[#2e95ff] focus:bg-white focus:outline-none focus:ring-4 focus:ring-[#2e95ff]/10"
                    />
                  ))}
                </div>

                <div className="mt-4 min-h-[48px]">
                  {message ? (
                    <p className="text-[14px] font-medium text-[#e05c5c] bg-[#e05c5c]/10 py-2 px-3 rounded-lg border border-[#e05c5c]/20">
                      {message}
                    </p>
                  ) : (
                    <p className="text-[14px] font-medium text-[#5d87ae]">
                      {normalizedPhone ? `Code sent to ${normalizedPhone}` : 'Enter the phone number you used when registering.'}
                    </p>
                  )}
                </div>

                <div className="mt-10 flex flex-col gap-4">
                  <button 
                    onClick={verifyPhone} 
                    disabled={loading || code.length !== 6 || !phone || !username} 
                    className="flex h-14 w-full items-center justify-center rounded-[16px] bg-[#2e95ff] text-[16px] font-bold text-white shadow-[0_6px_0_#1a76d2] transition-all hover:bg-[#1f87f5] hover:translate-y-[2px] hover:shadow-[0_4px_0_#1a76d2] active:translate-y-[6px] active:shadow-none disabled:opacity-50 disabled:pointer-events-none"
                  >
                    {loading ? 'Verifying...' : 'Verify Phone'}
                  </button>
                  <button 
                    type="button" 
                    onClick={sendSmsCode} 
                    disabled={loading || !phone || !username} 
                    className="flex h-14 w-full items-center justify-center rounded-[16px] bg-white border-2 border-[#dceeff] text-[15px] font-bold text-[#2e95ff] shadow-[0_4px_0_#dceeff] transition-all hover:bg-[#f8fbff] hover:translate-y-[2px] hover:shadow-[0_2px_0_#dceeff] active:translate-y-[4px] active:shadow-none disabled:opacity-50 disabled:pointer-events-none"
                  >
                    Resend Code
                  </button>
                </div>
              </div>
            )}

            {phase === 'setup' && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <h1 className="text-[36px] font-extrabold tracking-tight leading-[1.1] text-[#2e95ff]">
                  Secure <br />Your Account
                </h1>
                <p className="mt-4 max-w-[340px] text-[16px] leading-relaxed text-[#608eb9]">
                  Scan this QR with your authenticator app, then confirm your setup.
                </p>

                <div className="mt-6 flex flex-col sm:flex-row items-center sm:items-start gap-5 rounded-[24px] bg-[#edf4ff] border border-[#dceeff] p-5">
                  <div className="shrink-0 rounded-[20px] bg-white p-3 shadow-sm border border-[#dceeff]">
                    {qrDataUrl ? (
                      <img src={qrDataUrl} alt="TOTP QR code" className="h-[140px] w-[140px]" />
                    ) : (
                      <div className="flex h-[140px] w-[140px] items-center justify-center text-[16px] font-semibold text-[#2e95ff]/50">Loading QR...</div>
                    )}
                  </div>
                  <div className="flex flex-col justify-center space-y-3 w-full">
                    <div>
                      <div className="text-[13px] font-semibold uppercase tracking-wider text-[#5d87ae]">Manual Key</div>
                      <div className="mt-1 w-full break-all rounded-[12px] bg-white border border-[#dceeff] px-3 py-2 text-[14px] font-mono font-bold text-[#2e95ff] shadow-sm">
                        {secret || 'Generating...'}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-5 rounded-[24px] bg-[#dceeff]/50 border border-[#dceeff] p-5">
                  <div className="flex justify-between items-center mb-3">
                    <div className="text-[13px] font-semibold uppercase tracking-wider text-[#5d87ae]">Recovery Codes</div>
                    <div className="text-[11px] font-bold text-[#e05c5c] bg-[#e05c5c]/10 px-2 py-1 rounded-md">Save these now!</div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {backupCodes.map((entry) => (
                      <div key={entry} className="rounded-[10px] bg-white border border-[#dceeff] px-3 py-2 text-[13px] font-mono font-bold text-[#2e95ff] text-center shadow-sm">
                        {entry}
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 flex gap-2">
                    <button type="button" onClick={downloadBackupCodes} className="h-10 flex-1 rounded-[10px] bg-white text-[13px] font-bold text-[#2e95ff] shadow-[0_3px_0_#dceeff] transition-all active:translate-y-[3px] active:shadow-none border border-[#dceeff]">
                      PDF
                    </button>
                    <button type="button" onClick={emailBackupCodes} className="h-10 flex-1 rounded-[10px] bg-[#2e95ff] text-[13px] font-bold text-white shadow-[0_3px_0_#1a76d2] transition-all active:translate-y-[3px] active:shadow-none">
                      Email Me
                    </button>
                  </div>
                </div>

                <div className="mt-6 flex gap-2 sm:gap-3">
                  {Array.from({ length: 6 }).map((_, index) => (
                    <input
                      key={index}
                      id={`totp-${index}`}
                      inputMode="numeric"
                      maxLength={1}
                      value={totpCode[index] || ''}
                      onChange={(e) => handleOtpInput(index, e, totpCode, setTotpCode, 'totp')}
                      onKeyDown={(e) => handleOtpKeyDown(index, e, 'totp')}
                      placeholder="•"
                      className="h-14 w-full flex-1 rounded-[12px] border-2 border-[#dceeff] bg-[#edf4ff] text-center text-[24px] font-bold text-[#2e95ff] shadow-inner transition-all focus:border-[#2e95ff] focus:bg-white focus:outline-none focus:ring-4 focus:ring-[#2e95ff]/10 placeholder:text-[#608eb9]/40"
                    />
                  ))}
                </div>

                <div className="mt-2 min-h-[32px]">
                   {message && <p className="text-[14px] font-medium text-[#e05c5c] bg-[#e05c5c]/10 py-1.5 px-3 rounded-lg border border-[#e05c5c]/20 inline-block">{message}</p>}
                </div>

                <button 
                  onClick={confirmTotp} 
                  disabled={loading || totpCode.length !== 6 || !username} 
                  className="mt-4 flex h-14 w-full items-center justify-center rounded-[16px] bg-[#2e95ff] text-[16px] font-bold text-white shadow-[0_6px_0_#1a76d2] transition-all hover:bg-[#1f87f5] hover:translate-y-[2px] hover:shadow-[0_4px_0_#1a76d2] active:translate-y-[6px] active:shadow-none disabled:opacity-50 disabled:pointer-events-none"
                >
                  {loading ? 'Confirming...' : 'Complete Setup'}
                </button>
              </div>
            )}

            {phase === 'done' && (
              <div className="animate-in zoom-in-95 fade-in duration-500 text-center py-10">
                <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-[#edf4ff] border-4 border-[#2e95ff]/20">
                  <svg className="w-12 h-12 text-[#2e95ff]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h1 className="text-[36px] font-extrabold tracking-tight text-[#2e95ff]">All Set!</h1>
                <p className="mt-4 mx-auto max-w-[280px] text-[16px] leading-relaxed text-[#608eb9]">
                  Your TOTP setup is fully active. You can now log in securely.
                </p>
                <button 
                  onClick={() => router.push('/login')} 
                  className="mt-10 mx-auto flex h-14 w-full max-w-[290px] items-center justify-center rounded-[16px] bg-[#2e95ff] text-[16px] font-bold text-white shadow-[0_6px_0_#1a76d2] transition-all hover:bg-[#1f87f5] hover:translate-y-[2px] hover:shadow-[0_4px_0_#1a76d2] active:translate-y-[6px] active:shadow-none"
                >
                  Go to Login
                </button>
              </div>
            )}

            <div className="mt-8 text-center">
              <Link href="/register" className="inline-block text-[14px] font-semibold text-[#5d87ae] underline decoration-[#5d87ae]/40 underline-offset-4 transition hover:text-[#2e95ff] hover:decoration-[#2e95ff]">
                Back to register
              </Link>
            </div>
          </div>
        </div>

        {/* Right Illustration Panel */}
        <div className="relative hidden w-[45%] items-center justify-center bg-[linear-gradient(180deg,#edf5ff_0%,#cce5ff_52%,#8dc6ff_100%)] lg:flex overflow-hidden">
          {/* Abstract glowing shapes */}
          <div className="absolute inset-0 m-auto h-[450px] w-[350px] rounded-full bg-[radial-gradient(circle,_rgba(82,166,255,0.8)_0%,rgba(144,200,255,0.6)_40%,rgba(181,223,255,0.1)_70%,transparent_100%)] blur-3xl animate-pulse duration-3000" />
          
          {/* Floating graphic */}
          <div className="relative flex h-[280px] w-[280px] animate-[bounce_6s_ease-in-out_infinite] items-center justify-center rounded-[40px] rotate-3 bg-white/40 backdrop-blur-md shadow-[0_20px_60px_rgba(46,149,255,0.25)] border border-white/60">
            <div className="flex h-[200px] w-[200px] items-center justify-center rounded-[32px] -rotate-6 bg-gradient-to-tr from-[#2e95ff] to-[#7cbaff] shadow-inner">
               <svg className="w-24 h-24 text-white opacity-90" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                 <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
               </svg>
            </div>
          </div>

          {/* User Greeting Backdrop overlay */}
          <div className="absolute bottom-12 w-full text-center">
            <div className="inline-block rounded-2xl bg-white/20 backdrop-blur-md border border-white/30 px-8 py-4 shadow-[0_8px_32px_rgba(46,149,255,0.15)]">
               <div className="text-[32px] font-extrabold tracking-tight text-white drop-shadow-md">
                 Hello! Naitik 👋
               </div>
            </div>
          </div>
        </div>
      </div>
      <div ref={recaptchaContainerRef} className="sr-only" aria-hidden />
    </main>
  )
}