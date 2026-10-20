import * as React from "react"
import { XIcon } from "lucide-react"
import { Dialog as DialogPrimitive } from "radix-ui"

import { cn } from "@/lib/utils"
import { useRestoreFocus } from "@/hooks/useRestoreFocus"
import { Button } from "@/components/ui/button"

// Every wrapper that renders a Radix primitive forwards its ref, like
// ui/button.tsx and for the same React 18 reason: a plain function
// component silently drops one. Radix hands refs down through Slot and
// Presence (a Portal clones its child with a ref), so without this React
// logs "Function components cannot be given refs" and the primitive loses
// the node it needs - which is how DialogOverlay was warning on every
// dialog open.
type Ref<T> = React.ComponentRef<T>
type Props<T extends React.ElementType> = React.ComponentPropsWithoutRef<T>

function Dialog({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Root>) {
  return <DialogPrimitive.Root data-slot="dialog" {...props} />
}

const DialogTrigger = React.forwardRef<
  Ref<typeof DialogPrimitive.Trigger>,
  Props<typeof DialogPrimitive.Trigger>
>(function DialogTrigger(props, ref) {
  return <DialogPrimitive.Trigger ref={ref} data-slot="dialog-trigger" {...props} />
})

function DialogPortal({ ...props }: React.ComponentProps<typeof DialogPrimitive.Portal>) {
  // Portal renders no DOM node of its own, so there is no ref to forward.
  return <DialogPrimitive.Portal {...props} />
}

const DialogClose = React.forwardRef<
  Ref<typeof DialogPrimitive.Close>,
  Props<typeof DialogPrimitive.Close>
>(function DialogClose(props, ref) {
  return <DialogPrimitive.Close ref={ref} data-slot="dialog-close" {...props} />
})

const DialogOverlay = React.forwardRef<
  Ref<typeof DialogPrimitive.Overlay>,
  Props<typeof DialogPrimitive.Overlay>
>(function DialogOverlay({ className, ...props }, ref) {
  return (
    <DialogPrimitive.Overlay
      ref={ref}
      data-slot="dialog-overlay"
      className={cn(
        "fixed inset-0 z-50 bg-black/50 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0",
        className
      )}
      {...props}
    />
  )
})

function DialogContent({
  className,
  children,
  onOpenAutoFocus,
  onCloseAutoFocus,
  showCloseButton = true,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content> & {
  showCloseButton?: boolean
}) {
  // Every dialog opens from state, not a Trigger, so Radix has nothing to
  // return focus to on close; this returns it to the opener (see the hook).
  // A caller's own handler runs first and can opt out with preventDefault.
  const restoreFocus = useRestoreFocus()

  return (
    <DialogPortal data-slot="dialog-portal">
      <DialogOverlay />
      <DialogPrimitive.Content
        onOpenAutoFocus={(event) => {
          restoreFocus.onOpenAutoFocus()
          onOpenAutoFocus?.(event)
        }}
        onCloseAutoFocus={(event) => {
          onCloseAutoFocus?.(event)
          if (!event.defaultPrevented) restoreFocus.onCloseAutoFocus(event)
        }}
        data-slot="dialog-content"
        className={cn(
          "fixed top-[50%] left-[50%] z-50 grid max-h-[85vh] w-full max-w-[calc(100%-2rem)] translate-x-[-50%] translate-y-[-50%] gap-4 overflow-y-auto overscroll-contain rounded-lg border border-rule bg-card p-6 text-card-foreground shadow-e3 duration-200 outline-none data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 sm:max-w-lg",
          className
        )}
        {...props}
      >
        {children}
        {showCloseButton && (
          <DialogPrimitive.Close
            data-slot="dialog-close"
            className="absolute top-4 right-4 inline-flex size-8 items-center justify-center rounded-sm text-ink-2 transition-colors duration-quick hover:bg-surface-sunk hover:text-ink disabled:pointer-events-none [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4"
          >
            <XIcon />
            <span className="sr-only">Close</span>
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Content>
    </DialogPortal>
  )
}

function DialogHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-header"
      className={cn("flex flex-col gap-1.5 pr-10 text-center sm:text-left", className)}
      {...props}
    />
  )
}

function DialogFooter({
  className,
  showCloseButton = false,
  children,
  ...props
}: React.ComponentProps<"div"> & {
  showCloseButton?: boolean
}) {
  return (
    <div
      data-slot="dialog-footer"
      className={cn(
        "flex flex-col-reverse gap-2 sm:flex-row sm:justify-end",
        className
      )}
      {...props}
    >
      {children}
      {showCloseButton && (
        <DialogPrimitive.Close asChild>
          <Button variant="outline">Close</Button>
        </DialogPrimitive.Close>
      )}
    </div>
  )
}

const DialogTitle = React.forwardRef<
  Ref<typeof DialogPrimitive.Title>,
  Props<typeof DialogPrimitive.Title>
>(function DialogTitle({ className, ...props }, ref) {
  return (
    <DialogPrimitive.Title
      ref={ref}
      data-slot="dialog-title"
      className={cn("text-h3 text-ink", className)}
      {...props}
    />
  )
})

const DialogDescription = React.forwardRef<
  Ref<typeof DialogPrimitive.Description>,
  Props<typeof DialogPrimitive.Description>
>(function DialogDescription({ className, ...props }, ref) {
  return (
    <DialogPrimitive.Description
      ref={ref}
      data-slot="dialog-description"
      className={cn("text-small text-ink-2", className)}
      {...props}
    />
  )
})

export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
}
