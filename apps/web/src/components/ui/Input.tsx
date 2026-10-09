import * as React from "react"

import { cn } from "@/lib/utils"

// 36px controls on --radius-sm with a --rule border. Focus is the global
// brand outline in index.css; nothing here restyles it. An error replaces
// the border colour and renders its message below, linked through
// aria-describedby so a screen reader reads it with the field.

const CONTROL =
  "w-full rounded-sm border border-rule bg-surface px-3 text-small text-ink transition-[border-color] duration-quick placeholder:text-ink-3 hover:border-rule-strong disabled:cursor-not-allowed disabled:bg-surface-sunk disabled:text-ink-3 aria-invalid:border-destructive"

function ErrorIcon() {
  return (
    <svg className="mt-0.5 size-3.5 shrink-0" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5" />
      <path d="m5.5 5.5 5 5m0-5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

/** The message slot under a control. Renders nothing without a message. */
function FieldError({ id, children }: { id: string; children?: React.ReactNode }) {
  if (!children) return null
  return (
    <p id={id} className="mt-1.5 flex items-start gap-1.5 text-micro text-destructive">
      <ErrorIcon />
      <span>{children}</span>
    </p>
  )
}

function useErrorProps(error: React.ReactNode, describedBy: string | undefined) {
  const errorId = React.useId()
  const hasError = Boolean(error)
  return {
    errorId,
    controlProps: {
      "aria-invalid": hasError || undefined,
      "aria-describedby": [describedBy, hasError ? errorId : null].filter(Boolean).join(" ") || undefined,
    },
  }
}

type WithError = { error?: React.ReactNode }

function Input({ className, error, "aria-describedby": describedBy, ...props }: React.ComponentProps<"input"> & WithError) {
  const { errorId, controlProps } = useErrorProps(error, describedBy)
  return (
    <>
      <input data-slot="input" className={cn(CONTROL, "h-9", className)} {...controlProps} {...props} />
      <FieldError id={errorId}>{error}</FieldError>
    </>
  )
}

function Textarea({ className, error, "aria-describedby": describedBy, ...props }: React.ComponentProps<"textarea"> & WithError) {
  const { errorId, controlProps } = useErrorProps(error, describedBy)
  return (
    <>
      <textarea data-slot="textarea" className={cn(CONTROL, "min-h-20 py-2 leading-5", className)} {...controlProps} {...props} />
      <FieldError id={errorId}>{error}</FieldError>
    </>
  )
}

function Select({ className, error, "aria-describedby": describedBy, children, ...props }: React.ComponentProps<"select"> & WithError) {
  const { errorId, controlProps } = useErrorProps(error, describedBy)
  return (
    <>
      <div className="relative">
        <select data-slot="select" className={cn(CONTROL, "h-9 appearance-none pr-8", className)} {...controlProps} {...props}>
          {children}
        </select>
        <svg className="pointer-events-none absolute top-1/2 right-2.5 size-4 -translate-y-1/2 text-ink-2" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path d="m4 6 4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <FieldError id={errorId}>{error}</FieldError>
    </>
  )
}

export { Input, Textarea, Select, FieldError }
