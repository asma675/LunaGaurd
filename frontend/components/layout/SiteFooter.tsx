import Link from 'next/link'
import { Github, Linkedin, MoonStar } from 'lucide-react'

const linkedIn = process.env.NEXT_PUBLIC_CREATOR_LINKEDIN?.trim()
const github = process.env.NEXT_PUBLIC_CREATOR_GITHUB?.trim()

export default function SiteFooter() {
  return (
    <footer className="relative mt-8 border-t border-white/10 bg-[#040910]/55 px-5 py-5 backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-[1500px] flex-wrap items-center justify-between gap-4 text-xs text-slate-500">
        <div className="flex items-center gap-2">
          <MoonStar size={14} className="text-cyan-300" />
          <span>© 2026 Asma Ahmed Syrotikin. All rights reserved.</span>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Link href="/about" className="font-semibold text-slate-400 transition hover:text-white">
            About the creator
          </Link>
          {linkedIn && (
            <a href={linkedIn} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-slate-400 transition hover:text-cyan-200">
              <Linkedin size={13} /> LinkedIn
            </a>
          )}
          {github && (
            <a href={github} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-slate-400 transition hover:text-cyan-200">
              <Github size={13} /> GitHub
            </a>
          )}
          <span className="rounded-full border border-blue-400/15 bg-blue-400/[0.05] px-2.5 py-1 text-[10px] font-semibold text-blue-200">
            IBM watsonx.ai + Granite
          </span>
        </div>
      </div>
    </footer>
  )
}
