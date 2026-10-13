import { describe, it, expect, vi, beforeEach } from 'vitest'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { login, register } from './auth.service'
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

describe('login', () => {
  const account = async (isDemo: boolean) => ({
    id: 'u1',
    email: 'learner@example.test',
    name: 'Learner',
    role: 'STUDENT',
    xpTotal: 0,
    streakCount: 0,
    passwordHash: await bcrypt.hash('right-password', 4),
    lastActiveDate: null,
    isDemo,
  })

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('keeps the demo claim for a seeded demo account, so its AI calls stay capped', async () => {
    const { prisma } = await import('../lib/prisma')
    vi.mocked(prisma.user.findUnique).mockResolvedValue((await account(true)) as never)
    const { token } = await login({ email: 'learner@example.test', password: 'right-password' })
    expect(jwt.verify(token, 'test-secret')).toMatchObject({ userId: 'u1', demo: true })
  })

  it('issues no demo claim for an ordinary account', async () => {
    const { prisma } = await import('../lib/prisma')
    vi.mocked(prisma.user.findUnique).mockResolvedValue((await account(false)) as never)
    const { token } = await login({ email: 'learner@example.test', password: 'right-password' })
    expect(jwt.verify(token, 'test-secret')).not.toHaveProperty('demo')
  })
})
