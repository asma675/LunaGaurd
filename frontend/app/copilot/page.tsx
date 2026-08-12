'use client'

import { FormEvent, useEffect, useMemo, useRef, useState } from 'react'
import {
  Bot,
  BrainCircuit,
  ExternalLink,
  Headphones,
  Loader2,
  Mic,
  MicOff,
  Send,
  ShieldCheck,
  Sparkles,
  Square,
  UserRound,
  Volume2,
  VolumeX,
  Waves,
} from 'lucide-react'
import {
  askCopilot,
  getAiStatus,
  getKnowledgeSources,
  getVoiceStatus,
  synthesizeVoice,
  transcribeVoice,
} from '@/lib/api'
import type { AiStatus, KnowledgeSource, VoiceStatus } from '@/lib/types'
import { appendTimelineEvent } from '@/lib/timeline'

type ChatMessage = {
  id: string
  role: 'assistant' | 'user'
  content: string
  citations?: KnowledgeSource[]
  source?: 'watsonx-granite' | 'deterministic-fallback'
}

type VoiceProfile = 'luna' | 'atlas'

type BrowserSpeechRecognition = {
  continuous: boolean
  interimResults: boolean
  lang: string
  start: () => void
  stop: () => void
  abort: () => void
  onresult: ((event: { results: ArrayLike<{ 0: { transcript: string }; isFinal?: boolean }> }) => void) | null
  onerror: ((event: { error?: string }) => void) | null
  onend: (() => void) | null
}

type SpeechRecognitionConstructor = new () => BrowserSpeechRecognition

const QUICK_PROMPTS = [
  'Why is terrain slope important for a lunar rover route?',
  'What can the Canadian Space Agency LEAD rover dataset teach us about remote rover operations?',
  'Summarize the latest NASA space-weather context available to LunaGuard.',
  'How should mission control think about battery reserve versus route risk?',
]

