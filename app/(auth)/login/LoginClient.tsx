"use client"

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import type { FormEvent } from 'react'

export default function LoginClient() {
  const router = useRouter()
  const [username, setUsername] = useState('')
  const [pin, setPin] = useState(['', '', '', '', '', ''])
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [focused, setFocused] = useState<number | null>(null)

  const handlePinChange = (index: number, value: string) => {
    const digit = value.replace(/\D/g, '').slice(-1)
    const newPin = [...pin]
    newPin[index] = digit
    setPin(newPin)
    if (digit && index < 5) {
      const next = document.getElementById(`pin-${index + 1}`)
      next?.focus()
    }
  }

  const handlePinKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !pin[index] && index > 0) {
      const prev = document.getElementById(`pin-${index - 1}`)
      prev?.focus()
    }
  }

  const login = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setLoading(true)
    setMessage('')
    const token = pin.join('')
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, token }),
      })
      const result = await response.json()
      if (!response.ok) { setMessage(result?.error || 'Login failed'); return }
      router.push('/desktop')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  const isDisabled = loading || !username || pin.some(d => d === '')

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=DM+Sans:wght@300;400;500;600&display=swap');

        /* ── Design tokens: light only ───────────────────────────────────── */
        :root {
          --bg:               #eef2fa;
          --card-bg:          rgba(255,255,255,0.75);
          --card-border:      rgba(0,0,0,0.06);
          --card-shadow:      0 0 0 1px rgba(255,255,255,0.8) inset, 0 20px 60px rgba(100,130,200,0.18), 0 0 80px rgba(79,110,247,0.06);
          --logo-pane-bg:     rgba(79,110,247,0.04);
          --logo-pane-border: rgba(0,0,0,0.06);
          --logo-glow:        radial-gradient(ellipse at 50% 40%, rgba(79,110,247,0.08) 0%, transparent 70%);
          --logo-shadow:      drop-shadow(0 8px 24px rgba(79,110,247,0.2));
          --logo-label:       rgba(0,0,0,0.3);
          --avatar-bg:        linear-gradient(135deg, #dce8ff 0%, #e5d9ff 100%);
          --avatar-border:    rgba(79,110,247,0.2);
          --avatar-halo:      0 0 0 6px rgba(79,110,247,0.07), 0 8px 24px rgba(79,110,247,0.12);
          --avatar-icon:      rgba(79,110,247,0.7);
          --heading:          #1a2035;
          --subheading:       rgba(26,32,53,0.45);
          --label:            rgba(26,32,53,0.4);
          --input-bg:         rgba(255,255,255,0.7);
          --input-border:     rgba(0,0,0,0.1);
          --input-text:       #1a2035;
          --input-placeholder:rgba(26,32,53,0.3);
          --input-focus-border:rgba(79,110,247,0.55);
          --input-focus-bg:   #fff;
          --input-focus-ring: rgba(79,110,247,0.12);
          --pin-focus-border: rgba(79,110,247,0.6);
          --pin-focus-bg:     rgba(79,110,247,0.06);
          --pin-focus-ring:   rgba(79,110,247,0.14);
          --pin-filled-border:rgba(79,110,247,0.35);
          --pin-filled-bg:    rgba(79,110,247,0.05);
          --divider:          rgba(0,0,0,0.08);
          --divider-text:     rgba(0,0,0,0.3);
          --ghost-border:     rgba(0,0,0,0.12);
          --ghost-text:       rgba(26,32,53,0.55);
          --ghost-hover-border:rgba(79,110,247,0.4);
          --ghost-hover-bg:   rgba(79,110,247,0.05);
          --ghost-hover-text: #1a2035;
          --error-text:       #dc2626;
          --error-bg:         rgba(220,38,38,0.06);
          --error-border:     rgba(220,38,38,0.15);
          --grain-opacity:    0.025;
          --blob-opacity:     0.22;
          --caret:            #4a63e0;
        }

        .login-root {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--bg);
          padding: 24px;
          font-family: 'DM Sans', sans-serif;
          position: relative;
          overflow: hidden;
          transition: background 0.3s;
        }

        /* Aurora blobs */
        .aurora {
          position: absolute;
          inset: 0;
          pointer-events: none;
          overflow: hidden;
        }
        .aurora-blob {
          position: absolute;
          border-radius: 50%;
          filter: blur(90px);
          opacity: var(--blob-opacity);
          animation: drift 14s ease-in-out infinite alternate;
        }
        .aurora-blob-1 {
          width: 520px; height: 520px;
          background: radial-gradient(circle, #4f6ef7, transparent 70%);
          top: -120px; left: -100px;
          animation-delay: 0s;
        }
        .aurora-blob-2 {
          width: 420px; height: 420px;
          background: radial-gradient(circle, #7c3aed, transparent 70%);
          bottom: -80px; right: -80px;
          animation-delay: -5s;
        }
        .aurora-blob-3 {
          width: 300px; height: 300px;
          background: radial-gradient(circle, #0ea5e9, transparent 70%);
          top: 50%; left: 55%;
          animation-delay: -9s;
        }
        @keyframes drift {
          0%   { transform: translate(0, 0) scale(1); }
          100% { transform: translate(40px, 30px) scale(1.08); }
        }

        /* Noise grain overlay */
        .grain {
          position: absolute;
          inset: 0;
          pointer-events: none;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E");
          opacity: var(--grain-opacity);
        }

        /* Two-pane wrapper */
        .panel-wrapper {
          position: relative;
          z-index: 1;
          display: flex;
          width: 100%;
          max-width: 820px;
          border-radius: 28px;
          overflow: hidden;
          border: 1px solid var(--card-border);
          box-shadow: var(--card-shadow);
          animation: cardIn 0.6s cubic-bezier(0.22,1,0.36,1) both;
        }

        /* Logo pane (right) */
        .logo-pane {
          flex: 1;
          min-width: 0;
          background: var(--logo-pane-bg);
          border-left: 1px solid var(--logo-pane-border);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 48px 36px;
          position: relative;
          overflow: hidden;
        }
        .logo-pane::before {
          content: '';
          position: absolute;
          inset: 0;
          background: var(--logo-glow);
          pointer-events: none;
        }
        .logo-pane img {
          width: 100%;
          max-width: 260px;
          height: auto;
          object-fit: contain;
          position: relative;
          z-index: 1;
          filter: var(--logo-shadow);
          animation: cardIn 0.7s 0.2s cubic-bezier(0.22,1,0.36,1) both;
        }
        .logo-pane-label {
          margin-top: 28px;
          font-size: 12px;
          font-weight: 500;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: var(--logo-label);
          position: relative;
          z-index: 1;
          animation: cardIn 0.7s 0.3s cubic-bezier(0.22,1,0.36,1) both;
        }

        /* Card */
        .card {
          position: relative;
          z-index: 1;
          width: 380px;
          flex-shrink: 0;
          border-radius: 0;
          background: var(--card-bg);
          border: none;
          backdrop-filter: blur(24px) saturate(160%);
          padding: 44px 40px 40px;
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        /* Responsive: stack on small screens */
        @media (max-width: 640px) {
          .panel-wrapper { flex-direction: column; max-width: 400px; border-radius: 28px; }
          .card { width: 100%; border-radius: 28px 28px 0 0; }
          .logo-pane { border-left: none; border-top: 1px solid var(--logo-pane-border); padding: 32px 36px; border-radius: 0 0 28px 28px; }
          .logo-pane img { max-width: 160px; }
        }
        @keyframes cardIn {
          from { opacity: 0; transform: translateY(24px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }

        /* Avatar */
        .avatar {
          width: 88px;
          height: 88px;
          border-radius: 50%;
          background: var(--avatar-bg);
          border: 2px solid var(--avatar-border);
          margin-bottom: 28px;
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: var(--avatar-halo);
          animation: cardIn 0.6s 0.1s cubic-bezier(0.22,1,0.36,1) both;
        }
        .avatar svg { width: 40px; height: 40px; opacity: 0.75; }

        /* Heading */
        .heading {
          font-family: 'DM Serif Display', serif;
          font-size: 26px;
          color: var(--heading);
          margin: 0 0 6px;
          letter-spacing: -0.3px;
          animation: cardIn 0.6s 0.15s cubic-bezier(0.22,1,0.36,1) both;
        }
        .subheading {
          font-size: 13px;
          color: var(--subheading);
          margin: 0 0 32px;
          font-weight: 400;
          animation: cardIn 0.6s 0.2s cubic-bezier(0.22,1,0.36,1) both;
        }

        /* Form */
        .form {
          width: 100%;
          display: flex;
          flex-direction: column;
          gap: 14px;
        }

        /* Input label */
        .field {
          display: flex;
          flex-direction: column;
          gap: 6px;
          animation: cardIn 0.6s 0.25s cubic-bezier(0.22,1,0.36,1) both;
        }
        .field-label {
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: var(--label);
          padding-left: 4px;
        }
        .text-input {
          height: 48px;
          width: 100%;
          border-radius: 14px;
          background: var(--input-bg);
          border: 1px solid var(--input-border);
          outline: none;
          padding: 0 18px;
          font-size: 14px;
          font-family: 'DM Sans', sans-serif;
          color: var(--input-text);
          box-sizing: border-box;
          transition: border-color 0.2s, box-shadow 0.2s, background 0.2s;
          caret-color: var(--caret);
        }
        .text-input::placeholder { color: var(--input-placeholder); }
        .text-input:focus {
          border-color: var(--input-focus-border);
          background: var(--input-focus-bg);
          box-shadow: 0 0 0 3px var(--input-focus-ring);
        }

        /* PIN row */
        .pin-field {
          display: flex;
          flex-direction: column;
          gap: 8px;
          animation: cardIn 0.6s 0.3s cubic-bezier(0.22,1,0.36,1) both;
        }
        .pin-row {
          display: flex;
          gap: 8px;
          justify-content: center;
        }
        .pin-box {
          width: 48px;
          height: 54px;
          border-radius: 14px;
          background: var(--input-bg);
          border: 1px solid var(--input-border);
          outline: none;
          text-align: center;
          font-size: 20px;
          font-family: 'DM Sans', sans-serif;
          font-weight: 600;
          color: var(--input-text);
          flex-shrink: 0;
          transition: border-color 0.2s, box-shadow 0.2s, background 0.2s, transform 0.15s;
          caret-color: transparent;
          -webkit-text-security: disc;
        }
        .pin-box:focus {
          border-color: var(--pin-focus-border);
          background: var(--pin-focus-bg);
          box-shadow: 0 0 0 3px var(--pin-focus-ring), 0 4px 12px rgba(0,0,0,0.15);
          transform: translateY(-2px);
        }
        .pin-box.filled {
          border-color: var(--pin-filled-border);
          background: var(--pin-filled-bg);
        }

        /* Error */
        .error-msg {
          font-size: 12px;
          color: var(--error-text);
          text-align: center;
          margin: 0;
          background: var(--error-bg);
          border: 1px solid var(--error-border);
          border-radius: 10px;
          padding: 8px 12px;
          animation: cardIn 0.3s cubic-bezier(0.22,1,0.36,1) both;
        }

        /* Divider */
        .divider {
          display: flex;
          align-items: center;
          gap: 12px;
          animation: cardIn 0.6s 0.35s cubic-bezier(0.22,1,0.36,1) both;
        }
        .divider-line {
          flex: 1;
          height: 1px;
          background: var(--divider);
        }
        .divider-text {
          font-size: 11px;
          color: var(--divider-text);
          font-weight: 500;
        }

        /* Primary button */
        .btn-primary {
          height: 50px;
          width: 100%;
          border-radius: 14px;
          background: linear-gradient(135deg, #5b7cf6 0%, #4a63e0 100%);
          border: none;
          color: #fff;
          font-size: 14px;
          font-family: 'DM Sans', sans-serif;
          font-weight: 600;
          cursor: pointer;
          box-shadow: 0 1px 0 rgba(255,255,255,0.15) inset, 0 6px 20px rgba(74,99,224,0.4);
          transition: transform 0.12s, box-shadow 0.12s, opacity 0.2s;
          position: relative;
          overflow: hidden;
          animation: cardIn 0.6s 0.4s cubic-bezier(0.22,1,0.36,1) both;
          letter-spacing: 0.01em;
        }
        .btn-primary:not(:disabled):hover {
          transform: translateY(-1px);
          box-shadow: 0 1px 0 rgba(255,255,255,0.15) inset, 0 10px 28px rgba(74,99,224,0.5);
        }
        .btn-primary:not(:disabled):active {
          transform: translateY(1px);
          box-shadow: 0 1px 0 rgba(255,255,255,0.1) inset, 0 2px 8px rgba(74,99,224,0.3);
        }
        .btn-primary:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }
        .btn-primary .shimmer {
          position: absolute;
          top: 0; left: -100%;
          width: 60%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.12), transparent);
          animation: shimmer 2.5s ease-in-out infinite;
        }
        @keyframes shimmer {
          0%   { left: -100%; }
          60%, 100% { left: 200%; }
        }

        /* Ghost button */
        .btn-ghost {
          height: 50px;
          width: 100%;
          border-radius: 14px;
          background: transparent;
          border: 1px solid var(--ghost-border);
          color: var(--ghost-text);
          font-size: 14px;
          font-family: 'DM Sans', sans-serif;
          font-weight: 500;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          text-decoration: none;
          transition: border-color 0.2s, background 0.2s, color 0.2s, transform 0.12s;
          animation: cardIn 0.6s 0.45s cubic-bezier(0.22,1,0.36,1) both;
          letter-spacing: 0.01em;
        }
        .btn-ghost:hover {
          border-color: var(--ghost-hover-border);
          background: var(--ghost-hover-bg);
          color: var(--ghost-hover-text);
          transform: translateY(-1px);
        }
        .btn-ghost:active { transform: translateY(1px); }

        /* Spinner */
        @keyframes spin { to { transform: rotate(360deg); } }
        .spinner {
          display: inline-block;
          width: 16px; height: 16px;
          border: 2px solid rgba(255,255,255,0.3);
          border-top-color: #fff;
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
          vertical-align: middle;
          margin-right: 8px;
        }
      `}</style>

      <main className="login-root">
        <div className="aurora">
          <div className="aurora-blob aurora-blob-1" />
          <div className="aurora-blob aurora-blob-2" />
          <div className="aurora-blob aurora-blob-3" />
        </div>
        <div className="grain" />

        <div className="panel-wrapper">
        <div className="card">
          {/* Avatar */}
          <div className="avatar">
            <svg viewBox="0 0 24 24" fill="none" stroke="var(--avatar-icon)" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M17.982 18.725A7.488 7.488 0 0 0 12 15.75a7.488 7.488 0 0 0-5.982 2.975m11.963 0a9 9 0 1 0-11.963 0m11.963 0A8.966 8.966 0 0 1 12 21a8.966 8.966 0 0 1-5.982-2.275M15 9.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
            </svg>
          </div>

          <h1 className="heading">Welcome back</h1>
          <p className="subheading">Sign in to your workspace</p>

          <form className="form" onSubmit={login}>
            {/* Username */}
            <div className="field">
              <label className="field-label" htmlFor="username">Username</label>
              <input
                id="username"
                className="text-input"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your username"
                autoComplete="username"
              />
            </div>

            {/* PIN */}
            <div className="pin-field">
              <label className="field-label">6-digit PIN</label>
              <div className="pin-row">
                {pin.map((digit, i) => (
                  <input
                    key={i}
                    id={`pin-${i}`}
                    className={`pin-box ${digit ? 'filled' : ''}`}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handlePinChange(i, e.target.value)}
                    onKeyDown={(e) => handlePinKeyDown(i, e)}
                    onFocus={() => setFocused(i)}
                    onBlur={() => setFocused(null)}
                    autoComplete="one-time-code"
                  />
                ))}
              </div>
            </div>

            {/* Error */}
            {message && <p className="error-msg">{message}</p>}

            {/* Login button */}
            <button type="submit" className="btn-primary" disabled={isDisabled} style={{ marginTop: '6px' }}>
              {!isDisabled && <span className="shimmer" />}
              {loading ? (
                <><span className="spinner" />Signing in…</>
              ) : 'Sign in'}
            </button>

            <div className="divider">
              <div className="divider-line" />
              <span className="divider-text">or</span>
              <div className="divider-line" />
            </div>

            {/* Register */}
            <Link href="/register" className="btn-ghost">
              Create an account
            </Link>
          </form>
        </div>

        {/* Logo pane */}
        <div className="logo-pane">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img style={{ borderRadius: "12px" }} src="/logo1.png" alt="Logo" />
          <span className="logo-pane-label">Your workspace</span>
        </div>

        </div>
      </main>
    </>
  )
}