'use client'

import { useCallback, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import {
  motion,
  animate,
  useMotionValue,
  useTransform,
  useReducedMotion,
  MotionConfig,
} from 'framer-motion'

const STEP_INTERVAL = 3800
const COUNT_DURATION = 0.76
const ENTRANCE_DURATION = 0.48
const STAGGER = 0.08
const ENTRANCE_EASE: [number, number, number, number] = [0.34, 1.56, 0.64, 1]

const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3)
const easeOutBack = (t: number) => {
  const c1 = 1.70158
  const c3 = c1 + 1
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2)
}

const STEP_NAV = [
  { title: 'Pick a market', subtitle: 'Choose a yes/no question about campus life.' },
  { title: 'Place your bet', subtitle: 'Buy YES if you think it happens, NO if you don’t.' },
  { title: 'Win Crowns', subtitle: 'Each winning share pays out 1 Crown when it resolves.' },
]

const CARD_HEADING = [
  { title: 'Pick a market', subtitle: 'Choose a yes/no question about campus life.' },
  { title: 'Place your bet', subtitle: 'Buy YES if you think it happens, NO if not.' },
  { title: 'Win Crowns', subtitle: 'Right when it resolves? Each share pays 1 Crown.' },
]

function CrownIcon({ size = 16, className = '' }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="#D9A441" className={className} aria-hidden="true">
      <path d="M3 8l4 3 5-6 5 6 4-3-2.2 11H5.2L3 8z" />
      <rect x="5" y="19.5" width="14" height="1.8" rx="0.9" />
    </svg>
  )
}

function Reveal({ index, className, children }: { index: number; className?: string; children: ReactNode }) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, scale: 0.9, y: 12 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: ENTRANCE_DURATION, delay: index * STAGGER, ease: ENTRANCE_EASE }}
    >
      {children}
    </motion.div>
  )
}

function StepMarket({ question, yesPct }: { question: string; yesPct: number }) {
  const [pct, setPct] = useState(0)

  useEffect(() => {
    const controls = animate(0, yesPct, { duration: COUNT_DURATION, ease: easeOutBack, onUpdate: setPct })
    return () => controls.stop()
  }, [yesPct])

  const pctRounded = Math.round(pct)

  return (
    <>
      <Reveal index={1} className="flex items-center gap-2">
        <span className="rounded-full bg-columbia-soft px-[9px] py-1 text-[11px] font-semibold tracking-[.04em] text-columbia">
          CAMPUS · WEATHER
        </span>
        <span className="ml-auto flex items-center gap-1.5">
          <span className="relative flex h-2 w-2">
            <span className="absolute inset-0 rounded-full bg-success animate-live-pulse" />
            <span className="relative h-2 w-2 rounded-full bg-success" />
          </span>
          <span className="text-[11px] font-semibold text-success">LIVE</span>
        </span>
      </Reveal>

      <Reveal index={2}>
        <p className="font-display text-2xl leading-[1.2] text-foreground">{question}</p>
      </Reveal>

      <Reveal index={3} className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between font-numeric text-[13px] font-semibold">
          <span className="text-columbia">YES · {pctRounded}%</span>
          <span className="text-ink-faint">NO · {100 - pctRounded}%</span>
        </div>
        <div className="h-2.5 overflow-hidden rounded-md bg-muted">
          <div className="h-full rounded-md bg-columbia" style={{ width: `${pctRounded}%` }} />
        </div>
      </Reveal>

      <Reveal index={4} className="flex items-center justify-between text-xs font-medium text-muted-foreground">
        <span>1,240 Crowns traded</span>
        <span>Resolves Dec 15</span>
      </Reveal>
    </>
  )
}

