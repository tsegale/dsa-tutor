import * as React from "react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

type IconButtonProps = Omit<React.ComponentPropsWithoutRef<typeof Button>, "size" | "aria-label" | "children"> & {
  /** Required: an icon-only control has no visible text to name it. */
  "aria-label": string
  children: React.ReactNode
}

/** Square 32px icon control. Ghost by default; pass variant for others. */
const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { variant = "ghost", className, children, ...props },
  ref
) {
  return (
    <Button ref={ref} variant={variant} size="icon-md" className={cn("shrink-0", className)} {...props}>
      {children}
    </Button>
  )
})

export { IconButton }
