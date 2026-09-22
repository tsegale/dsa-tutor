import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const email = process.env.EDUCATOR_EMAIL
  const password = process.env.EDUCATOR_PASSWORD
  const name = process.env.EDUCATOR_NAME ?? 'Prof K Mufeti'

  if (!email || !password) {
    console.error('EDUCATOR_EMAIL and EDUCATOR_PASSWORD must both be set. No account created.')
    process.exitCode = 1
    return
  }

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    console.log(`Educator account already exists: ${email}`)
    return
  }

  const passwordHash = await bcrypt.hash(password, 12)
  await prisma.user.create({
    data: { email, passwordHash, name, role: 'EDUCATOR' },
  })
  console.log(`Educator account created: ${email}`)
}

main()
  .catch((err) => {
    console.error(err)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
