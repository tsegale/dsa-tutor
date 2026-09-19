import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { ITEM_BANK } from '../data/assessmentItemBank'

// The independent outcome measure is only valid if the tutor never sees or
// reacts to its exact wording. This walks every file the AI service could
// load a prompt from and fails if any assessment stem or option string
// appears verbatim in it.
const PROMPTS_DIR = join(__dirname, '../../../ai/prompts')

function collectPromptFileContents(dir: string): string {
  return readdirSync(dir, { withFileTypes: true })
    .flatMap((entry) => {
      if (entry.name === '__pycache__') return []
      const fullPath = join(dir, entry.name)
      if (entry.isDirectory()) return [collectPromptFileContents(fullPath)]
      return [readFileSync(fullPath, 'utf-8')]
    })
    .join('\n')
}

describe('assessment item bank is not contaminated into AI prompts', () => {
  const promptsText = collectPromptFileContents(PROMPTS_DIR)

  for (const bank of ITEM_BANK) {
    for (const item of bank.items) {
      it(`stem for ${bank.topicSlug}/${item.conceptTag} does not appear in apps/ai/prompts`, () => {
        expect(promptsText.includes(item.stem)).toBe(false)
      })

      // Short/generic option text (bare numbers like "0" or "-1") would
      // false-positive against any prompt file that happens to contain
      // that digit for unrelated reasons - only substantial phrases are a
      // meaningful signal of real contamination.
      for (const option of item.options ?? []) {
        if (option.text.length < 8) continue
        it(`option "${option.text}" for ${bank.topicSlug}/${item.conceptTag} does not appear in apps/ai/prompts`, () => {
          expect(promptsText.includes(option.text)).toBe(false)
        })
      }
    }
  }
})