export default function CopilotPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content:
        'I’m the LunaGuard Mission Copilot. Ask about lunar terrain, rover operations, mission trade-offs, NASA LRO data, CSA rover analogues, or recent space-weather context. IBM Granite on watsonx.ai generates grounded answers when configured, while deterministic safety calculations remain authoritative.',
    },
  ])
  const [question, setQuestion] = useState('')
  const [loading, setLoading] = useState(false)
  const [ai, setAi] = useState<AiStatus | null>(null)
  const [sources, setSources] = useState<KnowledgeSource[]>([])
  const [voiceStatus, setVoiceStatus] = useState<VoiceStatus | null>(null)
  const [voiceProfile, setVoiceProfile] = useState<VoiceProfile>('luna')
  const [autoSpeak, setAutoSpeak] = useState(true)
  const [listening, setListening] = useState(false)
  const [voiceBusy, setVoiceBusy] = useState(false)
  const [voiceNote, setVoiceNote] = useState<string | null>(null)

  const bottomRef = useRef<HTMLDivElement | null>(null)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const recorderStreamRef = useRef<MediaStream | null>(null)
  const recorderChunksRef = useRef<Blob[]>([])
  const recognitionRef = useRef<BrowserSpeechRecognition | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const objectUrlRef = useRef<string | null>(null)

  useEffect(() => {
    let active = true
    Promise.all([
      getAiStatus().catch(() => null),
      getKnowledgeSources().catch(() => []),
      getVoiceStatus().catch(() => null),
    ]).then(([status, sourceList, speech]) => {
      if (!active) return
      setAi(status)
      setSources(sourceList)
      setVoiceStatus(speech)
    })
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages, loading])

  useEffect(() => {
    return () => {
      recognitionRef.current?.abort()
      if (recorderRef.current && recorderRef.current.state !== 'inactive') recorderRef.current.stop()
      recorderStreamRef.current?.getTracks().forEach(track => track.stop())
      audioRef.current?.pause()
      window.speechSynthesis?.cancel()
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current)
    }
  }, [])

  const liveSourceCount = useMemo(
    () => sources.filter(source => source.status === 'live').length,
    [sources]
  )

  async function speakAnswer(text: string) {
    const safeText = text.trim().slice(0, 4500)
    if (!safeText) return

    setVoiceBusy(true)
    setVoiceNote(null)
    try {
      audioRef.current?.pause()
      window.speechSynthesis?.cancel()
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current)
        objectUrlRef.current = null
      }

      if (voiceStatus?.tts_enabled) {
        try {
          const blob = await synthesizeVoice(safeText, voiceProfile)
          const url = URL.createObjectURL(blob)
          objectUrlRef.current = url
          const audio = new Audio(url)
          audioRef.current = audio
          audio.onended = () => {
            setVoiceBusy(false)
            if (objectUrlRef.current) {
              URL.revokeObjectURL(objectUrlRef.current)
              objectUrlRef.current = null
            }
          }
          audio.onerror = () => {
            setVoiceBusy(false)
            setVoiceNote('IBM voice playback failed. Browser voice fallback is still available.')
          }
          await audio.play()
          return
        } catch {
          setVoiceNote('IBM Watson voice is temporarily unavailable, so LunaGuard switched to the browser voice.')
        }
      }

      if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(safeText)
        const available = window.speechSynthesis.getVoices()
        const preferredNames =
          voiceProfile === 'luna'
            ? ['Samantha', 'Zira', 'Aria', 'Jenny', 'Female', 'Google US English']
            : ['Guy', 'David', 'Mark', 'Daniel', 'Male', 'Google UK English Male']
        const selected = available.find(voice =>
          preferredNames.some(name => voice.name.toLowerCase().includes(name.toLowerCase()))
        )
        if (selected) utterance.voice = selected
        utterance.rate = 0.96
        utterance.pitch = voiceProfile === 'luna' ? 1.04 : 0.94
        utterance.onend = () => setVoiceBusy(false)
        utterance.onerror = () => setVoiceBusy(false)
        window.speechSynthesis.speak(utterance)
        return
      }

      setVoiceNote('Speech playback is not available in this browser.')
    } catch {
      setVoiceNote('Voice playback is unavailable right now; the text answer is still complete.')
    } finally {
      if (!audioRef.current || audioRef.current.paused) setVoiceBusy(false)
    }
  }

  async function submit(raw: string) {
    const q = raw.trim()
    if (!q || loading) return

    const userMessage: ChatMessage = {
      id: `${Date.now()}-u`,
      role: 'user',
      content: q,
    }
    setMessages(previous => [...previous, userMessage])
    setQuestion('')
    setLoading(true)

    try {
      const response = await askCopilot(q, {
        application: 'LunaGuard',
        mode: 'human-in-the-loop decision support',
        safety_rule: 'deterministic route metrics are authoritative',
      })

      setMessages(previous => [
        ...previous,
        {
          id: `${Date.now()}-a`,
          role: 'assistant',
          content: response.answer,
          citations: response.citations,
          source: response.source,
        },
      ])

      appendTimelineEvent({
        type: 'ai',
        title: 'Mission Copilot query answered',
        detail: `${response.source === 'watsonx-granite' ? 'IBM Granite' : 'Deterministic fallback'} answered: “${q.slice(0, 100)}${q.length > 100 ? '…' : ''}”`,
        severity: 'info',
        source:
          response.source === 'watsonx-granite'
            ? 'IBM watsonx.ai / Granite'
            : 'LunaGuard Grounding Layer',
      })

      if (autoSpeak) void speakAnswer(response.answer)
    } catch (error) {
      setMessages(previous => [
        ...previous,
        {
          id: `${Date.now()}-e`,
          role: 'assistant',
          content:
            error instanceof Error
              ? `Copilot request failed: ${error.message}`
              : 'Copilot request failed.',
        },
      ])
    } finally {
      setLoading(false)
    }
  }

  async function finishWatsonRecording(blob: Blob) {
    try {
      setVoiceBusy(true)
      setVoiceNote('IBM Watson Speech is transcribing…')
      const result = await transcribeVoice(blob)
      if (!result.transcript.trim()) {
        setVoiceNote('I did not catch a clear sentence. Try again a little closer to the microphone.')
        return
      }
      setVoiceNote('Voice captured with IBM Watson Speech to Text.')
      await submit(result.transcript)
    } catch {
      setVoiceNote('IBM speech transcription was unavailable. Try the microphone again for browser fallback.')
    } finally {
      setVoiceBusy(false)
    }
  }

  async function startWatsonRecording() {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    recorderStreamRef.current = stream
    recorderChunksRef.current = []
    const recorder = new MediaRecorder(stream)
    recorderRef.current = recorder
    recorder.ondataavailable = event => {
      if (event.data.size > 0) recorderChunksRef.current.push(event.data)
    }
    recorder.onstop = () => {
      const type = recorder.mimeType || 'audio/webm'
      const blob = new Blob(recorderChunksRef.current, { type })
      recorderStreamRef.current?.getTracks().forEach(track => track.stop())
      recorderStreamRef.current = null
      recorderRef.current = null
      setListening(false)
      void finishWatsonRecording(blob)
    }
    recorder.start()
    setListening(true)
    setVoiceNote('Listening with IBM Watson Speech… tap Stop when finished.')
  }

  function startBrowserRecognition() {
    const speechWindow = window as typeof window & {
      SpeechRecognition?: SpeechRecognitionConstructor
      webkitSpeechRecognition?: SpeechRecognitionConstructor
    }
    const Recognition = speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition
    if (!Recognition) {
      setVoiceNote('Voice input is not supported by this browser. Chrome or Edge works best.')
      return
    }

    const recognition = new Recognition()
    recognitionRef.current = recognition
    recognition.continuous = false
    recognition.interimResults = false
    recognition.lang = 'en-US'
    recognition.onresult = event => {
      const transcript = Array.from(event.results)
        .map(result => result[0]?.transcript ?? '')
        .join(' ')
        .trim()
      if (transcript) {
        setVoiceNote('Voice captured with browser speech recognition.')
        void submit(transcript)
      }
    }
    recognition.onerror = () => {
      setVoiceNote('I could not hear that clearly. Try the microphone again.')
    }
    recognition.onend = () => {
      setListening(false)
      recognitionRef.current = null
    }
    recognition.start()
    setListening(true)
    setVoiceNote('Listening…')
  }

  async function toggleListening() {
    if (listening) {
      if (recorderRef.current) recorderRef.current.stop()
      if (recognitionRef.current) recognitionRef.current.stop()
      setListening(false)
      return
    }

    setVoiceNote(null)
    try {
      if (
        voiceStatus?.stt_enabled &&
        typeof navigator !== 'undefined' &&
        navigator.mediaDevices &&
        typeof MediaRecorder !== 'undefined'
      ) {
        await startWatsonRecording()
      } else {
        startBrowserRecognition()
      }
    } catch {
      setVoiceNote('Microphone permission is required for voice questions.')
      setListening(false)
    }
  }

  function stopSpeaking() {
    audioRef.current?.pause()
    audioRef.current = null
    window.speechSynthesis?.cancel()
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current)
      objectUrlRef.current = null
    }
    setVoiceBusy(false)
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    void submit(question)
  }

  return (
    <div className="page-wrap">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="page-kicker">Grounded IBM AI</p>
          <h1 className="page-title mt-2">AI Mission Copilot</h1>
          <p className="mt-3 max-w-4xl text-sm leading-6 text-slate-400 md:text-base">
            Source-aware mission guidance powered by IBM Granite on watsonx.ai and grounded in NASA and Canadian Space Agency context. Voice mode can use IBM Watson Speech services when configured, with a browser fallback for local demos.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <StatusPill
            label="IBM watsonx.ai"
            value={ai?.enabled ? 'Granite live' : 'Safe fallback'}
            live={Boolean(ai?.enabled)}
          />
          <StatusPill
            label="IBM Watson Speech"
            value={voiceStatus?.tts_enabled || voiceStatus?.stt_enabled ? 'Connected' : 'Browser fallback'}
            live={Boolean(voiceStatus?.tts_enabled || voiceStatus?.stt_enabled)}
          />
        </div>
      </div>

      <div className="mt-6 grid min-h-[700px] gap-4 xl:grid-cols-[1fr_360px]">
        <section className="mission-card flex min-h-[700px] flex-col overflow-hidden rounded-3xl">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-5 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-blue-400/20 bg-blue-400/10 text-blue-200">
                <Bot size={21} />
              </div>
              <div>
                <p className="font-bold text-white">LunaGuard Copilot</p>
                <p className="text-[11px] text-slate-500">{ai?.model_id ?? 'ibm/granite-3-3-8b-instruct'}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <ShieldCheck size={14} className="text-cyan-electric" /> Grounded answers · explicit sources
            </div>
          </div>

          <div className="flex-1 space-y-4 overflow-y-auto p-4 md:p-6">
            {messages.map(message => (
              <div
                key={message.id}
                className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {message.role === 'assistant' && (
                  <div className="mt-1 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl bg-ibm-blue/20 text-blue-200">
                    <Bot size={15} />
                  </div>
                )}
                <div
                  className={`max-w-[86%] rounded-2xl border p-4 ${
                    message.role === 'user'
                      ? 'border-cyan-electric/20 bg-cyan-electric/[0.07]'
                      : 'border-white/10 bg-white/[0.035]'
                  }`}
                >
                  <p className="whitespace-pre-wrap text-[15px] leading-7 text-slate-200">{message.content}</p>
                  {message.role === 'assistant' && (
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      {message.source && (
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-400/15 bg-blue-400/[0.06] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-blue-200">
                          <Sparkles size={11} />
                          {message.source === 'watsonx-granite' ? 'IBM Granite' : 'Deterministic fallback'}
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => void speakAnswer(message.content)}
                        className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-black/20 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400 hover:text-white"
                      >
                        <Volume2 size={11} /> Speak
                      </button>
                    </div>
                  )}
                  {message.citations && message.citations.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {message.citations.map(source => (
                        <a
                          key={source.id}
                          href={source.url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-black/20 px-2.5 py-1 text-[10px] font-semibold text-cyan-200 hover:border-cyan-electric/30"
                        >
                          {source.id} <ExternalLink size={10} />
                        </a>
                      ))}
                    </div>
                  )}
                </div>
                {message.role === 'user' && (
                  <div className="mt-1 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl bg-white/10 text-slate-300">
                    <UserRound size={15} />
                  </div>
                )}
              </div>
            ))}

            {loading && (
              <div className="flex items-center gap-3 text-sm text-slate-500">
                <Loader2 size={17} className="animate-spin text-cyan-electric" /> Grounding with NASA/CSA context and preparing mission guidance…
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          <div className="border-t border-white/10 p-4">
            <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
              {QUICK_PROMPTS.map(prompt => (
                <button
                  key={prompt}
                  onClick={() => void submit(prompt)}
                  className="whitespace-nowrap rounded-full border border-white/10 bg-white/[0.025] px-3 py-2 text-xs text-slate-400 hover:border-cyan-electric/30 hover:text-slate-200"
                >
                  {prompt}
                </button>
              ))}
            </div>

            <form onSubmit={handleSubmit} className="flex gap-2">
              <button
                type="button"
                onClick={() => void toggleListening()}
                disabled={loading || voiceBusy}
                className={`flex h-[52px] w-[52px] flex-shrink-0 items-center justify-center rounded-2xl border transition disabled:opacity-40 ${
                  listening
                    ? 'border-red-400/35 bg-red-400/10 text-red-200'
                    : 'border-cyan-electric/20 bg-cyan-electric/[0.06] text-cyan-100 hover:bg-cyan-electric/10'
                }`}
                title={listening ? 'Stop listening' : 'Ask with your voice'}
              >
                {listening ? <Square size={17} /> : <Mic size={19} />}
              </button>
              <input
                value={question}
                onChange={event => setQuestion(event.target.value)}
                placeholder="Ask about terrain, risk, rover operations, NASA LRO, CSA data…"
                className="min-w-0 flex-1 rounded-2xl border border-white/10 bg-black/25 px-4 py-3.5 text-[15px] text-white placeholder:text-slate-600 focus:border-cyan-electric/35"
              />
              <button
                type="submit"
                disabled={loading || !question.trim()}
                className="flex h-[52px] w-[54px] items-center justify-center rounded-2xl bg-white text-slate-950 disabled:opacity-40"
              >
                <Send size={18} />
              </button>
            </form>

            {voiceNote && <p className="mt-2 text-xs text-slate-500">{voiceNote}</p>}
          </div>
        </section>

        <aside className="space-y-4">
          <section className="mission-card rounded-3xl p-5">
            <div className="flex items-center gap-2">
              <Headphones size={17} className="text-cyan-200" />
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-cyan-200">Voice console</p>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              {(['luna', 'atlas'] as const).map(profile => (
                <button
                  key={profile}
                  onClick={() => setVoiceProfile(profile)}
                  className={`rounded-2xl border p-3 text-left transition ${
                    voiceProfile === profile
                      ? 'border-cyan-electric/30 bg-cyan-electric/[0.08]'
                      : 'border-white/10 bg-black/20'
                  }`}
                >
                  <p className="text-sm font-bold text-white">{profile === 'luna' ? 'Luna' : 'Atlas'}</p>
                  <p className="mt-1 text-[10px] text-slate-500">{profile === 'luna' ? 'Feminine · warm, bright' : 'Masculine · calm, lower'}</p>
                </button>
              ))}
            </div>
            <button
              onClick={() => setAutoSpeak(value => !value)}
              className="mt-3 flex w-full items-center justify-between rounded-2xl border border-white/10 bg-white/[0.025] px-3 py-3 text-sm text-slate-300"
            >
              <span className="flex items-center gap-2">{autoSpeak ? <Volume2 size={15} /> : <VolumeX size={15} />} Auto-read answers</span>
              <span className={`h-2.5 w-2.5 rounded-full ${autoSpeak ? 'bg-emerald-300' : 'bg-slate-600'}`} />
            </button>
            {voiceBusy && (
              <button
                onClick={stopSpeaking}
                className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 py-2.5 text-xs font-semibold text-slate-400 hover:text-white"
              >
                <VolumeX size={14} /> Stop audio
              </button>
            )}
            <p className="mt-3 text-[11px] leading-5 text-slate-500">
              IBM Watson Speech is used when service credentials are configured. Otherwise LunaGuard uses the browser’s local speech features without exposing cloud secrets.
            </p>
          </section>

          <section className="mission-card rounded-3xl p-5">
            <div className="flex items-center gap-2">
              <Waves size={17} className="text-blue-300" />
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-cyan-200">Grounding status</p>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <MiniMetric label="Sources" value={String(sources.length || 4)} />
              <MiniMetric label="Live feeds" value={String(liveSourceCount)} />
            </div>
            <div className="mt-4 space-y-3">
              {sources.slice(0, 6).map(source => (
                <a
                  key={source.id}
                  href={source.url}
                  target="_blank"
                  rel="noreferrer"
                  className="block rounded-2xl border border-white/10 bg-white/[0.025] p-3 transition hover:border-cyan-electric/25"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-xs font-bold text-white">{source.agency}</p>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase ${
                        source.status === 'live'
                          ? 'bg-emerald-400/10 text-emerald-300'
                          : source.status === 'offline-fallback'
                            ? 'bg-amber-400/10 text-amber-300'
                            : 'bg-blue-400/10 text-blue-300'
                      }`}
                    >
                      {source.status}
                    </span>
                  </div>
                  <p className="mt-1 text-xs leading-5 text-slate-400">{source.title}</p>
                </a>
              ))}
            </div>
          </section>

          <section className="mission-card rounded-3xl p-5">
            <div className="flex items-center gap-2 text-slate-400">
              <ShieldCheck size={15} className="text-cyan-electric" />
              <p className="text-[10px] font-bold uppercase tracking-[0.16em]">Safety boundary</p>
            </div>
            <p className="mt-3 text-sm leading-6 text-slate-300">
              <strong className="text-white">Granite explains the decision; it does not invent the physics.</strong> Computed route metrics, hard constraints, and emergency viability remain authoritative.
            </p>
          </section>
        </aside>
      </div>
    </div>
  )
}

function StatusPill({ label, value, live }: { label: string; value: string; live: boolean }) {
  return (
    <div
      className={`rounded-2xl border px-4 py-3 ${
        live ? 'border-emerald-400/25 bg-emerald-400/[0.06]' : 'border-amber-400/25 bg-amber-400/[0.06]'
      }`}
    >
      <div className="flex items-center gap-2">
        <BrainCircuit size={17} className={live ? 'text-emerald-300' : 'text-amber-300'} />
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">{label}</p>
          <p className="mt-1 text-sm font-bold text-white">{value}</p>
        </div>
      </div>
    </div>
  )
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
      <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-slate-600">{label}</p>
      <p className="mt-1 font-mono text-xl font-bold text-white">{value}</p>
    </div>
  )
}