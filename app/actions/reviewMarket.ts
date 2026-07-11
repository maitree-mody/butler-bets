'use server'

import { GoogleGenerativeAI, SchemaType, type Schema } from '@google/generative-ai'

// Flip to false to fail closed (block market creation) if the Gemini call errors out.
const FAIL_OPEN_ON_REVIEW_ERROR = true

const GEMINI_MODEL = process.env.GEMINI_MODEL ?? 'gemini-flash-lite-latest'
const REQUEST_TIMEOUT_MS = 15000

export type ReviewResult = {
  status: 'pass' | 'needs_fix' | 'hard_block'
  issues: string[]
  suggestion: { question: string | null; resolutionCriteria: string | null } | null
}

const FAIL_OPEN_RESULT: ReviewResult = { status: 'pass', issues: [], suggestion: null }

const responseSchema: Schema = {
  type: SchemaType.OBJECT,
  properties: {
    status: {
      type: SchemaType.STRING,
      format: 'enum',
      enum: ['pass', 'needs_fix', 'hard_block'],
    },
    issues: {
      type: SchemaType.ARRAY,
      items: { type: SchemaType.STRING },
    },
    suggestion: {
      type: SchemaType.OBJECT,
      nullable: true,
      properties: {
        question: { type: SchemaType.STRING, nullable: true },
        resolutionCriteria: { type: SchemaType.STRING, nullable: true },
      },
      required: ['question', 'resolutionCriteria'],
    },
  },
  required: ['status', 'issues', 'suggestion'],
}

const SYSTEM_PROMPT = `You are a quality reviewer for Butler Bets (Syna), a play-money prediction market for Columbia/Barnard students. Students submit draft markets (a yes/no question plus resolution criteria). Your job is ONLY to catch drafts that can't actually be resolved fairly, or that cross into abuse — not to enforce good taste or formality.

Campus gossip-style questions about specific named people are the platform's normal, intended use case. Do NOT flag or rewrite a question merely for being silly, informal, casual, or about a specific named individual. Only flag genuine problems.

Evaluate the QUESTION against:
- Resolves to a clear yes/no outcome, not open-ended or a matter of opinion.
- Time-bound: has an actual deadline or timeframe context (either in the question itself or implied by the resolution criteria).
- About a real, checkable event — not a private/unverifiable fact known only to specific individuals (e.g. "will X text me back").
- Not harassment, illegal activity, self-harm, hate speech, or maliciously targeting a private individual.

Evaluate the RESOLUTION CRITERIA against:
- Names a clear source of truth (who or what determines the answer).
- Defines exactly what counts as YES vs NO, including edge cases.
- Is checkable by someone other than the market creator.
- Doesn't leave a plausible ambiguous or tied outcome.

Decide a status:
- "pass": no material issues. "issues" is an empty array, "suggestion" is null.
- "needs_fix": fixable ambiguity or missing specificity (e.g. no source of truth, no deadline, vague edge cases). List each concrete issue in "issues". "suggestion" MUST be populated with a rewritten question and resolution criteria that preserve the user's original intent, subject, and tone, adding only the missing specificity (e.g. a source of truth, a measurable threshold, a deadline). Do not genericize or sanitize the tone or subject beyond what's needed to fix the listed issues.
- "hard_block": harassment, illegal activity, self-harm, hate speech, malicious targeting of a private individual, or an outcome that is fundamentally unresolvable/unverifiable by anyone but the creator. List the reasons in "issues". "suggestion" MUST be null — do not offer a rewrite for these.

Respond with JSON matching the required schema exactly.`

function buildPrompt(question: string, resolutionCriteria: string): string {
  return `${SYSTEM_PROMPT}\n\nDraft question:\n"""${question}"""\n\nDraft resolution criteria:\n"""${resolutionCriteria}"""`
}

export async function reviewMarketDraft(
  question: string,
  resolutionCriteria: string,
): Promise<ReviewResult> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    console.error('reviewMarketDraft: GEMINI_API_KEY is not set')
    return FAIL_OPEN_RESULT
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({
      model: GEMINI_MODEL,
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema,
      },
    })

    const result = await model.generateContent(buildPrompt(question, resolutionCriteria), {
      timeout: REQUEST_TIMEOUT_MS,
    })

    const parsed = JSON.parse(result.response.text()) as ReviewResult

    if (parsed.status !== 'pass' && parsed.status !== 'needs_fix' && parsed.status !== 'hard_block') {
      throw new Error(`Unexpected status from Gemini: ${parsed.status}`)
    }

    return parsed
  } catch (err) {
    console.error('reviewMarketDraft: Gemini review failed, failing open', err)
    if (FAIL_OPEN_ON_REVIEW_ERROR) return FAIL_OPEN_RESULT
    throw err
  }
}
