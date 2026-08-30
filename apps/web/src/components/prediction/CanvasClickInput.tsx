interface CanvasClickInputProps {
  prompt: string
  onSelect: (index: number) => void
  selectedIndex: number | null
}

// Selection for this input type happens by clicking a bar on the canvas
// above (wired through CanvasContainer/ArrayCanvas), not here. `onSelect`
// and `selectedIndex` are accepted to match the shared input-component
// contract, but this component itself renders no interactive widget.
export default function CanvasClickInput({ prompt }: CanvasClickInputProps) {
  return (
    <div className="flex h-full flex-col justify-center gap-1">
      <p className="font-sans text-[15px] font-medium text-text-primary dark:text-dark-text-primary">{prompt}</p>
      <p className="text-xs text-text-muted dark:text-dark-text-secondary">
        ← Click the element in the canvas above 👆
      </p>
    </div>
  )
}
