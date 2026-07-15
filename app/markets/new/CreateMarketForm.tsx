'use client'

import { useActionState, useRef, useState, useTransition } from 'react'
import { createMarket } from '@/app/actions/markets'
import { reviewMarketDraft, type ReviewResult } from '@/app/actions/reviewMarket'
import Alert from '@/app/components/ui/Alert'
import Card from '@/app/components/ui/Card'

const inputStyles = 'min-h-11 w-full rounded-lg border border-border bg-white px-3 text-sm text-foreground placeholder:text-muted-foreground/60 transition-colors focus:border-columbia focus:outline-none focus:ring-2 focus:ring-columbia/15'

const DESCRIPTION_EMPTY_MESSAGE = 'Describe exactly what counts as YES.'

type ReviewState = 'unreviewed' | 'reviewing' | 'needs_fix' | 'hard_block' | 'cleared'

export function CreateMarketForm() {
  const [error, action, isPending] = useActionState(createMarket, null)
  const formRef = useRef<HTMLFormElement>(null)
  // Synchronous gate for requestSubmit() re-entrancy: setReviewState('cleared') doesn't
  // commit before requestSubmit() re-fires onSubmit, so state can't be trusted there.
  const clearedForSubmitRef = useRef(false)
  const [isReviewing, startReview] = useTransition()

  const [question, setQuestion] = useState('')
  const [description, setDescription] = useState('')
  const [reviewState, setReviewState] = useState<ReviewState>('unreviewed')
  const [issues, setIssues] = useState<string[]>([])
  const [suggestion, setSuggestion] = useState<ReviewResult['suggestion']>(null)
  const [originalAtReview, setOriginalAtReview] = useState<{ question: string; description: string } | null>(null)

  function resetReviewOnEdit() {
    clearedForSubmitRef.current = false
    if (reviewState === 'needs_fix' || reviewState === 'hard_block' || reviewState === 'cleared') {
      setReviewState('unreviewed')
    }
  }

  function handleQuestionChange(e: React.ChangeEvent<HTMLInputElement>) {
    setQuestion(e.target.value)
    resetReviewOnEdit()
  }

  function handleDescriptionChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    e.target.setCustomValidity(e.target.value.trim() === '' ? DESCRIPTION_EMPTY_MESSAGE : '')
    setDescription(e.target.value)
    resetReviewOnEdit()
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    if (clearedForSubmitRef.current) {
      clearedForSubmitRef.current = false
      return // let the real submit through
    }

    e.preventDefault()
    setReviewState('reviewing')
    startReview(async () => {
      const result = await reviewMarketDraft(question, description)
      if (result.status === 'pass') {
        setReviewState('cleared')
        clearedForSubmitRef.current = true
        formRef.current?.requestSubmit()
      } else if (result.status === 'needs_fix') {
        setIssues(result.issues)
        setSuggestion(result.suggestion)
        setOriginalAtReview({ question, description })
        setReviewState('needs_fix')
      } else {
        setIssues(result.issues)
        setReviewState('hard_block')
      }
    })
  }

  function handleUseOriginal() {
    setReviewState('cleared')
    clearedForSubmitRef.current = true
    formRef.current?.requestSubmit()
  }

  function handleAcceptSuggestion() {
    if (suggestion?.question) setQuestion(suggestion.question)
    if (suggestion?.resolutionCriteria) setDescription(suggestion.resolutionCriteria)
    setReviewState('unreviewed')
  }

  const submitLabel = isPending
    ? 'Opening…'
    : reviewState === 'reviewing' || isReviewing
      ? 'Checking…'
      : reviewState === 'hard_block'
        ? 'Fix required'
        : 'Open market →'

  return (
    <form ref={formRef} action={action} onSubmit={handleSubmit} className="mt-6 space-y-5">
      {error && <Alert tone="danger" role="alert">{error}</Alert>}

      <div>
        <div className="mb-1.5 flex items-baseline justify-between gap-4">
          <label htmlFor="question" className="text-sm font-semibold text-foreground">Market question</label>
          <span className="text-xs font-semibold text-danger">Required</span>
        </div>
        <input
          id="question"
          name="question"
          type="text"
          required
          maxLength={200}
          value={question}
          onChange={handleQuestionChange}
          placeholder="Will the University Senate approve the proposal by May 1?"
          className={inputStyles}
        />
        <p className="mt-1.5 text-xs text-muted-foreground">Phrase it so the outcome can resolve unambiguously.</p>
      </div>

      <div>
        <div className="mb-1.5 flex items-baseline justify-between gap-4">
          <label htmlFor="description" className="text-sm font-semibold text-foreground">How will this resolve?</label>
          <span className="text-xs font-semibold text-danger">Required</span>
        </div>
        <p className="mb-1.5 text-xs text-muted-foreground">
          Describe exactly what counts as YES, so there&apos;s no argument later.
        </p>
        <textarea
          id="description"
          name="description"
          rows={4}
          required
          value={description}
          onChange={handleDescriptionChange}
          placeholder="Specify the source of truth and what counts as YES or NO."
          className={`${inputStyles} resize-y py-2.5 leading-6`}
        />
      </div>

      <div>
        <label htmlFor="closes_at" className="mb-1.5 block text-sm font-semibold text-foreground">Closing date</label>
        <input id="closes_at" name="closes_at" type="datetime-local" required className={`${inputStyles} font-numeric`} />
      </div>

      {reviewState === 'needs_fix' && originalAtReview && (
        <div className="space-y-3">
          <Alert tone="danger">
            <p className="mb-1 font-semibold">This draft needs a fix before it can go live:</p>
            <ul className="list-disc space-y-0.5 pl-4">
              {issues.map((issue, i) => <li key={i}>{issue}</li>)}
            </ul>
          </Alert>
          <div className="grid gap-3 sm:grid-cols-2">
            <Card padding="sm">
              <p className="font-display text-xs font-semibold uppercase tracking-wide text-muted-foreground">Your original</p>
              <p className="mt-2 text-sm font-medium text-foreground">{originalAtReview.question}</p>
              <p className="mt-2 text-xs leading-5 text-muted-foreground">{originalAtReview.description}</p>
            </Card>
            <Card padding="sm" className="border-columbia/30">
              <p className="font-display text-xs font-semibold uppercase tracking-wide text-columbia-deep">Suggested rewrite</p>
              <p className="mt-2 text-sm font-medium text-foreground">{suggestion?.question ?? originalAtReview.question}</p>
              <p className="mt-2 text-xs leading-5 text-muted-foreground">{suggestion?.resolutionCriteria ?? originalAtReview.description}</p>
            </Card>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleAcceptSuggestion}
              className="pressable rounded-lg bg-columbia px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-columbia-deep"
            >
              Accept suggestion
            </button>
            <button
              type="button"
              onClick={handleUseOriginal}
              className="pressable rounded-lg border border-border px-4 py-2 text-sm font-semibold text-foreground hover:bg-black/5"
            >
              Use my original anyway
            </button>
          </div>
        </div>
      )}

      {reviewState === 'hard_block' && (
        <div className="space-y-3">
          <Alert tone="danger">
            <p className="mb-1 font-semibold">This question can&apos;t be posted as written:</p>
            <ul className="list-disc space-y-0.5 pl-4">
              {issues.map((issue, i) => <li key={i}>{issue}</li>)}
            </ul>
          </Alert>
          <p className="text-xs text-muted-foreground">See the issues above &mdash; edit the question or resolution criteria to continue.</p>
        </div>
      )}

      <div className="flex items-center justify-between border-t border-border pt-5">
        <p className="text-xs text-muted-foreground">Opens at 50¢ YES / 50¢ NO.</p>
        <button
          type="submit"
          disabled={isPending || reviewState === 'reviewing' || isReviewing || reviewState === 'hard_block'}
          className="pressable rounded-lg bg-columbia px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-columbia-deep disabled:cursor-not-allowed disabled:bg-columbia/40 disabled:text-white/80"
        >
          {submitLabel}
        </button>
      </div>
    </form>
  )
}
