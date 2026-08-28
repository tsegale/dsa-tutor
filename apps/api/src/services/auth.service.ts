import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { prisma } from '../lib/prisma'
import type { RegisterDto, LoginDto, AuthResponseDto } from '../dtos/auth.dto'

export async function register(dto: RegisterDto): Promise<AuthResponseDto> {
  const existing = await prisma.user.findUnique({ where: { email: dto.email } })
  if (existing) throw new Error('EMAIL_TAKEN')

  const passwordHash = await bcrypt.hash(dto.password, 12)
  const user = await prisma.user.create({
    data: {
      email: dto.email,
      passwordHash,
      name: dto.name,
      role: dto.role ?? 'STUDENT',
    },
  })

  const token = jwt.sign({ userId: user.id, role: user.role }, process.env.JWT_SECRET!, {
    expiresIn: process.env.JWT_EXPIRES_IN ?? '7d',
  } as jwt.SignOptions)

  return {
    token,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      xpTotal: user.xpTotal,
      streakCount: user.streakCount,
    },
  }
}

export async function updateStreak(userId: string): Promise<void> {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } })
  const today = new Date().toDateString()
  const lastActive = user.lastActiveDate?.toDateString()

  if (lastActive === today) return // already counted today

  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  const isConsecutive = lastActive === yesterday.toDateString()

  await prisma.user.update({
    where: { id: userId },
    data: {
      streakCount: isConsecutive ? { increment: 1 } : 1,
      lastActiveDate: new Date(),
    },
  })
}

export async function login(dto: LoginDto): Promise<AuthResponseDto> {
  const user = await prisma.user.findUnique({ where: { email: dto.email } })
  if (!user) throw new Error('INVALID_CREDENTIALS')

  const valid = await bcrypt.compare(dto.password, user.passwordHash)
  if (!valid) throw new Error('INVALID_CREDENTIALS')

  const token = jwt.sign({ userId: user.id, role: user.role }, process.env.JWT_SECRET!, {
    expiresIn: process.env.JWT_EXPIRES_IN ?? '7d',
  } as jwt.SignOptions)

  return {
    token,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      xpTotal: user.xpTotal,
      streakCount: user.streakCount,
    },
  }
}
