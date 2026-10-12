import * as React from 'react'
import { DropdownMenu as DropdownMenuPrimitive } from 'radix-ui'

import { cn } from '@/lib/utils'

function DropdownMenu({ ...props }: React.ComponentProps<typeof DropdownMenuPrimitive.Root>) {
  return <DropdownMenuPrimitive.Root data-slot="dropdown-menu" {...props} />
}

function DropdownMenuTrigger({ ...props }: React.ComponentProps<typeof DropdownMenuPrimitive.Trigger>) {
  return <DropdownMenuPrimitive.Trigger data-slot="dropdown-menu-trigger" {...props} />
}

function DropdownMenuContent({
  className,
  sideOffset = 4,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Content>) {
  return (
    <DropdownMenuPrimitive.Portal>
      <DropdownMenuPrimitive.Content
        data-slot="dropdown-menu-content"
        sideOffset={sideOffset}
        className={cn(
          // Design tokens: --rule border on the surface, --e2 like the other
          // floating layers (tooltips, toasts), radius-md like cards.
          'z-50 min-w-40 origin-(--radix-dropdown-menu-content-transform-origin) animate-in overflow-hidden rounded-md border border-rule bg-popover p-1 text-ink shadow-e2 fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95',
          className,
        )}
        {...props}
      />
    </DropdownMenuPrimitive.Portal>
  )
}

function DropdownMenuItem({
  className,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Item>) {
  return (
    <DropdownMenuPrimitive.Item
      data-slot="dropdown-menu-item"
      className={cn(
        // 32px rows; the highlight follows the pointer and the arrow keys
        // alike (Radix sets data-highlighted for both).
        'flex h-8 cursor-pointer items-center gap-2 rounded-sm px-2 text-small text-ink outline-none select-none data-[highlighted]:bg-surface-sunk',
        'data-[disabled]:cursor-not-allowed data-[disabled]:text-ink-3 data-[disabled]:data-[highlighted]:bg-transparent',
        className,
      )}
      {...props}
    />
  )
}

export { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem }
