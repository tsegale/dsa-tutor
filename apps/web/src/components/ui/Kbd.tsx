import * as React from "react"

import { cn } from "@/lib/utils"

/** A keycap for shortcut hints. Mono: a key name is data, not a label. */
function Kbd({ className, ...props }: React.ComponentProps<"kbd">) {
  return (
    <kbd
      data-slot="kbd"
      className={cn(
        "inline-flex h-5 min-w-5 items-center justify-center rounded-sm border border-b-2 border-rule-strong bg-surface px-1 text-mono-sm text-ink-2",
        className
      )}
      {...props}
    />
  )
}

export { Kbd }
