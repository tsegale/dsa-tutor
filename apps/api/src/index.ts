import 'dotenv/config'
import { execSync } from 'child_process'
import path from 'path'
import app from './app'

const PORT = parseInt(process.env.PORT ?? '3001', 10)

if (process.env.NODE_ENV === 'production') {
  try {
    // cwd must be apps/api (one level up from this compiled file's own
    // dist/ directory), not the workspace root - npx run from the root
    // can't resolve the pnpm-installed local `prisma` binary there and
    // falls back to downloading an unrelated, incompatible version from
    // the registry instead of using the one already installed.
    execSync('npx prisma migrate deploy', { stdio: 'inherit', cwd: path.resolve(__dirname, '..') })
    console.log('Prisma migrations applied.')
  } catch (err) {
    console.error('Migration failed:', err)
  }

  try {
    // seed.ts upserts every AlgorithmTopic keyed on its unique `name`, so
    // re-running this on every startup never duplicates rows or touches
    // student data - it only adds newly-registered algorithms and syncs
    // metadata (description, order, etc.) for existing ones.
    execSync('npx prisma db seed', { stdio: 'inherit', cwd: path.resolve(__dirname, '..') })
    console.log('Seed completed.')
  } catch (err) {
    console.error('Seed failed:', err)
  }
}

app.listen(PORT, () => {
  console.log(`API server running on http://localhost:${PORT}`)
})
