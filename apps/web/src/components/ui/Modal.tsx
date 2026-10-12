import * as React from "react"
import { Dialog as DialogPrimitive } from "radix-ui"

import { cn } from "@/lib/utils"
import { IconButton } from "@/components/ui/IconButton"
import { useRestoreFocus } from "@/hooks/useRestoreFocus"

// The composed modal: --radius-lg, --e3, at most 85vh with the body scrolling
// between a fixed header and footer. Radix supplies the behaviour the spec
// asks for: Escape closes, focus is trapped inside, and focus returns to the
// trigger (or whatever opened it) on close.

type ModalProps = {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  /** Optional element that opens the modal (rendered via Radix Trigger asChild). */
  trigger?: React.ReactElement
  title: React.ReactNode
  description?: React.ReactNode
  footer?: React.ReactNode
  size?: "sm" | "md" | "lg"
  className?: string
  children?: React.ReactNode
}

const SIZES = { sm: "sm:max-w-sm", md: "sm:max-w-lg", lg: "sm:max-w-2xl" } as const

function CloseIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="m4 4 8 8m0-8-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

function Modal({ open, onOpenChange, trigger, title, description, footer, size = "md", className, children }: ModalProps) {
  // Radix returns focus only to a Trigger; this covers modals opened from
  // state too (see the hook).
  const restoreFocus = useRestoreFocus()

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      {trigger && <DialogPrimitive.Trigger asChild>{trigger}</DialogPrimitive.Trigger>}
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/50 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content
          data-slot="modal"
          onOpenAutoFocus={restoreFocus.onOpenAutoFocus}
          onCloseAutoFocus={restoreFocus.onCloseAutoFocus}
          // Radix wires aria-describedby to Description when there is one;
          // an explicit undefined tells it no description is intended.
          {...(description ? {} : { "aria-describedby": undefined })}
          className={cn(
            "fixed top-1/2 left-1/2 z-50 flex max-h-[85vh] w-full max-w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 flex-col rounded-lg border border-rule bg-card text-card-foreground shadow-e3 outline-none data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95",
            SIZES[size],
            className
          )}
        >
          <header className="flex items-start justify-between gap-4 border-b border-rule px-6 py-4">
            <div className="min-w-0 space-y-1">
              <DialogPrimitive.Title className="text-h3 text-ink">{title}</DialogPrimitive.Title>
              {description && (
                <DialogPrimitive.Description className="text-small text-ink-2">{description}</DialogPrimitive.Description>
              )}
            </div>
            <DialogPrimitive.Close asChild>
              <IconButton aria-label="Close" className="-mt-1 -mr-2">
                <CloseIcon />
              </IconButton>
            </DialogPrimitive.Close>
          </header>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 py-5">{children}</div>
          {footer && (
            <footer className="flex flex-col-reverse gap-2 border-t border-rule px-6 py-4 sm:flex-row sm:justify-end">{footer}</footer>
          )}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}

export { Modal }
