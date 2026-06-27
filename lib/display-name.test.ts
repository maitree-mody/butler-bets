import { describe, expect, it } from 'vitest'
import { displayNameFromEmail } from './display-name'

describe('displayNameFromEmail', () => {
  it('returns only the local part of an email address', () => {
    expect(displayNameFromEmail('jane.doe@barnard.edu')).toBe('jane.doe')
  })

  it('uses a privacy-safe fallback for a missing address', () => {
    expect(displayNameFromEmail(null)).toBe('anonymous')
  })
})
