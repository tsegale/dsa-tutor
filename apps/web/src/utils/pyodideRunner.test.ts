import { describe, expect, it } from 'vitest'
import pyodidePackage from 'pyodide/package.json?raw'
import { PYODIDE_INDEX_URL } from './pyodideRunner'

describe('Pyodide asset URL', () => {
  it('points at the installed package version, at the package root where its runtime files live', () => {
    const { version } = JSON.parse(pyodidePackage) as { version: string }
    // The npm mirror has no /full/ directory; that path 404ed every run.
    expect(PYODIDE_INDEX_URL).toBe(`https://cdn.jsdelivr.net/npm/pyodide@${version}/`)
  })
})
