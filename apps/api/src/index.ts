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
}

app.listen(PORT, () => {
  console.log(`API server running on http://localhost:${PORT}`)
})