function StepTrade({ yesPct }: { yesPct: number }) {
  const price = yesPct / 100
  const targetCost = 10 * price
  const [shares, setShares] = useState(0)
  const [cost, setCost] = useState(0)

  useEffect(() => {
    const controls = animate(0, 10, { duration: COUNT_DURATION, ease: easeOutBack, onUpdate: setShares })
    return () => controls.stop()
  }, [])

  useEffect(() => {
    const controls = animate(0, targetCost, { duration: COUNT_DURATION, ease: easeOutCubic, onUpdate: setCost })
    return () => controls.stop()
  }, [targetCost])

  return (
    <>
      <Reveal index={1} className="flex gap-2">
        <div className="flex-1 rounded-xl bg-columbia py-[11px] text-center text-sm font-bold text-primary-foreground shadow-[0_8px_18px_-9px_var(--columbia)]">
          YES
        </div>
        <div className="flex-1 rounded-xl bg-secondary py-[11px] text-center text-sm font-bold text-ink-faint">
          NO
        </div>
      </Reveal>

      <Reveal index={2} className="flex items-baseline justify-between">
        <span className="text-[13px] font-medium text-muted-foreground">Shares</span>
        <span className="font-display font-numeric text-[30px] text-foreground">{Math.round(shares)}</span>
      </Reveal>

      <Reveal index={3} className="flex items-center justify-between text-[13px] font-medium text-muted-foreground">
        <span>Price / share</span>
        <span className="font-semibold text-foreground">{price.toFixed(2)} Crowns</span>
      </Reveal>

      <Reveal index={4}>
        <div className="h-px bg-border" />
      </Reveal>

      <Reveal index={5} className="flex items-center justify-between">
        <span className="text-[13px] font-medium text-muted-foreground">Cost</span>
        <span className="flex items-center gap-1.5 font-display font-numeric text-[22px] text-foreground">
          <CrownIcon size={16} />
          {cost.toFixed(1)}
        </span>
      </Reveal>

      <Reveal index={6}>
        <button
          type="button"
          disabled
          className="w-full rounded-xl bg-columbia py-3 text-sm font-bold text-primary-foreground shadow-[0_12px_24px_-11px_var(--columbia)]"
        >
          Place bet
        </button>
      </Reveal>
    </>
  )
}

function ConfettiCrowns() {
  return (
    <div className="pointer-events-none absolute inset-x-0 -top-2 flex justify-center gap-3" aria-hidden="true">
      {[0, 1, 2, 3, 4].map((i) => (
        <motion.span
          key={i}
          initial={{ opacity: 0, y: 16, scale: 0.5 }}
          animate={{ opacity: [0, 1, 1, 0], y: [16, -4, -20, -38], scale: [0.5, 0.85, 1, 1] }}
          transition={{ duration: 1.5, ease: 'easeOut', delay: i * 0.13, times: [0, 0.2, 0.8, 1] }}
        >
          <CrownIcon size={i % 2 === 0 ? 15 : 20} />
        </motion.span>
      ))}
    </div>
  )
}

function StepPayout({ yesPct }: { yesPct: number }) {
  const price = yesPct / 100
  const cost = 10 * price
  const profit = 10 - cost
  const [crowns, setCrowns] = useState(0)

  useEffect(() => {
    const controls = animate(0, 10, { duration: COUNT_DURATION, ease: easeOutBack, onUpdate: setCrowns })
    return () => controls.stop()
  }, [])

  return (
    <>
      <Reveal index={1} className="flex justify-center">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-positive-soft px-[13px] py-[5px] text-xs font-semibold text-success">
          ✓ Resolved YES
        </span>
      </Reveal>

      <Reveal index={2} className="relative flex flex-col items-center pt-2 text-center">
        <ConfettiCrowns />
        <span className="flex items-center gap-2 font-display font-numeric text-[58px] leading-none text-foreground">
          <CrownIcon size={38} />
          {Math.round(crowns)}
        </span>
        <span className="mt-1.5 text-[13px] font-medium text-muted-foreground">Crowns paid out</span>
      </Reveal>

      <Reveal index={3} className="text-center text-[13px] font-medium text-muted-foreground">
        10 winning shares × 1 Crown
      </Reveal>

      <Reveal index={4} className="flex justify-center gap-2.5">
        <span className="rounded-full bg-columbia-soft px-3.5 py-[7px] text-[13px] font-semibold text-columbia">
          Profit +{profit.toFixed(1)} Crowns
        </span>
        <span className="rounded-full bg-secondary px-3.5 py-[7px] text-[13px] font-semibold text-muted-foreground">
          Balance 34
        </span>
      </Reveal>
    </>
  )
}

type HowItWorksAnimatedProps = {
  question?: string
  yesPct?: number
  autoplay?: boolean
}

