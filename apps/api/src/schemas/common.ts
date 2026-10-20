import { z } from 'zod'

// Shared primitives for request schemas. Length caps are generous upper
// bounds on what the web client ever sends - they exist to reject garbage
// and oversized payloads, not to encode business rules.

export const id = z.string().trim().min(1).max(200)
export const shortText = z.string().max(200)
export const longText = z.string().max(20_000)

export const scaffoldingLevel = z.enum(['HIGH', 'MEDIUM', 'LOW', 'NONE'])
// Mirrors the Prisma Mode enum.
export const sessionMode = z.enum(['DEMO', 'PRACTICE', 'HANDS_ON', 'FEYNMAN', 'CODE', 'CHALLENGE', 'CLASSIC'])
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

// ------------------------------------------------------------ bounded JSON
//
// Code Mode grades whatever shape a challenge reads back out of the
// sandbox: an array for a sort, a number for an address computation, a
// boolean for a comparison, a matrix for a DP table, a dict for a pair of
// pointers. The field cannot be `z.array(z.number())` any more, but it must
// not become `z.unknown()` either - that value is interpolated into an AI
// prompt, so an unbounded blob is both a cost and an injection surface.
// express.json() caps the body at its 100kb default; this caps the shape.

const jsonScalar = z.union([z.string().max(2_000), z.number(), z.boolean(), z.null()])

function jsonAtDepth(depth: number): z.ZodType<unknown> {
  if (depth <= 0) return jsonScalar
  const inner = jsonAtDepth(depth - 1)
  return z.union([
    jsonScalar,
    z.array(inner).max(400),
    z
      .record(z.string().max(80), inner)
      .refine((value) => Object.keys(value).length <= 40, { message: 'Too many keys' }),
  ])
}

/**
 * A JSON value of any shape, bounded in depth, collection size and string
 * length. Deep enough for a matrix of pairs (4), which is the deepest shape
 * any challenge reads back.
 */
export const boundedJson = jsonAtDepth(4)

/** A named bag of those values: the globals a challenge handed the sandbox. */
export const boundedJsonRecord = z
  .record(z.string().trim().min(1).max(80), boundedJson)
  .refine((value) => Object.keys(value).length <= 40, { message: 'Too many keys' })
