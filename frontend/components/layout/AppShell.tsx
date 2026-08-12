'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Bot,
  Boxes,
  CircleUserRound,
  Database,
  Gauge,
  Globe2,
  LayoutDashboard,
  LogIn,
  LogOut,
  MapPinned,
  Menu,
  RadioTower,
  ShieldCheck,
  Sparkles,
  UserRound,
  X,
} from 'lucide-react'
import { useState } from 'react'
import { AuthProvider, useAuth } from '@/components/auth/AuthProvider'
import SiteFooter from '@/components/layout/SiteFooter'
import SpaceBackdrop from '@/components/layout/SpaceBackdrop'

const nav = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/planner', label: 'Mission Planner', icon: MapPinned },
  { href: '/timeline', label: 'Mission Timeline', icon: RadioTower },
  { href: '/digital-twin', label: 'Digital Twin', icon: Boxes },
  { href: '/globe', label: '3D Lunar Globe', icon: Globe2 },
  { href: '/copilot', label: 'AI Mission Copilot', icon: Bot },
  { href: '/data', label: 'Data Sources', icon: Database },
  { href: '/about', label: 'About', icon: UserRound },
]

function ShellInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)
  const { user, logout } = useAuth()
  const isLogin = pathname === '/login'

  if (isLogin) {
    return (
      <div className="app-shell min-h-screen bg-space-dark">
        <SpaceBackdrop />
        {children}
        <SiteFooter />
      </div>
    )
  }

  return (
    <div className="app-shell min-h-screen bg-space-dark text-slate-100">
      <SpaceBackdrop />
      <header className="fixed inset-x-0 top-0 z-50 flex h-16 items-center border-b border-white/10 bg-[#050b14]/88 px-4 backdrop-blur-2xl lg:pl-[292px]">
        <button
          className="mr-3 rounded-xl border border-white/10 bg-white/5 p-2 text-slate-300 lg:hidden"
          onClick={() => setMobileOpen(true)}
          aria-label="Open navigation"
        >
          <Menu size={20} />
        </button>
        <div className="flex min-w-0 items-center gap-3">
          <div className="hidden items-center gap-2 rounded-full border border-cyan-electric/20 bg-cyan-electric/[0.06] px-3 py-1.5 sm:flex">
            <ShieldCheck size={14} className="text-cyan-electric" />
            <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-cyan-100">Human-in-the-loop</span>
          </div>
          <div className="hidden h-5 w-px bg-white/10 sm:block" />
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <Gauge size={15} className="text-green-success" />
            <span className="hidden md:inline">Mission systems nominal</span>
          </div>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <div className="hidden rounded-xl border border-ibm-blue/30 bg-ibm-blue/10 px-3 py-2 md:block">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-blue-200">IBM watsonx.ai</p>
            <p className="mt-0.5 text-[10px] text-slate-500">Granite mission intelligence</p>
          </div>
          {user ? (
            <>
              <Link href="/profile" className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 hover:border-cyan-electric/30">
                <CircleUserRound size={18} className="text-cyan-electric" />
                <span className="hidden max-w-[130px] truncate text-sm font-medium text-slate-200 sm:inline">{user.name}</span>
              </Link>
              <button onClick={() => logout()} className="rounded-xl border border-white/10 bg-white/[0.04] p-2.5 text-slate-400 hover:text-white" title="Log out">
                <LogOut size={17} />
              </button>
            </>
          ) : (
            <Link href="/login" className="flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-sm font-semibold text-slate-950 hover:bg-cyan-100">
              <LogIn size={16} /> Login
            </Link>
          )}
        </div>
      </header>

      <aside className={`fixed inset-y-0 left-0 z-[60] w-[276px] border-r border-white/10 bg-[#050b14]/96 p-4 backdrop-blur-2xl transition-transform lg:translate-x-0 ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="mb-6 flex items-center gap-3 px-1 pt-1">
          <div className="relative flex h-12 w-12 items-center justify-center rounded-2xl border border-cyan-electric/20 bg-gradient-to-br from-ibm-blue/20 to-violet-accent/15 shadow-[0_0_30px_rgba(15,98,254,.18)]">
            <img src="/lunaguard-mark.svg" alt="LunaGuard" className="h-10 w-10" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-black tracking-[0.20em] text-white">LUNAGUARD</span>
              <Sparkles size={13} className="text-cyan-electric" />
            </div>
            <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500">Lunar Mission Intelligence</p>
          </div>
          <button className="ml-auto rounded-lg p-2 text-slate-500 lg:hidden" onClick={() => setMobileOpen(false)}>
            <X size={18} />
          </button>
        </div>

        <nav className="space-y-1">
          {nav.map(item => {
            const Icon = item.icon
            const active = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={`group flex items-center gap-3 rounded-xl border px-3 py-3 text-sm font-medium transition-all ${active ? 'border-cyan-electric/25 bg-gradient-to-r from-ibm-blue/20 to-cyan-electric/[0.06] text-white shadow-[inset_3px_0_0_#00d4ff]' : 'border-transparent text-slate-400 hover:border-white/10 hover:bg-white/[0.035] hover:text-white'}`}
              >
                <Icon size={18} className={active ? 'text-cyan-electric' : 'text-slate-500 group-hover:text-slate-300'} />
                {item.label}
                {item.href === '/copilot' && <span className="ml-auto rounded-full border border-blue-400/20 bg-blue-400/10 px-1.5 py-0.5 text-[9px] font-bold uppercase text-blue-200">IBM AI</span>}
              </Link>
            )
          })}
        </nav>

        <div className="absolute inset-x-4 bottom-4 rounded-2xl border border-white/10 bg-white/[0.035] p-3">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">Mission architecture</p>
          <p className="mt-2 text-sm font-semibold text-white">Explainable resilient autonomy</p>
          <p className="mt-1 text-xs leading-relaxed text-slate-500">Deterministic safety + IBM Granite intelligence + NASA/CSA grounding.</p>
        </div>
      </aside>

      {mobileOpen && <button aria-label="Close navigation" className="fixed inset-0 z-[55] bg-black/70 lg:hidden" onClick={() => setMobileOpen(false)} />}

      <main className="relative min-h-screen pt-16 lg:pl-[276px]">
        <div className="min-h-[calc(100vh-4rem)]">{children}</div>
        <SiteFooter />
      </main>
    </div>
  )
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <ShellInner>{children}</ShellInner>
    </AuthProvider>
  )
}
