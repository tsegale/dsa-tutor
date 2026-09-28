import { describe, expect, it } from 'vitest'
import { hasFeynmanRubric } from './feynmanRubrics'
import { STUDY_TOPIC_SLUGS } from './misconceptionProbes'
import { getAlgorithmRegistryEntry } from '@/engine/registry'

describe('Feynman rubric coverage', () => {
  it('offers Feynman mode on every study topic, under the name the page sends', () => {
    for (const slug of STUDY_TOPIC_SLUGS) {
      const displayName = getAlgorithmRegistryEntry(slug)?.displayName
      expect(displayName, slug).toBeDefined()
      expect(hasFeynmanRubric(displayName!), `${slug} (${displayName})`).toBe(true)
    }
  })
})
