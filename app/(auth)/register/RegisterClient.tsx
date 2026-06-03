"use client"

import { useRouter } from 'next/navigation'
import { useMemo, useRef, useState } from 'react'
import type { FormEvent, ChangeEvent } from 'react'
import { deriveUsername } from '../../../lib/auth/username'

const appChoices = [
  { id: 'files',  label: 'Cloud Drive', icon: '☁', desc: 'Store & sync files'  },
  { id: 'notes',  label: 'Notes',       icon: '✦', desc: 'Capture ideas'       },
  { id: 'python', label: 'Python IDE',  icon: '⌥', desc: 'Write Python code'   },
  { id: 'c',      label: 'C IDE',       icon: '⊕', desc: 'Write C programs'    },
  { id: 'paint',  label: 'Paint',       icon: '◈', desc: 'Draw & design'       },
  { id: 'word',   label: 'Word',        icon: '❋', desc: 'Edit documents'      },
]

export default function RegisterClient() {
  const router = useRouter()
  const [name,    setName]    = useState('')
  const [email,   setEmail]   = useState('')
  const [phone,   setPhone]   = useState('')
  const [selectedApps, setSelectedApps] = useState<string[]>(['files', 'notes'])
  const [avatarDataUrl, setAvatarDataUrl] = useState('')
  const [avatarName,    setAvatarName]    = useState('')
  const [message,  setMessage]  = useState('')
  const [loading,  setLoading]  = useState(false)
  const [focused,  setFocused]  = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement | null>(null)

  const username = useMemo(() => deriveUsername(name, email), [name, email])
  const canSubmit = useMemo(
    () => Boolean(name && email && phone && selectedApps.length > 0 && username),
    [name, email, phone, selectedApps, username],
  )

  const toggleApp = (id: string) =>
    setSelectedApps(cur => cur.includes(id) ? cur.filter(v => v !== id) : [...cur, id])

  const handleFile = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) { setMessage('Please choose an image file.'); return }
    if (file.size > 5 * 1024 * 1024)    { setMessage('Image must be 5 MB or smaller.'); return }
    const reader = new FileReader()
    reader.onload  = () => { setAvatarDataUrl(typeof reader.result === 'string' ? reader.result : ''); setAvatarName(file.name) }
    reader.onerror = () => setMessage('Unable to read that image.')
    reader.readAsDataURL(file)
  }

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')
    try {
      const res  = await fetch('/api/auth/register/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, username, email, phone, selectedApps, avatarDataUrl: avatarDataUrl || null }),
      })
      const data = await res.json()
      if (!res.ok) { setMessage(data?.error || 'Failed to start registration'); return }
      router.push(`/verify?username=${encodeURIComponent(username)}&phone=${encodeURIComponent(phone)}&email=${encodeURIComponent(email)}`)
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Failed to start registration')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        /* ── Page ── */
        .reg-root {
          min-height: 100dvh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #eef5ff 0%, #d8ebff 55%, #7cbcff 100%);
          padding: 24px;
          font-family: 'DM Sans', sans-serif;
        }

        /* ── Card ── */
        .reg-card {
          display: flex;
          width: 100%;
          max-width: 1008px;
          min-height: 600px;
          border-radius: 32px;
          overflow: hidden;
          background: #fff;
          box-shadow: 0 20px 60px rgba(70,140,224,.28);
        }

        /* ────────────── LEFT PANEL ────────────── */
        .reg-left {
          flex: 1;
          padding: 52px 44px;
          display: flex;
          flex-direction: column;
          gap: 22px;
        }

        .reg-eyebrow {
          font-size: 11px;
          font-weight: 600;
          letter-spacing: .18em;
          text-transform: uppercase;
          color: #2e95ff;
          opacity: .55;
        }

        .reg-heading {
          font-family: 'DM Serif Display', serif;
          font-size: clamp(30px, 4vw, 42px);
          line-height: 1.06;
          color: #1a5fa8;
          font-weight: 400;
        }
        .reg-heading em {
          font-style: italic;
          color: #2e95ff;
        }

        .reg-sub {
          font-size: 15px;
          color: #5f8eb9;
          line-height: 1.6;
          max-width: 310px;
        }

        /* ── Fields ── */
        .reg-fields {
          display: flex;
          flex-direction: column;
          gap: 11px;
        }

        .field-wrap {
          position: relative;
          border-radius: 50px;
          background: #dceeff;
          border: 2px solid transparent;
          transition: border-color .2s, box-shadow .2s, background .2s;
        }
        .field-wrap.focused {
          border-color: #2e95ff;
          background: #eef6ff;
          box-shadow: 0 0 0 4px rgba(46,149,255,.12);
        }
        .field-wrap input {
          width: 100%;
          height: 52px;
          background: transparent;
          border: none;
          outline: none;
          padding: 0 22px;
          font-family: 'DM Sans', sans-serif;
          font-size: 15.5px;
          color: #2e95ff;
        }
        .field-wrap input::placeholder { color: rgba(46,149,255,.55); }

        .phone-row { display: flex; gap: 10px; }
        .phone-prefix {
          display: flex;
          align-items: center;
          padding: 0 20px;
          height: 52px;
          border-radius: 50px;
          background: #dceeff;
          font-size: 15.5px;
          color: #2e95ff;
          font-weight: 500;
          white-space: nowrap;
          flex-shrink: 0;
          border: 2px solid transparent;
        }
        .phone-row .field-wrap { flex: 1; }

        /* Username chip */
        .username-chip {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          font-size: 12.5px;
          font-weight: 500;
          color: #2e95ff;
          background: #dceeff;
          border-radius: 20px;
          padding: 5px 14px;
          width: fit-content;
          opacity: .85;
        }
        .username-dot {
          width: 5px; height: 5px;
          border-radius: 50%;
          background: #2e95ff;
          flex-shrink: 0;
        }

        /* Error */
        .reg-error {
          font-size: 13px;
          color: #c0392b;
          background: #fff0f0;
          border: 1px solid rgba(192,57,43,.18);
          border-radius: 12px;
          padding: 10px 16px;
        }

        /* Submit */
        .reg-submit {
          height: 52px;
          border-radius: 50px;
          border: none;
          cursor: pointer;
          font-family: 'DM Sans', sans-serif;
          font-size: 15.5px;
          font-weight: 600;
          color: #fff;
          background: #2e95ff;
          box-shadow: 0 6px 0 rgba(51,126,213,.36);
          transition: transform .15s, box-shadow .15s, opacity .15s;
          position: relative;
        }
        .reg-submit:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 8px 0 rgba(51,126,213,.36);
        }
        .reg-submit:active:not(:disabled) {
          transform: translateY(2px);
          box-shadow: 0 2px 0 rgba(51,126,213,.36);
        }
        .reg-submit:disabled { opacity: .5; cursor: not-allowed; }

        @keyframes spin { to { transform: rotate(360deg); } }
        .spinner {
          width: 15px; height: 15px;
          border: 2px solid rgba(255,255,255,.4);
          border-top-color: #fff;
          border-radius: 50%;
          animation: spin .65s linear infinite;
          display: inline-block;
          vertical-align: middle;
          margin-right: 8px;
          margin-top: -2px;
        }

        /* ────────────── RIGHT PANEL ────────────── */
        .reg-right {
          width: 44%;
          background: linear-gradient(180deg, #89bef4 0%, #7eb7f0 52%, #6ea8e9 100%);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 44px 36px;
          gap: 32px;
        }

        /* Avatar */
        .avatar-zone {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 14px;
          cursor: pointer;
          text-align: center;
        }

        .avatar-ring {
          width: 148px;
          height: 148px;
          border-radius: 50%;
          background: rgba(255,255,255,.25);
          display: flex;
          align-items: center;
          justify-content: center;
          border: 2.5px solid rgba(255,255,255,.5);
          transition: transform .2s, box-shadow .2s, border-color .2s;
          box-shadow: 0 8px 28px rgba(80,140,210,.25);
        }
        .avatar-zone:hover .avatar-ring {
          transform: scale(1.04);
          box-shadow: 0 14px 40px rgba(80,140,210,.35);
          border-color: rgba(255,255,255,.85);
        }

        .avatar-circle {
          width: 116px;
          height: 116px;
          border-radius: 50%;
          overflow: hidden;
          background: #eef5ff;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .avatar-icon-wrap {
          width: 52px; height: 52px;
          border-radius: 50%;
          background: linear-gradient(180deg, #7f7cff 0%, #6f70f5 100%);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 5px;
        }
        .avatar-icon-card {
          width: 22px; height: 15px;
          border-radius: 4px;
          border: 2px solid rgba(255,255,255,.9);
        }
        .avatar-icon-dot {
          width: 7px; height: 7px;
          border-radius: 50%;
          background: rgba(255,255,255,.9);
        }

        .avatar-label {
          font-size: 16px;
          font-weight: 500;
          color: #fff;
          line-height: 1.35;
          max-width: 180px;
        }
        .avatar-hint { font-size: 13px; color: rgba(255,255,255,.65); }
        .avatar-filename {
          font-size: 12px;
          color: rgba(255,255,255,.8);
          max-width: 200px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          background: rgba(255,255,255,.18);
          padding: 3px 12px;
          border-radius: 20px;
        }

        /* App selector */
        .apps-section { width: 100%; display: flex; flex-direction: column; gap: 12px; }

        .apps-label {
          font-size: 11px;
          font-weight: 600;
          letter-spacing: .16em;
          text-transform: uppercase;
          color: rgba(255,255,255,.6);
          text-align: center;
        }

        .apps-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 8px;
        }

        .app-card {
          border-radius: 14px;
          border: 1.5px solid rgba(255,255,255,.35);
          background: rgba(255,255,255,.22);
          padding: 12px 10px 10px;
          cursor: pointer;
          text-align: left;
          font-family: 'DM Sans', sans-serif;
          transition: border-color .18s, background .18s, transform .15s, box-shadow .18s;
          display: flex;
          flex-direction: column;
          gap: 4px;
          backdrop-filter: blur(8px);
        }
        .app-card:hover {
          background: rgba(255,255,255,.35);
          border-color: rgba(255,255,255,.7);
          transform: translateY(-1px);
        }
        .app-card.active {
          background: #fff;
          border-color: #fff;
          box-shadow: 0 4px 16px rgba(46,100,180,.18);
        }

        .app-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .app-icon {
          font-size: 15px;
          line-height: 1;
          color: rgba(255,255,255,.7);
          transition: color .18s;
        }
        .app-card.active .app-icon { color: #2e95ff; }

        .app-check {
          width: 14px; height: 14px;
          border-radius: 50%;
          border: 1.5px solid rgba(255,255,255,.5);
          display: flex;
          align-items: center;
          justify-content: center;
          transition: border-color .18s, background .18s;
          flex-shrink: 0;
        }
        .app-card.active .app-check {
          border-color: #2e95ff;
          background: #2e95ff;
        }
        .app-check-dot {
          width: 5px; height: 5px;
          border-radius: 50%;
          background: #fff;
          opacity: 0;
          transition: opacity .15s;
        }
        .app-card.active .app-check-dot { opacity: 1; }

        .app-name {
          font-size: 12px;
          font-weight: 600;
          color: rgba(255,255,255,.75);
          transition: color .18s;
        }
        .app-card.active .app-name { color: #2e95ff; }

        .app-desc {
          font-size: 10.5px;
          color: rgba(255,255,255,.5);
          line-height: 1.35;
          transition: color .18s;
        }
        .app-card.active .app-desc { color: #5f8eb9; }

        /* Stagger reveal */
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(14px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .reg-left > * { animation: fadeUp .45s ease both; }
        .reg-left > *:nth-child(1) { animation-delay: .04s; }
        .reg-left > *:nth-child(2) { animation-delay: .10s; }
        .reg-left > *:nth-child(3) { animation-delay: .16s; }
        .reg-left > *:nth-child(4) { animation-delay: .22s; }
        .reg-left > *:nth-child(5) { animation-delay: .28s; }

        .reg-right > * { animation: fadeUp .45s ease both; }
        .reg-right > *:nth-child(1) { animation-delay: .18s; }
        .reg-right > *:nth-child(2) { animation-delay: .26s; }

        /* ── Responsive ── */
        @media (max-width: 768px) {
          .reg-card { flex-direction: column; border-radius: 24px; }
          .reg-right { width: 100%; padding: 36px 24px; }
          .reg-left  { padding: 36px 24px; }
        }
        @media (max-width: 480px) {
          .reg-root  { padding: 16px; }
          .apps-grid { grid-template-columns: 1fr 1fr; }
        }
      `}</style>

      <div className="reg-root">
        <div className="reg-card">

          {/* ── Left: form ── */}
          <div className="reg-left">
            <div className="reg-eyebrow">Your workspace</div>

            <div>
              <h1 className="reg-heading">
                Create your<br /><em>account</em>
              </h1>
              <p className="reg-sub" style={{ marginTop: 10 }}>
                Add your details, choose your apps, and optionally upload a profile picture.
              </p>
            </div>

            <form onSubmit={submit} className="reg-fields">
              <div className={`field-wrap ${focused === 'name' ? 'focused' : ''}`}>
                <input
                  value={name}
                  onChange={e => setName(e.target.value)}
                  onFocus={() => setFocused('name')}
                  onBlur={() => setFocused(null)}
                  placeholder="Full name"
                />
              </div>

              <div className={`field-wrap ${focused === 'email' ? 'focused' : ''}`}>
                <input
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  onFocus={() => setFocused('email')}
                  onBlur={() => setFocused(null)}
                  placeholder="Email address"
                  type="email"
                />
              </div>

              <div className="phone-row">
                <div className="phone-prefix">+91</div>
                <div className={`field-wrap ${focused === 'phone' ? 'focused' : ''}`}>
                  <input
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    onFocus={() => setFocused('phone')}
                    onBlur={() => setFocused(null)}
                    placeholder="Phone number"
                    inputMode="tel"
                  />
                </div>
              </div>

              {username && (
                <div className="username-chip">
                  <div className="username-dot" />
                  @{username}
                </div>
              )}

              {message && <div className="reg-error">{message}</div>}

              <button
                type="submit"
                className="reg-submit"
                disabled={!canSubmit || loading}
              >
                {loading && <span className="spinner" />}
                {loading ? 'Creating account…' : 'Continue →'}
              </button>
            </form>
          </div>

          {/* ── Right: avatar + apps ── */}
          <div className="reg-right">
            <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFile} />

            {/* Avatar */}
            <div
              className="avatar-zone"
              onClick={() => fileRef.current?.click()}
              role="button"
              tabIndex={0}
              onKeyDown={e => e.key === 'Enter' && fileRef.current?.click()}
            >
              <div className="avatar-ring">
                <div className="avatar-circle">
                  {avatarDataUrl ? (
                    <img src={avatarDataUrl} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <div className="avatar-icon-wrap">
                      <div className="avatar-icon-card" />
                      <div className="avatar-icon-dot" />
                    </div>
                  )}
                </div>
              </div>
              <div className="avatar-label">
                {avatarDataUrl ? 'Change your photo' : 'Upload profile photo'}
              </div>
              <div className="avatar-hint">Optional · max 5 MB</div>
              {avatarName && <div className="avatar-filename">{avatarName}</div>}
            </div>

            {/* Apps */}
            <div className="apps-section">
              <div className="apps-label">Choose your apps</div>
              <div className="apps-grid">
                {appChoices.map(app => {
                  const active = selectedApps.includes(app.id)
                  return (
                    <button
                      key={app.id}
                      type="button"
                      onClick={() => toggleApp(app.id)}
                      className={`app-card ${active ? 'active' : ''}`}
                    >
                      <div className="app-row">
                        <div className="app-icon">{app.icon}</div>
                        <div className="app-check">
                          <div className="app-check-dot" />
                        </div>
                      </div>
                      <div className="app-name">{app.label}</div>
                      <div className="app-desc">{app.desc}</div>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

        </div>
      </div>
    </>
  )
}