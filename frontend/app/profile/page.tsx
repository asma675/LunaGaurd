'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Bot, CircleUserRound, LogOut, ShieldCheck, UserRoundCog } from 'lucide-react'
import { useAuth } from '@/components/auth/AuthProvider'

export default function ProfilePage() {
  const router = useRouter()
  const { user, loading, logout } = useAuth()

  if (loading) return <div className="page-wrap text-sm text-slate-500">Loading operator profile…</div>

  if (!user) {
    return (
      <div className="page-wrap">
        <div className="mission-card mx-auto max-w-xl rounded-3xl p-8 text-center">
          <CircleUserRound size={36} className="mx-auto text-slate-500" />
          <h1 className="mt-4 text-2xl font-bold text-white">No operator session</h1>
          <p className="mt-2 text-sm text-slate-500">Sign in to view your LunaGuard operator profile.</p>
          <Link href="/login" className="mt-5 inline-block rounded-xl bg-white px-5 py-3 text-sm font-bold text-slate-950">Go to login</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="page-wrap">
      <p className="page-kicker">Operator account</p>
      <h1 className="page-title mt-2">Profile & Mission Identity</h1>
      <div className="mt-6 grid gap-4 lg:grid-cols-[.75fr_1.25fr]">
        <section className="mission-card rounded-3xl p-6">
          <div className="flex items-center gap-4">
            {user.avatar_url ? <img src={user.avatar_url} alt="Operator avatar" className="h-16 w-16 rounded-2xl border border-white/10 object-cover" /> : <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-cyan-electric/20 bg-cyan-electric/[0.06]"><UserRoundCog size={28} className="text-cyan-electric" /></div>}
            <div className="min-w-0"><h2 className="truncate text-xl font-bold text-white">{user.name}</h2><p className="mt-1 truncate text-sm text-slate-500">{user.email}</p><p className="mt-1 text-[10px] font-bold uppercase tracking-[0.14em] text-cyan-200">{user.provider} identity</p></div>
          </div>
          <button onClick={async () => { await logout(); router.push('/') }} className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] py-3 text-sm font-semibold text-slate-300 hover:border-red-400/20 hover:text-red-200"><LogOut size={16} /> Log out</button>
        </section>
        <section className="mission-card rounded-3xl p-6">
          <div className="grid gap-4 md:grid-cols-2">
            <Info icon={ShieldCheck} title="Human authority" copy="AI recommendations remain advisory. The operator selects routes and initiates mission actions." />
            <Info icon={Bot} title="IBM AI boundary" copy="Granite narrates and synthesizes evidence; deterministic mission calculations remain authoritative." />
          </div>
          <div className="mt-6 rounded-2xl border border-white/10 bg-black/20 p-5">
            <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-500">Local persistence</p>
            <p className="mt-2 text-sm leading-6 text-slate-400">Local operator accounts persist in a Docker named volume. Mission timeline entries are stored in this browser for the local deployment. A production rollout can move mission history to an authenticated server-side audit store.</p>
          </div>
        </section>
      </div>
    </div>
  )
}

function Info({ icon: Icon, title, copy }: { icon: typeof ShieldCheck; title: string; copy: string }) {
  return <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-4"><Icon size={18} className="text-cyan-electric" /><h3 className="mt-3 font-bold text-white">{title}</h3><p className="mt-2 text-sm leading-6 text-slate-500">{copy}</p></div>
}
