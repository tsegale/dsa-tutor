export const OPEN_FEYNMAN_MODAL_EVENT = 'dsa-tutor:open-feynman-modal'

function BrainIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path
        d="M9.5 3a3 3 0 0 0-3 3v.3A3 3 0 0 0 5 12a3 3 0 0 0 1.5 5.7V18a3 3 0 0 0 3 3M14.5 3a3 3 0 0 1 3 3v.3A3 3 0 0 1 19 12a3 3 0 0 1-1.5 5.7V18a3 3 0 0 1-3 3M9.5 3v18M14.5 3v18"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export default function FeynmanModeButton() {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new CustomEvent(OPEN_FEYNMAN_MODAL_EVENT))}
      className="flex w-full items-center justify-center gap-1.5 rounded-md border border-active bg-active/10 py-2 text-sm font-medium text-active hover:bg-active/15"
    >
      <BrainIcon />
      Feynman Mode
    </button>
  )
}
