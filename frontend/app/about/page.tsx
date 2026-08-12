import { Github, Heart, Linkedin, MoonStar, Orbit, Rocket, Sparkles } from 'lucide-react'

const linkedIn = process.env.NEXT_PUBLIC_CREATOR_LINKEDIN?.trim()
const github = process.env.NEXT_PUBLIC_CREATOR_GITHUB?.trim()

export default function AboutPage() {
  return (
    <div className="page-wrap">
      <section className="mission-card relative overflow-hidden rounded-[30px] p-7 md:p-10">
        <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-cyan-electric/10 blur-3xl" />
        <div className="relative grid gap-8 lg:grid-cols-[.65fr_1.35fr] lg:items-center">
          <div className="mx-auto flex w-full max-w-sm items-center justify-center">
            <div className="relative flex aspect-square w-full max-w-[290px] items-center justify-center rounded-full border border-cyan-electric/20 bg-gradient-to-br from-ibm-blue/25 via-[#07111f] to-violet-500/15 shadow-[0_0_90px_rgba(15,98,254,.18)]">
              <div className="absolute inset-7 rounded-full border border-white/10" />
              <div className="absolute inset-14 rounded-full border border-dashed border-cyan-electric/20 animate-spin-slow" />
              <MoonStar size={72} className="text-cyan-100" />
              <Sparkles size={22} className="absolute right-10 top-12 text-blue-300" />
              <Orbit size={24} className="absolute bottom-12 left-10 text-violet-300" />
            </div>
          </div>

          <div>
            <p className="page-kicker">Creator</p>
            <h1 className="page-title mt-3">Hi, I’m Asma Ahmed Syrotikin.</h1>
            <p className="mt-5 max-w-2xl text-base leading-8 text-slate-300">
              I built LunaGuard around a simple idea: space systems should be powerful without becoming mysterious. I love combining thoughtful design, reliable engineering, and AI that can explain its work.
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-2 rounded-full border border-cyan-electric/15 bg-cyan-electric/[0.05] px-3 py-2 text-xs font-semibold text-cyan-100"><Rocket size={13} /> Space technology</span>
              <span className="inline-flex items-center gap-2 rounded-full border border-blue-400/15 bg-blue-400/[0.05] px-3 py-2 text-xs font-semibold text-blue-100"><Sparkles size={13} /> AI + product design</span>
              <span className="inline-flex items-center gap-2 rounded-full border border-violet-400/15 bg-violet-400/[0.05] px-3 py-2 text-xs font-semibold text-violet-100"><Heart size={13} /> Human-centered systems</span>
            </div>

            <div className="mt-7 flex flex-wrap gap-3">
              {linkedIn && (
                <a href={linkedIn} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-bold text-slate-950 hover:bg-cyan-100">
                  <Linkedin size={16} /> LinkedIn
                </a>
              )}
              {github && (
                <a href={github} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-bold text-slate-200 hover:border-cyan-electric/30">
                  <Github size={16} /> GitHub
                </a>
              )}
              {!linkedIn && !github && (
                <p className="rounded-xl border border-white/10 bg-white/[0.025] px-4 py-3 text-xs leading-5 text-slate-500">
                  Social links can be added with <code className="text-slate-300">NEXT_PUBLIC_CREATOR_LINKEDIN</code> and <code className="text-slate-300">NEXT_PUBLIC_CREATOR_GITHUB</code> in <code className="text-slate-300">.env</code>.
                </p>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
