import { useState } from 'react'
import type { ReactNode } from 'react'
import { Difficulty } from '@dsa-tutor/types'
import { toast } from 'sonner'
import { useResolveColour } from '@/components/canvas/useResolveColour'
import { Button } from '@/components/ui/button'
import { IconButton } from '@/components/ui/IconButton'
import { Input, Select, Textarea } from '@/components/ui/Input'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Panel } from '@/components/ui/Panel'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Pill } from '@/components/ui/Pill'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { Modal } from '@/components/ui/Modal'
import { Progress, ProgressRing } from '@/components/ui/progress'
import { Skeleton, SkeletonCanvas, SkeletonCard, SkeletonText } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { ErrorState } from '@/components/ui/ErrorState'
import { Kbd } from '@/components/ui/Kbd'
import MasteryRing from '@/components/ui/MasteryRing'
import DifficultyTag from '@/components/ui/DifficultyTag'
import ThemeToggle from '@/components/ui/ThemeToggle'
import ModeToggle from '@/components/ui/ModeToggle'
import ScaffoldingBadge from '@/components/ui/ScaffoldingBadge'

// The living style guide (Design Phase 1E): every primitive, variant and
// state, the type scale, colour tokens, elevation and the canvas state
// palette. Toggle the theme in the header to review both. Swatch values are
// read from the live CSS, so this page cannot drift from index.css.

const TYPE_SCALE: { token: string; spec: string; className: string; sample: string }[] = [
  { token: 'display', spec: '40/44 600 -0.02em', className: 'text-display', sample: 'Watch the algorithm think' },
  { token: 'h1', spec: '30/36 600 -0.015em', className: 'text-h1', sample: 'Bubble sort' },
  { token: 'h2', spec: '22/28 600 -0.01em', className: 'text-h2', sample: 'Predict the next step' },
  { token: 'h3', spec: '17/24 600', className: 'text-h3', sample: 'Sorting track' },
  { token: 'body', spec: '15/24 400', className: 'text-body', sample: 'Compare adjacent elements and swap them when they are out of order.' },
  { token: 'small', spec: '13/20 400', className: 'text-small', sample: 'Last practised two days ago' },
  { token: 'micro', spec: '12/16 500 0.01em', className: 'text-micro', sample: 'Custom array' },
  { token: 'mono-lg', spec: '18/24 500 mono', className: 'text-mono-lg', sample: '[5, 3, 8, 1, 9]' },
  { token: 'mono', spec: '14/20 400 mono', className: 'text-mono', sample: 'if a[j] > a[j + 1]: swap(j, j + 1)' },
  { token: 'mono-sm', spec: '12/16 500 mono', className: 'text-mono-sm', sample: 'step 14 / 42  O(n log n)  87%' },
]

// Full class names, not built from the token: Tailwind only generates
// utilities it can find written out in the source.
const BASE_TOKENS: { token: string; className: string }[] = [
  { token: 'paper', className: 'bg-paper' },
  { token: 'surface', className: 'bg-surface' },
  { token: 'surface-sunk', className: 'bg-surface-sunk' },
  { token: 'ink', className: 'bg-ink' },
  { token: 'ink-2', className: 'bg-ink-2' },
  { token: 'ink-3', className: 'bg-ink-3' },
  { token: 'rule', className: 'bg-rule' },
  { token: 'rule-strong', className: 'bg-rule-strong' },
  { token: 'brand', className: 'bg-brand' },
  { token: 'brand-hover', className: 'bg-brand-hover' },
  { token: 'brand-soft', className: 'bg-brand-soft' },
]
// error is a fill only; error-text is the one that carries a label.
const STATE_TOKENS: { state: string; className: string; label?: boolean }[] = [
  { state: 'neutral', className: 'bg-state-neutral text-state-neutral-ink', label: true },
  { state: 'compare', className: 'bg-state-compare text-state-compare-ink', label: true },
  { state: 'swap', className: 'bg-state-swap text-state-swap-ink', label: true },
  { state: 'sorted', className: 'bg-state-sorted text-state-sorted-ink', label: true },
  { state: 'current', className: 'bg-state-current text-state-current-ink', label: true },
  { state: 'error', className: 'bg-state-error' },
  { state: 'error-text', className: 'bg-state-error-text text-state-error-ink', label: true },
]
const ELEVATION = [
  { token: 'e1', className: 'shadow-e1', use: 'cards' },
  { token: 'e2', className: 'shadow-e2', use: 'tooltips, toasts, hover' },
  { token: 'e3', className: 'shadow-e3', use: 'modals' },
]
const RADII = [
  { token: 'sm 6', className: 'rounded-sm', use: 'controls, inputs' },
  { token: 'md 10', className: 'rounded-md', use: 'cards, panels' },
  { token: 'lg 14', className: 'rounded-lg', use: 'modals' },
  { token: 'full', className: 'rounded-full', use: 'pills, avatars' },
]
const SPACE = [4, 8, 12, 16, 24, 32, 48, 64, 96]
const SPACE_WIDTH: Record<number, string> = {
  4: 'w-1', 8: 'w-2', 12: 'w-3', 16: 'w-4', 24: 'w-6', 32: 'w-8', 48: 'w-12', 64: 'w-16', 96: 'w-24',
}

