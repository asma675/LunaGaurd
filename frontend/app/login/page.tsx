'use client'

import { FormEvent, useEffect, useRef, useState } from 'react'
import { ArrowLeft, LockKeyhole, Orbit, ShieldCheck, Sparkles } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { getAuthConfig, loginUser, loginWithGoogleCredential, registerUser } from '@/lib/api'
import { useAuth } from '@/components/auth/AuthProvider'
import type { AuthConfig } from '@/lib/types'

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (options: { client_id: string; callback: (response: { credential: string }) => void }) => void
          renderButton: (element: HTMLElement, options: Record<string, unknown>) => void
        }
      }
    }
  }
}

export default function LoginPage() {
  const router = useRouter()
  const { setSession, user } = useAuth()
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [config, setConfig] = useState<AuthConfig>({ google_enabled: false, google_client_id: '' })
  const googleRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (user) router.replace('/')
  }, [router, user])

  useEffect(() => {
    let active = true
    void getAuthConfig()
      .then(nextConfig => {
        if (active) setConfig(nextConfig)
      })
      .catch(() => {
        if (active) setConfig({ google_enabled: false, google_client_id: '' })
      })
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    if (!config.google_enabled || !config.google_client_id || !googleRef.current) return undefined

    let active = true
    let script: HTMLScriptElement | null = null
    const render = () => {
      if (!active || !window.google || !googleRef.current) return
      googleRef.current.innerHTML = ''
      window.google.accounts.id.initialize({
        client_id: config.google_client_id,
        callback: async response => {
          if (!active) return
          setLoading(true)
          setError(null)
          try {
            const auth = await loginWithGoogleCredential(response.credential)
            if (!active) return
            setSession(auth.user, auth.token)
            router.push('/')
          } catch (err) {
            if (active) setError(err instanceof Error ? err.message : 'Google sign-in failed')
          } finally {
            if (active) setLoading(false)
          }
        },
      })
      window.google.accounts.id.renderButton(googleRef.current, {
        theme: 'filled_black',
        size: 'large',
        shape: 'pill',
        text: 'continue_with',
        width: 340,
      })
    }

    const existing = document.querySelector<HTMLScriptElement>('script[data-lunaguard-google]')
    if (existing) {
      if (window.google) render()
      else existing.addEventListener('load', render)
      return () => {
        active = false
        existing.removeEventListener('load', render)
      }
    }

    script = document.createElement('script')
    script.src = 'https://accounts.google.com/gsi/client'
    script.async = true
    script.defer = true
    script.dataset.lunaguardGoogle = 'true'
    script.onload = render
    document.head.appendChild(script)

    return () => {
      active = false
      if (script) script.onload = null
    }
  }, [config.google_client_id, config.google_enabled, router, setSession])

  async function submit(event: FormEvent) {
    event.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const auth = mode === 'login'
        ? await loginUser(email, password)
        : await registerUser(email, name, password)
      setSession(auth.user, auth.token)
      router.push('/')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#03070e] p-4">
      <div className="space-motion" aria-hidden="true" />
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-[520px] w-[520px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-ibm-blue/10 blur-3xl" />
      <div className="relative grid w-full max-w-5xl overflow-hidden rounded-[32px] border border-white/10 bg-[#07111f]/92 shadow-2xl backdrop-blur-2xl lg:grid-cols-[.9fr_1.1fr]">
        <section className="hero-grid relative hidden min-h-[640px] border-r border-white/10 p-9 lg:flex lg:flex-col">
          <Link href="/" className="flex w-fit items-center gap-2 text-sm text-slate-400 hover:text-white"><ArrowLeft size={16} /> Back to mission console</Link>
          <div className="mt-auto">
            <div className="flex h-16 w-16 items-center justify-center rounded-3xl border border-cyan-electric/20 bg-gradient-to-br from-ibm-blue/25 to-violet-accent/15"><img src="/lunaguard-mark.svg" alt="LunaGuard" className="h-14 w-14" /></div>
            <p className="mt-6 page-kicker">Secure mission access</p>
            <h1 className="mt-3 text-4xl font-black tracking-[-0.04em] text-white">LunaGuard Operator Identity</h1>
            <p className="mt-4 max-w-md text-sm leading-7 text-slate-400">Sign in to personalize your mission console. Local accounts are stored in the backend’s persistent SQLite volume; Google sign-in is available when a Google OAuth client ID is configured.</p>
            <div className="mt-6 space-y-3 text-sm text-slate-400">
              <p className="flex items-center gap-2"><ShieldCheck size={15} className="text-emerald-300" /> PBKDF2 password hashing + random server sessions</p>
              <p className="flex items-center gap-2"><LockKeyhole size={15} className="text-cyan-300" /> No secret credentials embedded in the frontend</p>
              <p className="flex items-center gap-2"><Sparkles size={15} className="text-blue-300" /> Optional Google Identity Services integration</p>
            </div>
          </div>
        </section>

        <section className="flex min-h-[640px] flex-col justify-center p-6 md:p-10">
          <div className="mx-auto w-full max-w-md">
            <div className="mb-7 flex items-center gap-3 lg:hidden">
              <img src="/lunaguard-mark.svg" alt="LunaGuard" className="h-12 w-12" />
              <div><p className="font-black tracking-[0.18em] text-white">LUNAGUARD</p><p className="text-[10px] uppercase tracking-[0.15em] text-slate-500">Mission operator access</p></div>
            </div>
            <div className="flex rounded-2xl border border-white/10 bg-black/20 p-1">
              {(['login', 'register'] as const).map(item => (
                <button key={item} onClick={() => { setMode(item); setError(null) }} className={`flex-1 rounded-xl px-4 py-2.5 text-sm font-semibold capitalize transition ${mode === item ? 'bg-white text-slate-950' : 'text-slate-500 hover:text-white'}`}>{item === 'login' ? 'Sign in' : 'Create account'}</button>
              ))}
            </div>

            <h2 className="mt-7 text-2xl font-bold text-white">{mode === 'login' ? 'Welcome back, operator.' : 'Create your LunaGuard account.'}</h2>
            <p className="mt-2 text-sm text-slate-500">{mode === 'login' ? 'Continue to the lunar mission intelligence console.' : 'Use a local account now, or configure Google sign-in for your deployment.'}</p>

            <form onSubmit={submit} className="mt-6 space-y-4">
              {mode === 'register' && <Field label="Display name" value={name} onChange={setName} placeholder="Mission Operator" autoComplete="name" />}
              <Field label="Email" value={email} onChange={setEmail} placeholder="operator@example.com" type="email" autoComplete="email" />
              <Field label="Password" value={password} onChange={setPassword} placeholder="Minimum 8 characters" type="password" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} />
              {error && <div className="rounded-xl border border-red-400/20 bg-red-400/[0.06] p-3 text-xs leading-5 text-red-200">{error}</div>}
              <button disabled={loading} className="w-full rounded-2xl bg-white py-3.5 text-sm font-bold text-slate-950 transition hover:bg-cyan-100 disabled:opacity-40">{loading ? 'Authenticating…' : mode === 'login' ? 'Sign in to LunaGuard' : 'Create operator account'}</button>
            </form>

            <div className="my-6 flex items-center gap-3 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-600"><span className="h-px flex-1 bg-white/10" /> or <span className="h-px flex-1 bg-white/10" /></div>
            {config.google_enabled ? (
              <div ref={googleRef} className="flex min-h-[44px] justify-center" />
            ) : (
              <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-4 text-center">
                <Orbit size={18} className="mx-auto text-slate-500" />
                <p className="mt-2 text-xs font-semibold text-slate-300">Google sign-in is ready but not configured</p>
                <p className="mt-1 text-[11px] leading-5 text-slate-600">Set <code className="text-slate-400">GOOGLE_CLIENT_ID</code> in your .env and restart Docker to enable the real Google button.</p>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}

function Field({ label, value, onChange, placeholder, type = 'text', autoComplete }: { label: string; value: string; onChange: (value: string) => void; placeholder: string; type?: string; autoComplete?: string }) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-semibold text-slate-400">{label}</span>
      <input required value={value} onChange={event => onChange(event.target.value)} placeholder={placeholder} type={type} autoComplete={autoComplete} className="w-full rounded-2xl border border-white/10 bg-black/25 px-4 py-3.5 text-sm text-white placeholder:text-slate-700 focus:border-cyan-electric/35" />
    </label>
  )
}