export default function HowItWorksAnimated({
  question = 'Will it snow before finals?',
  yesPct = 62,
  autoplay: autoplayDefault = true,
}: HowItWorksAnimatedProps) {
  const prefersReducedMotion = useReducedMotion()
  const [step, setStep] = useState(0)
  const [nonce, setNonce] = useState(0)
  const [autoplay, setAutoplay] = useState(autoplayDefault)
  const barValue = useMotionValue(0)
  const barWidth = useTransform(barValue, (v) => `${v}%`)

  const handleManualStep = useCallback((i: number) => {
    setAutoplay(false)
    setStep(i)
    setNonce((n) => n + 1)
  }, [])

  useEffect(() => {
    if (!autoplay || prefersReducedMotion) return
    const id = setInterval(() => {
      setStep((prev) => (prev + 1) % 3)
      setNonce((n) => n + 1)
    }, STEP_INTERVAL)
    return () => clearInterval(id)
  }, [autoplay, prefersReducedMotion])

  useEffect(() => {
    if (autoplay && !prefersReducedMotion) {
      barValue.set(0)
      const controls = animate(barValue, 100, { duration: STEP_INTERVAL / 1000, ease: 'linear' })
      return () => controls.stop()
    }
    const controls = animate(barValue, ((step + 1) / 3) * 100, { duration: 0.4, ease: 'easeOut' })
    return () => controls.stop()
  }, [step, autoplay, prefersReducedMotion, barValue])

  return (
    <MotionConfig reducedMotion="user">
      <section aria-labelledby="how-it-works-animated-title" className="bg-background px-8 pt-14 pb-18">
        <div className="mx-auto flex max-w-[1080px] flex-wrap items-center gap-13">
          {/* Left column */}
          <div className="min-w-[300px] flex-[1_1_380px]">
            <p className="mb-4 text-xs font-semibold uppercase tracking-[.18em] text-columbia">
              How it works
            </p>
            <h2
              id="how-it-works-animated-title"
              className="mb-4 text-balance font-display text-[42px] leading-[1.06] tracking-[-.015em] text-foreground"
            >
              From hunch to Crowns in three taps.
            </h2>
            <p className="mb-7 max-w-[400px] text-[15.5px] leading-relaxed text-muted-foreground">
              ButlerBets turns campus questions into play-money markets. Read the room, back your
              call, and cash in when you&apos;re right, all with Crowns, no real money.
            </p>

            <nav className="flex flex-col gap-1">
              {STEP_NAV.map((s, i) => (
                <button
                  key={s.title}
                  type="button"
                  onClick={() => handleManualStep(i)}
                  className="pressable flex items-start gap-3.5 rounded-2xl p-3 text-left transition-colors duration-300 hover:bg-muted/60"
                >
                  <span
                    className={`flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-[10px] text-[13px] font-semibold transition-all duration-300 ${
                      i === step
                        ? 'bg-columbia text-primary-foreground shadow-[0_8px_18px_-9px_var(--columbia)]'
                        : 'bg-muted text-ink-faint'
                    }`}
                  >
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <span>
                    <span
                      className={`block font-display text-[17px] transition-colors duration-300 ${
                        i === step ? 'text-foreground' : 'text-[#8A94A3]'
                      }`}
                    >
                      {s.title}
                    </span>
                    <span className="mt-0.5 block text-[12.5px] leading-tight text-ink-faint">
                      {s.subtitle}
                    </span>
                  </span>
                </button>
              ))}
            </nav>
          </div>

          {/* Right column — animated card */}
          <div className="w-full min-w-[300px] max-w-[400px] flex-[0_1_380px]">
            <div className="rounded-[22px] border border-border bg-card p-[22px] pb-5 shadow-[0_22px_46px_-26px_rgba(15,23,42,0.32)]">
              <div className="mb-[18px] h-[3px] overflow-hidden rounded-full bg-muted">
                <motion.div className="h-full rounded-full bg-columbia" style={{ width: barWidth }} />
              </div>

              <motion.div key={nonce} className="flex min-h-[236px] flex-col gap-3.5">
                <Reveal index={0}>
                  <h3 className="font-display text-xl text-foreground">{CARD_HEADING[step].title}</h3>
                  <p className="mt-[3px] text-[12.5px] text-muted-foreground">
                    {CARD_HEADING[step].subtitle}
                  </p>
                </Reveal>

                {step === 0 && <StepMarket question={question} yesPct={yesPct} />}
                {step === 1 && <StepTrade yesPct={yesPct} />}
                {step === 2 && <StepPayout yesPct={yesPct} />}
              </motion.div>

              <div className="mt-[18px] flex items-center">
                <div className="flex items-center gap-1.5">
                  {[0, 1, 2].map((i) => (
                    <span
                      key={i}
                      className={`h-[7px] rounded-full transition-all duration-300 ${
                        i === step ? 'w-[18px] bg-columbia' : 'w-[7px] bg-[#D5DBE3]'
                      }`}
                    />
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => handleManualStep((step + 1) % 3)}
                  className="pressable ml-auto text-[13px] font-semibold text-columbia"
                >
                  {step === 2 ? 'Restart ↻' : 'Next →'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </MotionConfig>
  )
}
