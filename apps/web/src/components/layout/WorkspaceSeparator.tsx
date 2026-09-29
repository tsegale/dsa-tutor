import { Separator } from 'react-resizable-panels'

/**
 * The drag handle between workspace panels: a 1px rule with a wider hit
 * area, highlighted while hovered, dragged or keyboard-focused (the
 * library gives it role="separator" and arrow-key resizing).
 */
export default function WorkspaceSeparator() {
  return (
    <Separator className="group relative w-px shrink-0 bg-border outline-none dark:bg-dark-border">
      <div className="absolute inset-y-0 -left-[3px] w-[7px] transition-colors group-hover:bg-primary/30 group-data-[separator=focus]:bg-primary/50 group-data-[separator=active]:bg-primary/50" />
    </Separator>
  )
}
