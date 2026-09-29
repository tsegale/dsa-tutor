import { beforeEach, describe, expect, it, vi } from 'vitest'
import { importMisconceptionRatings, RatingsImportError } from './research.service'

const { db } = vi.hoisted(() => ({
  db: {
    interaction: { findMany: vi.fn() },
    misconceptionRating: { upsert: vi.fn((args: unknown) => args) },
    $transaction: vi.fn(async (ops: unknown[]) => ops),
  },
}))
vi.mock('../lib/prisma', () => ({ prisma: db }))

beforeEach(() => {
  vi.clearAllMocks()
  // i1 and i2 are incorrect interactions; anything else is unknown.
  db.interaction.findMany.mockResolvedValue([{ id: 'i1' }, { id: 'i2' }])
})

async function problems(csv: string): Promise<string[]> {
  try {
    await importMisconceptionRatings(csv)
    return []
  } catch (err) {
    if (err instanceof RatingsImportError) return err.problems
    throw err
  }
}

describe('ratings import (3D)', () => {
  it('imports a clean file in one transaction, ignoring extra context columns', async () => {
    const csv = 'interactionId,algorithm,raterCode,label\ni1,Bubble Sort,R1,order_of_operations\ni2,Bubble Sort,R1,NONE'
    expect(await importMisconceptionRatings(csv)).toEqual({ imported: 2 })
    expect(db.$transaction).toHaveBeenCalledOnce()
    expect(db.misconceptionRating.upsert.mock.calls[0][0]).toMatchObject({
      create: { interactionId: 'i1', raterCode: 'R1', label: 'ORDER_OF_OPERATIONS' },
    })
  })

  it('rejects unknown interaction ids and writes nothing', async () => {
    const found = await problems('interactionId,raterCode,label\ni1,R1,NONE\nzzz,R1,NONE')
    expect(found).toEqual(['Line 3: zzz is not a known incorrect interaction'])
    expect(db.$transaction).not.toHaveBeenCalled()
  })

  it('rejects labels outside the taxonomy', async () => {
    expect(await problems('interactionId,raterCode,label\ni1,R1,CONFUSED')).toEqual(['Line 2: "CONFUSED" is not in the taxonomy'])
  })

  it('rejects missing fields and a rater labelling the same interaction twice', async () => {
    const found = await problems('interactionId,raterCode,label\ni1,,NONE\ni2,R1,NONE\ni2,R1,OFF_BY_ONE')
    expect(found).toEqual([
      'Line 2: interactionId, raterCode and label are all required',
      'Line 4: R1 rated i2 twice',
    ])
  })
})
