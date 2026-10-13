import { beforeEach, describe, expect, it, vi } from 'vitest'
import bcrypt from 'bcryptjs'
import { deleteAccount } from './account.service'

const { findUnique, transaction, model } = vi.hoisted(() => ({
  findUnique: vi.fn(),
  transaction: vi.fn(),
  model: () => ({ deleteMany: vi.fn(() => 'deleteMany'), delete: vi.fn(() => 'delete') }),
}))
vi.mock('../lib/prisma', () => ({
  prisma: {
    user: { findUnique, delete: vi.fn(() => 'delete user') },
    $transaction: transaction,
    misconceptionRating: model(),
    interaction: model(),
    session: model(),
    remediation: model(),
    misconceptionProbe: model(),
    misconceptionEvent: model(),
    assessmentResponse: model(),
    assessmentAttempt: model(),
    userBadge: model(),
    topicMastery: model(),
  },
}))

const account = async (overrides: Record<string, unknown> = {}) => ({ passwordHash: await bcrypt.hash('right-password', 4), role: 'STUDENT', isDemo: false, ...overrides })

describe('deleteAccount', () => {
  beforeEach(() => vi.clearAllMocks())

  it('deletes everything recorded for the account, the user last, in one transaction', async () => {
    findUnique.mockResolvedValue(await account())
    await deleteAccount('u1', 'right-password')
    expect(transaction).toHaveBeenCalledOnce()
    const steps = transaction.mock.calls[0][0] as unknown[]
    expect(steps).toHaveLength(11)
    expect(steps[steps.length - 1]).toBe('delete user')
  })

  it('refuses a wrong password without deleting anything', async () => {
    findUnique.mockResolvedValue(await account())
    await expect(deleteAccount('u1', 'guess')).rejects.toThrow('INVALID_CREDENTIALS')
    expect(transaction).not.toHaveBeenCalled()
  })

  it('refuses educator and demo accounts', async () => {
    findUnique.mockResolvedValue(await account({ role: 'EDUCATOR' }))
    await expect(deleteAccount('e1', 'right-password')).rejects.toThrow('EDUCATOR_ACCOUNT')
    findUnique.mockResolvedValue(await account({ isDemo: true }))
    await expect(deleteAccount('d1', 'right-password')).rejects.toThrow('DEMO_ACCOUNT')
    expect(transaction).not.toHaveBeenCalled()
  })
})
