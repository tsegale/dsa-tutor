import { z } from 'zod'

// Shared primitives for request schemas. Length caps are generous upper
// bounds on what the web client ever sends - they exist to reject garbage
// and oversized payloads, not to encode business rules.

export const id = z.string().trim().min(1).max(200)
export const shortText = z.string().max(200)
export const longText = z.string().max(20_000)

export const scaffoldingLevel = z.enum(['HIGH', 'MEDIUM', 'LOW', 'NONE'])
// Mirrors the Prisma Mode enum.
export const sessionMode = z.enum(['DEMO', 'PRACTICE', 'HANDS_ON', 'FEYNMAN', 'CODE', 'CHALLENGE'])
export const junctionDifficulty = z.enum(['CONCEPTUAL', 'PROCEDURAL'])

// Categories and junction types stay open strings: packages/types owns
// those lists and they grow with every algorithm added, so a closed enum
// here would silently 400 every new one (the same trap the AI service's
// request model documents for junction_type).
export const category = z.string().trim().min(1).max(100)

export const nonNegativeInt = z.int().min(0)

/** A "true"/"false" query flag, as sent in a URL. */
export const queryFlag = z.enum(['true', 'false'])

/** A required JSON value of any shape (rejects a missing field). */
export const requiredJson = z.unknown().refine((value) => value !== undefined, { message: 'Required' })
