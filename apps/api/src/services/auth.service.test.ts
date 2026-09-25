import { describe, it, expect, vi, beforeEach } from 'vitest'
import { register } from './auth.service'
import type { RegisterDto } from '../dtos/auth.dto'

vi.mock('../lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
  },
}))

process.env.JWT_SECRET = 'test-secret'

describe('register', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('always creates a STUDENT, even if a role field is smuggled into the DTO', async () => {
    const { prisma } = await import('../lib/prisma')
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null)
    vi.mocked(prisma.user.create).mockResolvedValue({
      id: '1',
      email: 'a@b.com',
      name: 'A',
      role: 'STUDENT',
      xpTotal: 0,
      streakCount: 0,
      passwordHash: 'hash',
      lastActiveDate: null,
    } as never)

    // RegisterDto has no `role` field, so this cast simulates a raw HTTP
    // body that bypassed the route's validate() schema and still carries one.
    const smuggledBody = { email: 'a@b.com', password: 'hunter2!', name: 'A', role: 'EDUCATOR' } as unknown as RegisterDto

    await register(smuggledBody)

    expect(prisma.user.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ role: 'STUDENT' }) }),
    )
  })
})
