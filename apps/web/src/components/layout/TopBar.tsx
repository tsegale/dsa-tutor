import { useParams } from 'react-router-dom'
import { conditionFeatures } from '@/utils/studyCondition'
import { useAlgorithmStore, selectProgressPercent } from '@/store/useAlgorithmStore'
import { getAlgorithmRegistryEntry } from '@/engine/registry'
import { moduleForTrack, moduleLabel } from '@/config/curriculum'
import { useStudyScope } from '@/hooks/useStudyScope'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import ModeToggle from '@/components/ui/ModeToggle'
import ProgressBar from '@/components/ui/ProgressBar'
import SoundToggle from '@/components/ui/SoundToggle'
import ZPDScaffoldingPill from '@/components/ui/ZPDScaffoldingPill'
import { AppTopBar, Breadcrumb } from './AppShell'
import { ContextBar } from './ContextBar'
import { requestSessionExit } from './sessionExit'

export const OPEN_SHORTCUTS_MODAL_EVENT = 'dsa-tutor:open-shortcuts-modal'

const ICON_BUTTON =
  'flex size-8 shrink-0 items-center justify-center rounded-sm text-ink-2 transition-colors duration-quick hover:bg-surface-sunk hover:text-ink'

function EyeIcon({ active }: { active: boolean }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className={active ? 'text-brand' : undefined}>
      <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}

export default function TopBar() {
  const { algorithmName: algorithmSlug } = useParams<{ algorithmName: string }>()
  const algorithmName = useAlgorithmStore((state) => state.algorithmName)
  const stepIndex = useAlgorithmStore((state) => state.stepIndex)
  const snapshotArray = useAlgorithmStore((state) => state.snapshotArray)
  // Classic (the study's plain visualiser) shows no mode tabs or support pill.
  const features = conditionFeatures(useAlgorithmStore((state) => state.classicMode))
  const progressPercent = useAlgorithmStore(selectProgressPercent)
  const focusModeActive = useAlgorithmStore((state) => state.focusModeActive)
  const toggleFocusMode = useAlgorithmStore((state) => state.toggleFocusMode)

  // Looked up from the URL slug, not the store's algorithmName: an
  // AlgorithmPage effect overwrites algorithmName with the topic's
  // display name once the topics API call resolves, so a registry lookup
  // keyed on that field would fail here and leave the track blank.
  const registryEntry = getAlgorithmRegistryEntry(algorithmSlug ?? '')
  // A study participant has no track pages (see useStudyScope).
  const { restricted } = useStudyScope()
  const algorithmDisplayName = registryEntry?.displayName ?? algorithmName
  const crumbs = registryEntry && !restricted
    ? [
        { label: 'Home', to: '/' },
        { label: moduleLabel(moduleForTrack(registryEntry.track)), to: `/module/${moduleForTrack(registryEntry.track).number}` },
        { label: algorithmDisplayName },
      ]
    : [{ label: 'Home', to: '/' }, { label: algorithmDisplayName }]

  // The global bar stays identical to every other page's; everything about
  // this session lives in the context bar under it (Phase 4A). Home is in the
  // global nav, so the old "back to dashboard" button is gone.
  return (
    <AppTopBar
      onNavigate={requestSessionExit}
      currentTopicName={algorithmSlug ?? null}
      context={
        <ContextBar
          label="Session"
          progressPercent={progressPercent}
          start={
            <>
              <Breadcrumb crumbs={crumbs} />
              {features.scaffoldingPill && <ZPDScaffoldingPill />}
            </>
          }
          center={features.modeToggle ? <ModeToggle /> : undefined}
          end={
            <>
              <div className="flex shrink-0 items-center gap-2">
                {/* Below 1280px the line along the bar's bottom edge carries progress alone. */}
                <div className="hidden w-28 xl:block">
                  <ProgressBar />
                </div>
                <span className="text-mono-sm whitespace-nowrap text-ink-2">
                  Step {Math.min(stepIndex + 1, snapshotArray.length)} of {snapshotArray.length}
                </span>
              </div>

              <Tooltip>
                <TooltipTrigger asChild>
                  <button type="button" onClick={toggleFocusMode} aria-label="Toggle focus mode" aria-pressed={focusModeActive} className={ICON_BUTTON}>
                    <EyeIcon active={focusModeActive} />
                  </button>
                </TooltipTrigger>
                <TooltipContent>Focus mode (F)</TooltipContent>
              </Tooltip>

              <div className="shrink-0">
                <SoundToggle />
              </div>

              <button
                type="button"
                onClick={() => window.dispatchEvent(new CustomEvent(OPEN_SHORTCUTS_MODAL_EVENT))}
                aria-label="Keyboard shortcuts"
                className={ICON_BUTTON}
              >
                ?
              </button>
            </>
          }
        />
      }
    />
  )
}
