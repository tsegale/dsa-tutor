import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const email = process.env.EDUCATOR_EMAIL ?? 'educator@dsatutor.com'
  const password = process.env.EDUCATOR_PASSWORD ?? 'educator123'
  const name = process.env.EDUCATOR_NAME ?? 'Prof K Mufeti'

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    console.log(`Educator account already exists: ${email}`)
    return
  }

  const passwordHash = await bcrypt.hash(password, 12)
  await prisma.user.create({
    data: { email, passwordHash, name, role: 'EDUCATOR' },
  })
  console.log(`Educator account created: ${email} / ${password}`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