function Section({ id, title, description, children }: { id: string; title: string; description?: string; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className="flex flex-col gap-4 border-t border-rule pt-8">
      <div className="flex flex-col gap-1">
        <h2 id={id} className="text-h2 text-ink">{title}</h2>
        {description && <p className="max-w-prose text-small text-ink-2">{description}</p>}
      </div>
      {children}
    </section>
  )
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-6">
      <span className="w-28 shrink-0 text-micro text-ink-2">{label}</span>
      <div className="flex flex-wrap items-center gap-3">{children}</div>
    </div>
  )
}

function Swatch({ token, className, value }: { token: string; className: string; value: string }) {
  return (
    <div className="flex items-center gap-3 rounded-md border border-rule bg-surface p-2">
      <span className={`size-10 shrink-0 rounded-sm border border-rule ${className}`} aria-hidden="true" />
      <div className="min-w-0">
        <p className="truncate text-micro text-ink">--{token}</p>
        <p className="text-mono-sm text-ink-2">{value}</p>
      </div>
    </div>
  )
}

function PlusIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

function StepIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="m6 4 4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function InboxIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M3 11h4l1 2h4l1-2h4M4.5 4h11L17 11v5H3v-5L4.5 4Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  )
}

export default function Showcase() {
  const resolve = useResolveColour()
  const [modalOpen, setModalOpen] = useState(false)
  const [retrying, setRetrying] = useState(false)
  const [loading, setLoading] = useState(false)

  const pulse = (set: (v: boolean) => void) => {
    set(true)
    window.setTimeout(() => set(false), 1500)
  }

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-10 px-4 py-8 sm:px-gutter">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-2">
          <h1 className="text-display text-ink">Design system</h1>
          <p className="max-w-prose text-body text-ink-2">
            Mono is data, sans is interface. Brand means you can interact with something, and never appears inside a
            canvas.
          </p>
        </div>
        <ThemeToggle />
      </header>

      <Section id="type" title="Type scale" description="IBM Plex Sans and IBM Plex Mono. Every size on the page comes from these ten tokens.">
        <div className="flex flex-col divide-y divide-rule rounded-md border border-rule bg-surface">
          {TYPE_SCALE.map((row) => (
            <div key={row.token} className="flex flex-col gap-1 px-card py-row sm:flex-row sm:items-baseline sm:gap-6">
              <div className="flex w-40 shrink-0 flex-col">
                <span className="text-micro text-ink">{row.token}</span>
                <span className="text-mono-sm text-ink-3">{row.spec}</span>
              </div>
              <span className={`${row.className} min-w-0 break-words text-ink`}>{row.sample}</span>
            </div>
          ))}
        </div>
      </Section>

      <Section id="colour" title="Colour" description="Interface tokens. Values are the active theme's, read from the live CSS.">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {BASE_TOKENS.map(({ token, className }) => (
            <Swatch key={token} token={token} className={className} value={resolve(`var(--${token})`)} />
          ))}
        </div>
      </Section>

      <Section
        id="canvas-states"
        title="Canvas states"
        description="Used only inside visualisations. Every fill clears 3:1 against the surface. Fills that carry a value pair with their own text colour; error is a mark only, and error-text carries labels."
      >
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
          {STATE_TOKENS.map(({ state, className, label }) => (
            <div key={state} className="flex flex-col gap-2">
              <div className={`flex h-14 items-center justify-center rounded-sm text-mono-lg ${className}`}>
                {label ? '42' : null}
              </div>
              <div>
                <p className="text-micro text-ink">{state}</p>
                <p className="text-mono-sm text-ink-2">{resolve(`var(--state-${state})`)}</p>
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section id="elevation" title="Elevation and radius" description="Dark mode adds a top hairline to each shadow so surfaces still separate.">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {ELEVATION.map((e) => (
            <div key={e.token} className={`flex h-24 flex-col justify-end rounded-md border border-rule bg-surface p-card ${e.className}`}>
              <p className="text-mono-sm text-ink">{e.token}</p>
              <p className="text-micro text-ink-2">{e.use}</p>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {RADII.map((r) => (
            <div key={r.token} className="flex flex-col gap-2">
              <div className={`h-16 border border-rule-strong bg-surface-sunk ${r.className}`} />
              <p className="text-mono-sm text-ink">{r.token}</p>
              <p className="text-micro text-ink-2">{r.use}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section id="space" title="Space" description="4px base. Page gutter 32, panel padding 20, card padding 16, list rows 12.">
        <div className="flex flex-col gap-2">
          {SPACE.map((n) => (
            <div key={n} className="flex items-center gap-3">
              <span className="w-8 text-right text-mono-sm text-ink-2">{n}</span>
              <span className={`h-3 rounded-sm bg-brand-soft ${SPACE_WIDTH[n]}`} />
            </div>
          ))}
        </div>
      </Section>

      <Section id="buttons" title="Buttons" description="Hover lifts one pixel. Disabled uses colour, not opacity. Loading holds the width.">
        <div className="flex flex-col gap-4">
          {(['primary', 'secondary', 'ghost', 'danger'] as const).map((variant) => (
            <Row key={variant} label={variant}>
              <Button variant={variant} size="sm">Small</Button>
              <Button variant={variant}>Medium</Button>
              <Button variant={variant}>
                <StepIcon />
                With icon
              </Button>
              <Button variant={variant} disabled>Disabled</Button>
              <Button variant={variant} loading>Loading</Button>
            </Row>
          ))}
          <Row label="loading demo">
            <Button loading={loading} onClick={() => pulse(setLoading)}>
              Save progress
            </Button>
          </Row>
          <Row label="icon button">
            <IconButton aria-label="Add element">
              <PlusIcon />
            </IconButton>
            <IconButton aria-label="Next step" variant="secondary">
              <StepIcon />
            </IconButton>
            <IconButton aria-label="Add element" variant="primary">
              <PlusIcon />
            </IconButton>
            <IconButton aria-label="Add element (disabled)" disabled>
              <PlusIcon />
            </IconButton>
          </Row>
        </div>
      </Section>

      <Section id="inputs" title="Inputs" description="36px, radius-sm. Errors change the border and add a message with an X icon.">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5">
            <span className="text-micro text-ink-2">Custom array</span>
            <Input placeholder="5, 3, 8, 1" />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-micro text-ink-2">With an error</span>
            <Input defaultValue="5, 3, x" error="Use whole numbers separated by commas." />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-micro text-ink-2">Disabled</span>
            <Input defaultValue="Locked during playback" disabled />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-micro text-ink-2">Algorithm</span>
            <Select defaultValue="bubble">
              <option value="bubble">Bubble sort</option>
              <option value="selection">Selection sort</option>
              <option value="insertion">Insertion sort</option>
            </Select>
          </label>
          <label className="flex flex-col gap-1.5 sm:col-span-2">
            <span className="text-micro text-ink-2">Explain it in your own words</span>
            <Textarea placeholder="The largest value moves to the end because..." />
          </label>
        </div>
      </Section>

      <Section id="surfaces" title="Cards and panels" description="Only a card that is itself the click target lifts on hover.">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Static card</CardTitle>
              <CardDescription>Holds content and controls; does not lift.</CardDescription>
            </CardHeader>
            <CardContent className="flex items-center justify-between gap-4">
              <DifficultyTag difficulty={Difficulty.BEGINNER} />
              <MasteryRing progress={0.45} size={44} />
            </CardContent>
            <CardFooter>
              <Button variant="secondary" size="sm">Review</Button>
            </CardFooter>
          </Card>
          <Card interactive role="button" tabIndex={0} aria-label="Open insertion sort">
            <CardHeader>
              <CardTitle>Interactive card</CardTitle>
              <CardDescription>The whole card opens the topic, so it lifts to e2.</CardDescription>
            </CardHeader>
            <CardContent className="flex items-center justify-between gap-4">
              <DifficultyTag difficulty={Difficulty.INTERMEDIATE} />
              <MasteryRing progress={0.9} size={44} />
            </CardContent>
          </Card>
        </div>
        <div className="h-64 overflow-hidden rounded-md border border-rule">
          <Panel
            title="Step log"
            actions={
              <IconButton aria-label="Clear log">
                <PlusIcon />
              </IconButton>
            }
          >
            <ol className="flex flex-col divide-y divide-rule">
              {['Compare index 0 and 1', 'Swap 5 and 3', 'Compare index 1 and 2', 'No swap', 'Compare index 2 and 3', 'Swap 8 and 1'].map((line, i) => (
                <li key={i} className="flex gap-3 py-row text-small text-ink">
                  <span className="text-mono-sm text-ink-3">{String(i + 1).padStart(2, '0')}</span>
                  {line}
                </li>
              ))}
            </ol>
          </Panel>
        </div>
      </Section>

      <Section id="tabs" title="Tabs" description="The underline slides between tabs.">
        <Tabs defaultValue="pseudocode">
          <TabsList>
            <TabsTrigger value="explanation">Explanation</TabsTrigger>
            <TabsTrigger value="pseudocode">Pseudocode</TabsTrigger>
            <TabsTrigger value="complexity">Complexity</TabsTrigger>
            <TabsTrigger value="locked" disabled>
              Locked
            </TabsTrigger>
          </TabsList>
          <TabsContent value="explanation" className="text-small text-ink-2">
            Starting bubble sort.
          </TabsContent>
          <TabsContent value="pseudocode" className="text-mono text-ink">
            for i in range(n): ...
          </TabsContent>
          <TabsContent value="complexity" className="text-mono text-ink">
            O(n^2) worst, O(n) best
          </TabsContent>
        </Tabs>
      </Section>

      <Section id="status" title="Pills, tooltips and keys">
        <Row label="pill tones">
          <Pill>Neutral</Pill>
          <Pill tone="brand">Sorting</Pill>
          <Pill tone="success">Mastered</Pill>
          <Pill tone="warning">Developing</Pill>
          <Pill tone="danger">Struggling</Pill>
          <Pill tone="ai">AI hint</Pill>
        </Row>
        <Row label="difficulty">
          <DifficultyTag difficulty={Difficulty.BEGINNER} />
          <DifficultyTag difficulty={Difficulty.INTERMEDIATE} />
          <DifficultyTag difficulty={Difficulty.ADVANCED} />
        </Row>
        <Row label="tooltip">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="secondary" size="sm">Hover or focus me</Button>
            </TooltipTrigger>
            <TooltipContent>Step forward one comparison</TooltipContent>
          </Tooltip>
        </Row>
        <Row label="shortcuts">
          <span className="flex items-center gap-1.5 text-small text-ink-2">
            <Kbd>Space</Kbd> play
          </span>
          <span className="flex items-center gap-1.5 text-small text-ink-2">
            <Kbd>&rarr;</Kbd> step
          </span>
          <span className="flex items-center gap-1.5 text-small text-ink-2">
            <Kbd>Ctrl</Kbd>
            <Kbd>K</Kbd> search
          </span>
        </Row>
        <Row label="app controls">
          <ModeToggle />
          <ScaffoldingBadge />
        </Row>
      </Section>

      <Section id="overlays" title="Modal and toast" description="Escape closes the modal, focus stays inside it, and returns to the trigger on close.">
        <Row label="modal">
          <Modal
            open={modalOpen}
            onOpenChange={setModalOpen}
            trigger={<Button variant="secondary">Open modal</Button>}
            title="Explain it in your own words"
            description="One or two sentences. This is not graded."
            footer={
              <>
                <Button variant="secondary" onClick={() => setModalOpen(false)}>
                  Skip
                </Button>
                <Button onClick={() => setModalOpen(false)}>Submit</Button>
              </>
            }
          >
            <div className="flex flex-col gap-4">
              <Textarea placeholder="Why did 5 move to the end?" />
              {Array.from({ length: 6 }, (_, i) => (
                <p key={i} className="text-small text-ink-2">
                  The body scrolls inside the modal once it is taller than 85% of the viewport, while the header and
                  footer stay in place.
                </p>
              ))}
            </div>
          </Modal>
        </Row>
        <Row label="toast">
          <Button variant="secondary" onClick={() => toast('Progress saved', { description: 'Bubble sort, step 14 of 42' })}>
            Show toast
          </Button>
          <Button variant="secondary" onClick={() => toast.success('Prediction correct')}>
            Success toast
          </Button>
        </Row>
      </Section>

      <Section id="progress" title="Progress" description="Brand while in progress, success once mastered. Values are mono.">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div className="flex flex-col gap-4">
            <Progress value={0} label="Not started" />
            <Progress value={37} label="Sorting track" />
            <Progress value={100} label="Searching track" tone="success" />
            <Progress value={62} />
          </div>
          <div className="flex flex-wrap items-end gap-6">
            <ProgressRing value={0} ariaLabel="Mastery" />
            <ProgressRing value={45} ariaLabel="Mastery" />
            <ProgressRing value={88} tone="success" ariaLabel="Mastery" />
            <ProgressRing value={72} size={72} strokeWidth={6} label="Week goal" />
          </div>
        </div>
      </Section>

      <Section id="loading" title="Loading, empty and error" description="Skeletons match the shape of what is coming.">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-4">
            <Skeleton className="h-6 w-1/2" />
            <SkeletonText lines={3} />
            <SkeletonCard />
          </div>
          <SkeletonCanvas className="h-64" />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <EmptyState
            icon={<InboxIcon />}
            title="No sessions yet. Pick a topic to start your first one."
            action={<Button size="sm">Browse the curriculum</Button>}
          />
          <ErrorState
            title="The curriculum did not load."
            description="Some topics may be missing. Check your connection, then try again."
            onRetry={() => pulse(setRetrying)}
            retrying={retrying}
          />
        </div>
      </Section>
    </main>
  )
}
