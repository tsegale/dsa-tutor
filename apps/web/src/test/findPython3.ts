import { execFileSync } from 'child_process'
import path from 'path'

export function findPython3(): string | null {
  const candidates = [
    'python3',
    path.resolve(__dirname, '../../../ai/.venv/Scripts/python.exe'),
    path.resolve(__dirname, '../../../ai/.venv/bin/python'),
    'python',
  ]
  for (const bin of candidates) {
    try {
      const major = execFileSync(bin, ['-c', 'import sys; print(sys.version_info[0])'], {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'ignore'],
      }).trim()
      if (major === '3') return bin
    } catch {
      // try next candidate
    }
  }
  return null
}
