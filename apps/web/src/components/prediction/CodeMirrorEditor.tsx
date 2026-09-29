import { useEffect, useRef } from 'react'
import { EditorState } from '@codemirror/state'
import { EditorView, keymap, lineNumbers, highlightActiveLine, highlightActiveLineGutter, drawSelection } from '@codemirror/view'
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands'
import { HighlightStyle, bracketMatching, indentOnInput, indentUnit, syntaxHighlighting } from '@codemirror/language'
import { python } from '@codemirror/lang-python'
import { tags } from '@lezer/highlight'

// Code Mode editor (Week 4, 4A.2): CodeMirror 6 behind the same controlled
// value/onChange contract the <textarea> had, so the submission path
// (Pyodide run, then /code-eval) is untouched. Python only: submissions
// are executed, and only Python can be (see CodeEditorInput).

interface CodeMirrorEditorProps {
  value: string
  onChange: (value: string) => void
  invalid?: boolean
  ariaLabel: string
}

// The editor keeps the existing dark code surface in both app themes;
// accents come from the app's tokens.
const theme = EditorView.theme(
  {
    '&': {
      height: '100%',
      backgroundColor: 'var(--code-bg)',
      color: 'var(--code-fg)',
      fontSize: '14px',
    },
    '.cm-scroller': { fontFamily: 'var(--font-mono, ui-monospace, monospace)', lineHeight: '1.7' },
    '.cm-content': { padding: '8px 0', caretColor: 'var(--code-fg)' },
    '.cm-gutters': { backgroundColor: 'var(--code-bg)', color: 'var(--code-gutter)', border: 'none', paddingLeft: '4px' },
    '.cm-activeLineGutter': { backgroundColor: 'transparent', color: 'var(--code-gutter-active)' },
    '.cm-activeLine': { backgroundColor: 'rgba(148, 163, 184, 0.08)' },
    '.cm-cursor, .cm-dropCursor': { borderLeftColor: 'var(--code-fg)' },
    '&.cm-focused .cm-selectionBackground, .cm-selectionBackground, ::selection': {
      backgroundColor: 'color-mix(in srgb, var(--color-primary) 45%, transparent)',
    },
    '&.cm-focused .cm-matchingBracket': { backgroundColor: 'rgba(148, 163, 184, 0.25)', outline: '1px solid var(--code-muted)' },
    // Same ring as the global focus-visible rule (index.css).
    '&.cm-focused': { outline: '2px solid var(--color-primary)', outlineOffset: '2px' },
  },
  { dark: true },
)

// Colours are the --code-* tokens in index.css.
const highlight = HighlightStyle.define([
  { tag: [tags.keyword, tags.controlKeyword, tags.operatorKeyword, tags.definitionKeyword], color: 'var(--code-keyword)' },
  { tag: [tags.number, tags.bool, tags.null], color: 'var(--code-number)' },
  { tag: [tags.string], color: 'var(--code-string)' },
  { tag: [tags.comment], color: 'var(--code-muted)', fontStyle: 'italic' },
  { tag: [tags.function(tags.variableName), tags.function(tags.propertyName)], color: 'var(--code-function)' },
  { tag: [tags.operator, tags.bracket, tags.punctuation], color: 'var(--code-gutter-active)' },
])

export default function CodeMirrorEditor({ value, onChange, invalid = false, ariaLabel }: CodeMirrorEditorProps) {
  const hostRef = useRef<HTMLDivElement>(null)
  const viewRef = useRef<EditorView | null>(null)
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange

  useEffect(() => {
    if (!hostRef.current) return
    const view = new EditorView({
      parent: hostRef.current,
      state: EditorState.create({
        doc: value,
        extensions: [
          lineNumbers(),
          highlightActiveLineGutter(),
          highlightActiveLine(),
          drawSelection(),
          history(),
          indentOnInput(),
          bracketMatching(),
          python(),
          syntaxHighlighting(highlight),
          EditorState.tabSize.of(4),
          indentUnit.of('    '),
          // Tab indents; Escape then Tab leaves the editor (CodeMirror's
          // own escape hatch), so keyboard users are never trapped.
          keymap.of([...defaultKeymap, ...historyKeymap, indentWithTab]),
          EditorView.contentAttributes.of({ 'aria-label': ariaLabel, spellcheck: 'false' }),
          EditorView.updateListener.of((update) => {
            if (update.docChanged) onChangeRef.current(update.state.doc.toString())
          }),
          theme,
        ],
      }),
    })
    viewRef.current = view
    return () => {
      view.destroy()
      viewRef.current = null
    }
    // Created once; later value changes are synced by the effect below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Controlled: an outside change to `value` replaces the document.
  useEffect(() => {
    const view = viewRef.current
    if (!view) return
    const current = view.state.doc.toString()
    if (current !== value) view.dispatch({ changes: { from: 0, to: current.length, insert: value } })
  }, [value])

  return (
    <div
      ref={hostRef}
      className={`min-h-0 flex-1 overflow-hidden rounded-md border ${invalid ? 'border-error' : 'border-border'}`}
    />
  )
}
