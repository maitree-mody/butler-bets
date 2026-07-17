import type { ReactNode } from 'react'

const URL_PATTERN = /(https?:\/\/[^\s]+)/g
const TRAILING_PUNCTUATION = /[.,;:!?)\]}'"]+$/

/**
 * Converts bare URLs in plain comment text into clickable links. Every
 * piece stays a plain string or a React element (never dangerouslySetInnerHTML),
 * so this can't be used to inject markup — only recognized URLs become <a>
 * tags, everything else passes through untouched.
 */
export function linkifyText(text: string): ReactNode[] {
  const parts = text.split(URL_PATTERN)
  return parts.map((part, i) => {
    if (!/^https?:\/\//.test(part)) return part

    // Strip common trailing punctuation a URL picked up from sentence
    // context (e.g. "see https://example.com." shouldn't link the period).
    const trailingMatch = part.match(TRAILING_PUNCTUATION)
    const trailing = trailingMatch ? trailingMatch[0] : ''
    const url = trailing ? part.slice(0, -trailing.length) : part

    return (
      <span key={i}>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="break-all text-columbia underline underline-offset-2 hover:text-columbia-deep"
        >
          {url}
        </a>
        {trailing}
      </span>
    )
  })
}
